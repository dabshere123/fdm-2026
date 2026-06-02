// get-staff.js
// Looks up a worker by username + password in Airtable
// POST body: { username, password }

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { username, password } = JSON.parse(event.body || '{}');

  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing username or password' })
    };
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula=AND({Username}="${username}",{Password}="${password}",{Status}="Approved")`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid username or password' })
      };
    }

    const record = data.records[0].fields;

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        staff: {
          name: record['Full Name'] || '',
          role: record['Role'] || '',
          location: record['Location'] || '',
          phone: record['Phone'] || '',
          days: record['Days'] || '',
          groupme: record['GroupMe'] || '',
          username: record['Username'] || '',
        }
      })
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
