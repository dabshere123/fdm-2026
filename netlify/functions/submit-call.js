// submit-call.js
// Saves a new call/request to Airtable Calls table
// POST body: { type, location, problem, details, requestedBy, phone, nineOneOne }

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Calls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { type, location, problem, details, requestedBy, phone, nineOneOne } = JSON.parse(event.body || '{}');

  if (!type || !location) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: type, location' })
    };
  }

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Type: type,
          Location: location,
          Problem: problem || '',
          Details: details || '',
          RequestedBy: requestedBy || 'Staff',
          Phone: phone || '',
          Status: 'Pending',
          Timestamp: new Date().toISOString(),
          NineOneOne: nineOneOne || false,
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data }) };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, id: data.id })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
