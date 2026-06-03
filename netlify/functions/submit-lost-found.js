// submit-lost-found.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

function generateItemNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(2);
  const seq = Math.floor(Math.random() * 900) + 100;
  return `${month}${day}${year}-${seq}`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { description, location, foundBy, narrative } = body;

  if (!description || !location) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing description or location' }) };
  }

  const itemNumber = generateItemNumber();
  const now = new Date();
  const eventDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const foundAtDate = now.toISOString().split('T')[0];

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
  console.log('Airtable response status:', res.status);
  console.log('Airtable response:', JSON.stringify(data).slice(0, 500));

  if (!res.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: data.error?.message || 'Airtable error', details: data }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, itemNumber, id: data.id })
  };
};
