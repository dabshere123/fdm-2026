// update-lost-found.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}
  const { id, claimedBy, claimedByID, claimedByPhone } = body;

  if (!id) {
    return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Missing id' }) };
  }

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Status: 'Claimed',
          Claimedby: claimedBy || '',
          ClaimedbyID: claimedByID || '',
          ClaimedbyPhone: claimedByPhone || '',
          ClaimedAt: new Date().toISOString().split('T')[0],
        }
      })
    });

    const data = await res.json();
    console.log('Airtable response:', JSON.stringify(data));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, record: data })
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
