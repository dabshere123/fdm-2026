// get-calls-by-date.js
// Returns ALL calls (any status, including Cleared) whose Timestamp matches a given date,
// for generating an accurate End of Day report even after the browser has been reloaded
// since that day (local session state doesn't survive that, Airtable does).
// GET /.netlify/functions/get-calls-by-date?dateMatch=Jul%2010

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'ActiveMedCalls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const dateMatch = (event.queryStringParameters || {}).dateMatch || '';
    if (!dateMatch) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing dateMatch, e.g. "Jul 10"' }) };

    const formula = `FIND("${dateMatch}",{Timestamp})>0`;
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=500`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ calls: [], error: data.error?.message || 'Airtable read failed' }) };
    }

    const calls = (data.records || []).map(r => ({
      id: r.id,
      type: (r.fields.Type || '').toLowerCase(),
      location: r.fields.Location || '',
      problem: r.fields.Problem || '',
      status: r.fields.Status || '',
      requestedBy: r.fields.RequestedBy || '',
      phone: r.fields.Phone || '',
      timestamp: r.fields.Timestamp || '',
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ calls }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ calls: [], error: e.message }) };
  }
};
