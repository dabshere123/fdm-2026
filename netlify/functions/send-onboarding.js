// send-onboarding.js
// Called by Airtable Automation when a new Staff record is created
// Sends the full onboarding SMS to the new staff member

const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH   = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE   = '+16082289692';

function fmtPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return String(p);
  return null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const body = JSON.parse(event.body || '{}');

    // Accept data either directly or from Airtable Automation webhook format
    const name  = (body.name && body.name !== 'null') ? body.name : (body.fields?.Name || '');
    const role  = (body.role && body.role !== 'null' && body.role.trim()) ? body.role.trim() : (body.fields?.Role || 'TBD');
    const rawPhone = body.phone || body.fields?.Phone || '';
    const phone = String(rawPhone).replace(/[^0-9]/g,'');
    const smsConsent = body.smsConsent ?? body.fields?.SMSConsent ?? 'Yes';

    // Save to Airtable if saveToAirtable flag is set (called from hub form)
    if (body.saveToAirtable && process.env.AIRTABLE_TOKEN) {
      await fetch(`https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Name1': name,
            'Role': role || 'N/A',
            'Phone': phone,
            'Status': 'Approved',
            'SMSConsent': 'Yes',
            'Days': 'EVERYDAY',
            'Shift Start': 0,
            'Shift End': 0
          }
        })
      });
    }

    if (!name || !phone) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing name or phone' }) };
    }

    if (smsConsent === 'No') {
      return { statusCode: 200, headers, body: JSON.stringify({ skipped: true, reason: 'SMS consent not given' }) };
    }

    // Hold texts — save to Airtable only, no SMS
    if (body.holdTexts === true) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, held: true, reason: 'Texts on hold' }) };
    }

    const lastName = name.trim().split(' ').pop();
    const fmt = fmtPhone(phone);

    if (!fmt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid phone number' }) };
    }

    const encodedName = encodeURIComponent(name.trim());
    const message = `FDM 2026 — Hi ${name.split(' ')[0]}! You are on the crew for Fête de Marquette July 9-12 at McPike Park Madison.\n\nPlease confirm your role here (10 seconds):\nfdm2026.netlify.app/rsvp\n\nYour worker app:\nfdm2026.netlify.app/field\n\nSee you at orientation!\n— Devin`;

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');

    // Send onboarding SMS to staff member
    const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: fmt, MessagingServiceSid: MESSAGING_SID, Body: message }).toString()
    });
    const smsData = await smsRes.json();
    console.log(`Onboarding SMS to ${fmt}: ${smsData.status}`);

    // Notify admin
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: ADMIN_PHONE,
        MessagingServiceSid: MESSAGING_SID,
        Body: `✅ NEW REGISTRATION — FDM 2026\n\nName: ${name}\nRole: ${role}\nPhone: ${phone}\nOnboarding SMS sent.`
      }).toString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: fmt }) };
  } catch(e) {
    console.error('send-onboarding error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
