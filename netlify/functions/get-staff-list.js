// get-staff-list.js
// Returns all approved staff from Airtable for the name picker

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula={Status}="Approved"&fields[]=Full Name&fields[]=Role&fields[]=Location&sort[0][field]=Full Name&sort[0][direction]=asc`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await res.json();

    const staff = (data.records || []).map(r => ({
      id: r.id,
      name: r.fields['Full Name'] || '',
      role: r.fields['Role'] || '',
      location: r.fields['Location'] || '',
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, staff })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
