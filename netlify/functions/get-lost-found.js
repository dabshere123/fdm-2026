// get-lost-found.js — returns all L&F items for the staff lookup page
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    let records = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/LostFound?sort[0][field]=FoundAt&sort[0][direction]=desc${offset?`&offset=${offset}`:''}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
      const data = await res.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);
    const items = records.map(r => ({
      id: r.id,
      itemNumber: r.fields.ItemNumber || '',
      description: r.fields.Description || '',
      foundAt: r.fields.FoundAt || '',
      currentLocation: r.fields.CurrentLocation || '',
      dayFound: r.fields.DayFound || '',
      foundBy: r.fields.FoundBy || '',
      status: r.fields.Status || 'Unclaimed',
      photoData: r.fields.PhotoData || '',
      atFestOffice: r.fields.AtFestOffice || 'No',
      createdAt: r.fields.CreatedAt || '',
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ items }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, items: [] }) };
  }
};
