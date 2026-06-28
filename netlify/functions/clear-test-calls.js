// clear-test-calls.js — marks all calls in Airtable as Cleared
// Used before going live to wipe test/demo submissions
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Fetch all non-cleared calls
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/ActiveMedCalls?filterByFormula=NOT({Status}="Cleared")&maxRecords=100`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const records = data.records || [];

    // Mark them all cleared
    const chunks = [];
    for (let i = 0; i < records.length; i += 10) chunks.push(records.slice(i, i + 10));

    for (const chunk of chunks) {
      await fetch(`https://api.airtable.com/v0/${BASE}/ActiveMedCalls`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: chunk.map(r => ({ id: r.id, fields: { Status: 'Cleared' } }))
        })
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, cleared: records.length }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
