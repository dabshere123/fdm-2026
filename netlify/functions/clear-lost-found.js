// clear-lost-found.js — permanently deletes ALL records in the LostFound table
// Used to wipe demo/test items before the festival goes live
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE  = 'appUVEp7kO9NeeJh0';
const TABLE = 'LostFound';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { pin } = JSON.parse(event.body || '{}');
    if (pin !== '8510') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect PIN' }) };
    }

    // Fetch all record IDs (paginated)
    let ids = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(d));
      ids = ids.concat((d.records || []).map(rec => rec.id));
      offset = d.offset || null;
    } while (offset);

    // Delete in chunks of 10 (Airtable limit per request)
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const qs = chunk.map(id => `records[]=${id}`).join('&');
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}?${qs}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
      });
      if (r.ok) deleted += chunk.length;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, deleted }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
