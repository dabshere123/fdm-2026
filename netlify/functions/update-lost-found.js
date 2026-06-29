// update-lost-found.js
const BASE  = 'appUVEp7kO9NeeJh0';
const TABLE = 'LostFound';
const TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { id, status, atFestOffice, claimantName, currentLocation } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };

    const fields = {};
    if (status)          fields.Status          = status;
    if (atFestOffice)    fields.AtFestOffice    = atFestOffice;
    if (claimantName)    fields.ClaimantName    = claimantName;
    if (currentLocation) fields.CurrentLocation = currentLocation;

    // If marking at Fest Office, update location too
    if (atFestOffice === 'Yes' && !currentLocation) fields.CurrentLocation = 'Fest Office';

    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(d));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
