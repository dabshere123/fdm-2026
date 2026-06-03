// submit-lost-found.js
// Saves a lost & found item to Airtable and sends SMS alert to Admin
// POST body: { description, location, foundBy, narrative }

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_MSG_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE = '+16082289692';

function generateItemNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(2);
  const seq = Math.floor(Math.random() * 900) + 100;
  return `${month}${day}${year}-${seq}`;
}

function getEventDay() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { description, location, foundBy, narrative } = JSON.parse(event.body || '{}');

  if (!description || !location) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: description, location' })
    };
  }

  const itemNumber = generateItemNumber();
  const now = new Date().toISOString();
  const eventDay = getEventDay();

  try {
    // Save to Airtable
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
          FoundAt: now,
          Narrative: narrative || '',
          Status: 'Unclaimed',
          EventDay: eventDay,
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    // Send SMS alert to Admin
    try {
      const twilio = require('twilio');
      const client = twilio(TWILIO_SID, TWILIO_AUTH);
      await client.messages.create({
        body: `📦 Lost & Found #${itemNumber}\n${description}\nFound at: ${location}\nBy: ${foundBy||'Staff'}\nBring to: Festival Office`,
        messagingServiceSid: TWILIO_MSG_SID,
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
