// add-mpd-officer.js — adds officer to Airtable and sends confirmation SMS
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { name, phone, badge } = JSON.parse(event.body || '{}');
    if (!name || !phone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name and phone required' }) };

    // Clean phone number
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    // Create record in Airtable
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/MPDOfficers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        Name: name,
        Phone: phone,
        Badge: badge || '',
        MPDStatus: 'OFF',
        LastAck: '',
      }})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    // Send confirmation SMS to officer
    if (TWILIO_SID && TWILIO_AUTH) {
      const sms = `Hello ${name.split(' ')[0]} — you have been added as an MPD contact for Fête de Marquette 2026 (July 9–12, McPike Park, Madison).\n\nIf you receive an alert from this number during the festival, please reply ACK to acknowledge.\n\nThank you!\n— FDM 2026 Operations`;
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          To: formattedPhone,
          MessagingServiceSid: MSG_SID || TWILIO_FROM,
          Body: sms
        }).toString()
      }).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id, name }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
