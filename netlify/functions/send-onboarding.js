// send-onboarding.js
// Called by Airtable Automation when a new Staff record is created
// Sends the full onboarding SMS to the new staff member

const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH   = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM   = process.env.TWILIO_PHONE_NUMBER;
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
    // Wrapped in try-catch so Airtable errors NEVER block the SMS send
    if (body.saveToAirtable && process.env.AIRTABLE_TOKEN) {
      try {
        const atRes = await fetch(`https://api.airtable.com/v0/appUVEp7kO9NeeJh0/Staff`, {
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
            }
          })
        });
        const atData = await atRes.json();
        console.log('Airtable save:', JSON.stringify(atData).slice(0, 200));
      } catch(atErr) {
        console.log('Airtable save failed (non-fatal):', atErr.message);
      }
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
    const message = `FDM 2026 — Hi ${name.split(' ')[0]}! You are on the crew for Fete de Marquette July 9-12 at McPike Park Madison.\n\nConfirm your role (10 sec):\nfdm2026.netlify.app/rsvp\n\nWorker app:\nfdm2026.netlify.app/field\n\nSee you at orientation!\n— Devin`;

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');

    // Send onboarding SMS to staff member
    const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: fmt, MessagingServiceSid: MESSAGING_SID || TWILIO_FROM, Body: message }).toString()
    });
    const smsData = await smsRes.json();
    console.log(`Onboarding SMS to ${fmt}: status=${smsData.status} error=${smsData.code} msg=${smsData.message}`);

    // If Twilio rejected the message, return the actual error
    if (smsData.status === 'failed' || smsData.code || (!smsData.sid && !smsData.status)) {
      return { statusCode: 400, headers, body: JSON.stringify({
        error: `Twilio error ${smsData.code}: ${smsData.message || 'Message failed'}`,
        twilioStatus: smsData.status,
        to: fmt
      })};
    }

    // Notify admin only if SMS succeeded
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: ADMIN_PHONE,
        MessagingServiceSid: MESSAGING_SID || TWILIO_FROM,
        Body: `FDM 2026 — New registration: ${name} / ${role} / ${phone}`
      }).toString()
    }).catch(()=>{});

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: fmt, twilioSid: smsData.sid }) };
  } catch(e) {
    console.error('send-onboarding error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
