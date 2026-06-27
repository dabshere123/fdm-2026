const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const FROM        = process.env.TWILIO_MESSAGING_SERVICE_SID;
const DEVIN       = '+16082289692';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { name, role, schedule } = JSON.parse(event.body || '{}');
    if (!name || !role) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };

    const msg =
      `🎶 FDM 2026 STAFF CONFIRMATION\n\n` +
      `Name: ${name}\n` +
      `Role: ${role}\n` +
      (schedule ? `Schedule: ${schedule}\n` : '') +
      `\nReceived via fdm2026.netlify.app/rsvp`;

    // Send email notification via Twilio (SMS to email gateway not available)
    // Instead send a second SMS to dabshere@gmail.com — 
    // For email, we'll use a simple mailto workaround via Airtable save
    // Save RSVP to Airtable so you have a record
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

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: DEVIN, MessagingServiceSid: FROM, Body: msg }).toString()
    });

    // Send email via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      const emailBody = `
        <h2>🎶 FDM 2026 — New RSVP</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Role:</strong> ${role}</p>
        ${schedule ? `<p><strong>Schedule:</strong> ${schedule}</p>` : ''}
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

    // Auto-save to Airtable Staff table so they can log into the Worker App immediately
    if (process.env.AIRTABLE_TOKEN) {
      const existing = await fetch(
        `https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff?filterByFormula={Name1}="${name.replace(/"/g,'\"')}"`,
        { headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}` } }
      ).then(r => r.json()).catch(() => ({ records: [] }));

      if (!existing.records || existing.records.length === 0) {
        // New staff member — add them with Worker App access (no hub role)
        await fetch('https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            'Name1': name,
            'Role': role || '',   // Their RSVP role (reference only until you assign a code)
            'Phone': phone || '',
            'Status': 'Approved',
            'SMSConsent': 'Yes',
          }})
        }).catch(() => {});
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
