// delete-staff.js
// Deletes a staff member from Airtable Staff table
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { id, table } = JSON.parse(event.body || '{}');
  const tableName = table === 'mpd' ? 'MPDOfficers' : 'Staff';

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableName}/${id}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    return { statusCode: 200, headers, body: JSON.stringify({ success: data.deleted }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
