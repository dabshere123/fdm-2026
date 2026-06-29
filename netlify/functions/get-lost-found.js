// get-lost-found.js
const BASE  = 'appUVEp7kO9NeeJh0';
const TABLE = 'LostFound';
const TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    let records = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE}/${TABLE}?sort[0][field]=ItemNumber&sort[0][direction]=desc&pageSize=100${offset ? `&offset=${offset}` : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(d));
      records = records.concat(d.records || []);
      offset = d.offset || null;
    } while (offset);

    const items = records.map(r => ({
      id:              r.id,
      itemNumber:      r.fields.ItemNumber      || '',
      description:     r.fields.Description     || '',
      foundAt:         r.fields.FoundAt         || '',
      currentLocation: r.fields.CurrentLocation || '',
      dayFound:        r.fields.DayFound        || '',
      foundBy:         r.fields.FoundBy         || '',
      status:          r.fields.Status          || 'Unclaimed',
      atFestOffice:    r.fields.AtFestOffice    || 'No',
      claimantName:    r.fields.ClaimantName    || '',
      photoData:       r.fields.PhotoData       || '',
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ items }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
