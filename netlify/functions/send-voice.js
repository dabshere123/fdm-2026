// send-voice.js
// Makes a Twilio voice call with a spoken message. Automatically redials if not
// answered (no-answer / busy / failed) up to MAX_RETRIES times — see voice-status-callback.js
// POST body: { to, message, retry }  (retry is internal — omit it on the first call)

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;
const SITE_URL     = 'https://fdm2026.netlify.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { to, message, retry } = JSON.parse(event.body || '{}');

  if (!to || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing to or message' }) };
  }

  const safe = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew" language="en-US">${safe}</Say>
  <Pause length="2"/>
  <Say voice="Polly.Matthew" language="en-US">${safe}</Say>
</Response>`;

  const statusCallback = `${SITE_URL}/.netlify/functions/voice-status-callback?to=${encodeURIComponent(to)}&retry=${retry||0}&msg=${encodeURIComponent(message)}`;

  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: TWILIO_FROM,
          Twiml: twiml,
          StatusCallback: statusCallback,
          StatusCallbackEvent: 'completed',
          StatusCallbackMethod: 'POST',
        }).toString()
      }
    );

    const data = await res.json();

    if (!res.ok || data.error_code) {
      return {
        statusCode: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.message || 'Twilio rejected the call', code: data.code || data.error_code })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, sid: data.sid })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
