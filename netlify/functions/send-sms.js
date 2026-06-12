// send-sms.js
// Sends a single SMS via Twilio
// POST body: { to, message }

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { to, message } = JSON.parse(event.body || '{}');

  if (!to || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing to or message' }) };
  }

  // Normalize phone number to E.164
  const digits = to.replace(/\D/g, '');
  const normalized = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : to.startsWith('+') ? to : null;
  if (!normalized) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid phone number: ${to}` }) };
  }

  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: normalized,
          From: TWILIO_FROM,
          Body: message
        }).toString()
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('Twilio error:', data);
      return { statusCode: 500, headers, body: JSON.stringify({ error: data.message || 'Twilio error', code: data.code }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sid: data.sid }) };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
