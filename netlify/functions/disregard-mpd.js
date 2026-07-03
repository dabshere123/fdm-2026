// disregard-mpd.js — admin sends disregard to all online MPD officers
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { reason } = JSON.parse(event.body || '{}');
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/MPDOfficers?filterByFormula={MPDStatus}="ON"`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const officers = (data.records || []).map(r => ({
      name: r.fields.Name,
      phone: String(r.fields.PhoneNumber || '').replace(/[^0-9]/g,''),
    })).filter(o => o.phone.length >= 10);

    if (!TWILIO_SID || !TWILIO_AUTH) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, notified: 0 }) };
    }
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const smsBody = `DISREGARD — FDM 2026 Admin${reason ? '\nReason: ' + reason : ''}\n\nThe previous MPD request has been cancelled. Reply ACK to acknowledge this disregard.`;

    for (const o of officers) {
      const ph = o.phone.length === 10 ? `+1${o.phone}` : `+${o.phone}`;
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: ph, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: smsBody }).toString()
      }).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, notified: officers.length }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
