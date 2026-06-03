// submit-lost-found.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const ADMIN_PHONE = '+16082289692';

function generateItemNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(2);
  const seq = Math.floor(Math.random() * 900) + 100;
  return `${month}${day}${year}-${seq}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}
  const { description, location, foundBy, narrative } = body;

  if (!description || !location) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing description or location' }) };
  }

  const itemNumber = generateItemNumber();
  const now = new Date();
  const eventDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // Airtable date format: YYYY-MM-DD
  const foundAtDate = now.toISOString().split('T')[0];

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          ItemNumber: itemNumber,
          Description: description,
          Location: location,
          FoundBy: foundBy || 'Staff',
          FoundAt: foundAtDate,
          Narrative: narrative || '',
          Status: 'Unclaimed',
          EventDay: eventDay,
        }
      })
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error('Airtable error:', JSON.stringify(data));
      return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: data }) };
    }

    // SMS alert to Admin (non-fatal)
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `📦 Lost & Found #${itemNumber}\n${description}\nFound at: ${location}\nBy: ${foundBy||'Staff'}\nBring to: Festival Office`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: ADMIN_PHONE
      });
    } catch(smsErr) {
      console.log('SMS error (non-fatal):', smsErr.message);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, itemNumber, id: data.id })
    };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
