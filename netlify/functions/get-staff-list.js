// get-staff-list.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  try {
    // Fetch all records and filter in code to avoid URL encoding issues
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await res.json();

    const staff = (data.records || [])
      .filter(r => r.fields.Status === 'Approved')
      .map(r => ({
        id: r.id,
        name: r.fields['Name'] || '',
        role: r.fields['Role'] || '',
        location: r.fields['Location'] || '',
        phone: r.fields['Phone'] || '',
      }))
      .filter(s => s.name)
      .sort((a,b) => a.name.localeCompare(b.name));

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
