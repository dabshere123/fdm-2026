// request-lf-pickup.js — staff requests admin pickup of a L&F item
const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH   = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE   = '+16082289692';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const { itemNumber, description, requestedBy } = JSON.parse(event.body || '{}');
  const ts = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', weekday: 'short' });
  const msg = `📦 L&F PICKUP REQUEST\n\nItem #${itemNumber}: ${description}\nRequested by: ${requestedBy||'Staff'}\nTime: ${ts}\n\nA staff member has a patron looking for this item. Please retrieve from current location.`;
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: ADMIN_PHONE, MessagingServiceSid: MESSAGING_SID, Body: msg }).toString()
    });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
