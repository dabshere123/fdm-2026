// send-sms.js
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { to, message } = JSON.parse(event.body || '{}');
    if (!to || !message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing to or message' }) };

    // Normalize to E.164
    const digits = String(to).replace(/\D/g, '');
    let normalized = to;
    if (digits.length === 10) normalized = '+1' + digits;
    else if (digits.length === 11 && digits[0] === '1') normalized = '+' + digits;

    const auth = Buffer.from(TWILIO_SID + ':' + TWILIO_TOKEN).toString('base64');
    const res = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' + TWILIO_SID + '/Messages.json',
      {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'To=' + encodeURIComponent(normalized) + '&From=' + encodeURIComponent(TWILIO_FROM) + '&Body=' + encodeURIComponent(message)
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error('Twilio error:', JSON.stringify(data));
      return { statusCode: 200, headers, body: JSON.stringify({ error: data.message, code: data.code }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sid: data.sid }) };
  } catch (err) {
    console.error('send-sms error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message }) };
  }
};
