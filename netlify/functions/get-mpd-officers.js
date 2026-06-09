// get-mpd-officers.js
// Fetches MPD officers from Airtable MPDOfficers table
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'MPDOfficers';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula={Status}="On Duty"&sort[0][field]=Name&sort[0][direction]=asc`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();

    const officers = (data.records || []).map(r => ({
      id:     r.id,
      name:   r.fields.Name   || '',
      badge:  r.fields.Badge  || '',
      phone:  r.fields.Phone  || '',
      status: (r.fields.Status || 'On Duty').toLowerCase().replace(' ', '_'),
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ officers }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
