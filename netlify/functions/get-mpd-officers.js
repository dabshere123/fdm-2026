// get-mpd-officers.js
// Fetches MPD officers from Airtable MPDOfficers table
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'MPDOfficers';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula=%7BMPDStatus%7D%3D%22OD%22&sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=asc`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Airtable error:', res.status, err);
      return { statusCode: 200, headers, body: JSON.stringify({ officers: [], error: `Airtable ${res.status}` }) };
    }
    const data = await res.json();

    const officers = (data.records || []).map(r => ({
      id:     r.id,
      name:   r.fields.Name   || '',
      phone:  r.fields.Phone  || '',
      status: (r.fields.MPDStatus || 'On Duty').toLowerCase().replace(' ', '_'),
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ officers }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
