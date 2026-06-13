// submit-call.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'ActiveMedCalls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { type, location, problem, details, requestedBy, phone } = body;

  if (!type) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing type' }) };

  // Only send the core fields — no booleans or special types
  const fields = {
    Type:          type || '',
    Location:      location || '',
    Problem:       problem || '',
    Details:       details || '',
    RequestedBy:   requestedBy || 'Staff',
    Phone:         phone || '',
    Status:        'Pending',
    Timestamp:     new Date().toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }),
  };

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Airtable error:', JSON.stringify(data));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Airtable save failed', detail: data }) };
    }

    console.log('Call saved:', data.id, type, location);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };

  } catch(e) {
    console.error('Function error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
