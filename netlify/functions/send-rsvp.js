const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const FROM        = process.env.TWILIO_MESSAGING_SERVICE_SID;
const DEVIN       = '+16082289692';

function normalizePhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return p;
  return null;
}

function welcomeSMS(name, role, lastName) {
  return `Hi ${name}, welcome to the FDM 2026 team! 🎶\n\nYou are confirmed as: ${role || 'Staff Member'}\n\n━━━━━━━━━━━━━━━\n📱 WORKER APP\nhttps://fdm2026.netlify.app/field\nSign in with your first or last name: ${lastName}\nAdd to your home screen for quick access\n\n━━━━━━━━━━━━━━━\n🎓 STAFF DEMO\nhttps://fdm2026.netlify.app/demo\nSee how every button works before July 9\n\n━━━━━━━━━━━━━━━\n📖 WORKER GUIDE\nhttps://fdm2026.netlify.app/guide\nRead before July 9 — covers all request types, lost child protocol, and how the app works\n\n━━━━━━━━━━━━━━━\n✅ KNOWLEDGE QUIZ\nhttps://fdm2026.netlify.app/quiz\n7 questions · Takes 5 min · Complete before July 9\n\n━━━━━━━━━━━━━━━\n📦 LOST & FOUND\nhttps://fdm2026.netlify.app/lostfound\nSearch all items found at the festival\n\n━━━━━━━━━━━━━━━\nSee you at McPike Park, July 9–12! 🎪\n— Fête de Marquette 2026 Operations\n\nReply STOP to unsubscribe.`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { name, role, schedule, phone } = JSON.parse(event.body || '{}');
    if (!name || !role) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };

    const lastName = name.trim().split(' ').pop();
    const normalizedPhone = normalizePhone(phone);

    const adminMsg =
      `🎶 FDM 2026 STAFF CONFIRMATION\n\n` +
      `Name: ${name}\n` +
      `Role: ${role}\n` +
      (schedule ? `Schedule: ${schedule}\n` : '') +
      (phone ? `Phone: ${phone}\n` : '') +
      `\nReceived via fdm2026.netlify.app/rsvp`;

    // Save RSVP record (history/reference)
    if (process.env.AIRTABLE_TOKEN) {
      await fetch('https://api.airtable.com/v0/appUVEp7kO9NeeJh0/RSVPs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Name': name,
            'Role': role,
            'Schedule': schedule || '',
            'SubmittedAt': new Date().toISOString()
          }
        })
      }).catch(() => {});
    }

    // SMS to admin
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: DEVIN, MessagingServiceSid: FROM || TWILIO_FROM, Body: adminMsg }).toString()
    }).catch(() => {});

    // Email to admin via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const emailBody = `
        <h2>🎶 FDM 2026 — New RSVP</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Role:</strong> ${role}</p>
        ${schedule ? `<p><strong>Schedule:</strong> ${schedule}</p>` : ''}
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', {timeZone:'America/Chicago'})}</p>
        <hr/>
        <p><a href="https://fdm2026.netlify.app/rsvp">View RSVP page</a></p>
      `;
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: 'dabshere@gmail.com' }] }],
          from: { email: 'feteops@gmail.com', name: 'FDM 2026 Ops' },
          subject: `FDM 2026 RSVP — ${name}`,
          content: [{ type: 'text/html', value: emailBody }]
        })
      }).catch(() => {});
    }

    // Save / update Staff record so they can log into the Worker App immediately
    if (process.env.AIRTABLE_TOKEN) {
      const existing = await fetch(
        `https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff?filterByFormula={Name1}="${name.replace(/"/g,'\\"')}"`,
        { headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` } }
      ).then(r => r.json()).catch(() => ({ records: [] }));

      const fields = {
        'Name1':  name,
        'Role':   role || '',
        'Phone':  phone || '',
        'Status': 'Approved',
      };
      if (schedule) fields['Days'] = schedule;
      if (normalizedPhone) fields['SMSConsent'] = 'Yes';

      if (!existing.records || existing.records.length === 0) {
        await fetch('https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        }).catch(() => {});
      } else {
        // Update existing record (e.g. if they RSVP again with a phone number this time)
        const recordId = existing.records[0].id;
        await fetch(`https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff/${recordId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        }).catch(() => {});
      }
    }

    // Welcome SMS to the staff member themselves, with all app links
    if (normalizedPhone) {
      try {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            To: normalizedPhone,
            MessagingServiceSid: FROM || TWILIO_FROM,
            Body: welcomeSMS(name, role, lastName)
          }).toString()
        });
      } catch (e) {
        console.log('Staff welcome SMS error:', e.message);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
