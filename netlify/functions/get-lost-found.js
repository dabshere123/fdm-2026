// get-lost-found.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?sort[0][field]=FoundAt&sort[0][direction]=desc`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await res.json();
    console.log('Records found:', data.records?.length);

    const items = (data.records || []).map(r => ({
      id: r.id,
      itemNumber: r.fields.ItemNumber || '',
      description: r.fields.Description || '',
      location: r.fields.Location || '',
      foundBy: r.fields.FoundBy || '',
      foundAt: r.fields.FoundAt || '',
      narrative: r.fields.Narrative || '',
      status: r.fields.Status || 'Unclaimed',
      claimedBy: r.fields.Claimedby || '',
      claimedByID: r.fields.ClaimedbyID || '',
      claimedByPhone: r.fields.ClaimedbyPhone || '',
      claimedAt: r.fields.ClaimedAt || '',
      eventDay: r.fields.EventDay || '',
      notes: r.fields.Notes || '',
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, items })
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
