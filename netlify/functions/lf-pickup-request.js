// lf-pickup-request.js — handles pickup requests for lost items
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE    = '+16082289692';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { itemId, itemNumber, claimantName, description } = JSON.parse(event.body || '{}');

    // Update Airtable record with claimant info
    if (itemId) {
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/LostFound/${itemId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { ClaimantName: claimantName, Status: 'Pickup Requested' } })
      }).catch(() => {});
    }

    // SMS to admin
    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      const sms = `📦 L&F PICKUP REQUEST\n\nItem #: ${itemNumber || '?'}\nClaimant: ${claimantName}\nTheir description: ${description}\n\nFDM 2026 Lost & Found`;
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: ADMIN_PHONE, From: TWILIO_FROM, Body: sms }).toString()
      }).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
