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

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: DEVIN, MessagingServiceSid: FROM, Body: msg }).toString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
