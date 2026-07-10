// sms-status-callback.js
// Twilio calls this URL every time a tracked message's status changes
// (queued -> sent -> delivered, or -> failed/undelivered). Updates the
// matching SMSDeliveryLog row so we know if a message was ACTUALLY delivered,
// not just accepted by Twilio.

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const LOG_TABLE = 'SMSDeliveryLog';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = Object.fromEntries(new URLSearchParams(event.body || '').entries());
    const sid = body.MessageSid;
    const status = body.MessageStatus; // queued | sending | sent | delivered | undelivered | failed
    if (!sid || !status) return { statusCode: 200, headers, body: '' };

    // Find the existing log row for this message
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${LOG_TABLE}?filterByFormula=${encodeURIComponent(`{MessageSid}="${sid}"`)}`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const existing = (data.records || [])[0];

    if (existing) {
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${LOG_TABLE}/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Status: status, UpdatedAt: new Date().toISOString() } })
      });
    }

    return { statusCode: 200, headers, body: '' };
  } catch (e) {
    return { statusCode: 200, headers, body: '' }; // always 200 so Twilio doesn't retry-storm
  }
};
