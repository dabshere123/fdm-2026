// confirm-mpd-registration.js
// Sends a confirmation SMS to an MPD officer when they're added to the system
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { name, phone } = JSON.parse(event.body || '{}');
    if (!phone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone required' }) };

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const toPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
    const firstName = (name || 'Officer').split(' ')[0];

    const smsBody = `Hi ${firstName} — you've been added as an MPD contact for Fête de Marquette 2026 (July 9-12, McPike Park, Madison WI).\n\nWhen your assistance is requested, you'll receive a text and a voice call with the location and situation.\n\nReply commands:\n• ACK — Acknowledge\n• ETA [min] — e.g. ETA 5\n• ON SCENE — Arrived on site\n\nReply ACK now to confirm you received this message.\n\n— FDM 2026 Event Operations`;

    if (!TWILIO_SID || !TWILIO_AUTH) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Twilio not configured' }) };
    }

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: toPhone,
        ...(MSG_SID ? { MessagingServiceSid: MSG_SID } : { From: TWILIO_FROM }),
        Body: smsBody,
      }).toString()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Twilio error');

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sid: data.sid }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
