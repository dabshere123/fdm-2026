// send-mpd-confirmation.js
// Called by Airtable automation when a new MPDOfficers record is created
// Airtable setup: Automations → When record created in MPDOfficers → Run script/webhook
// Webhook URL: https:///.netlify/functions/send-mpd-confirmation
// Body: { "name": "{{Name}}", "phone": "{{Phone}}" }
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { name, phone } = JSON.parse(event.body || '{}');
    if (!name || !phone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name and phone required' }) };

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    if (!TWILIO_SID || !TWILIO_AUTH) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Twilio not configured' }) };
    }

    const sms = `Hello ${name.split(' ')[0]} — you have been added as an MPD contact for Fête de Marquette 2026 (July 9–12, McPike Park, Madison).\n\nIf you receive an alert from this number during the festival, please reply ACK to acknowledge.\n\nThank you!\n— FDM 2026`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: formattedPhone, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: sms }).toString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: formattedPhone }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
