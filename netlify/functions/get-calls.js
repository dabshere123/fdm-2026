// get-calls.js
// Returns all active calls from Airtable for Hub polling
// GET — no body needed

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'ActiveMedCalls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  try {
    // Get all calls from last 24 hours that aren't cleared
    const formula = encodeURIComponent(`OR({Status}="Pending",{Status}="Acknowledged")`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula=${formula}&sort[0][field]=Timestamp&sort[0][direction]=desc`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await res.json();

    const calls = (data.records || []).map(r => ({
      id: r.id,
      type: r.fields.Type || '',
      location: r.fields.Location || '',
      problem: r.fields.Problem || '',
      details: r.fields.Details || '',
      requestedBy: r.fields.RequestedBy || '',
      phone: r.fields.Phone || '',
      status: r.fields.Status || 'Pending',
      unit: r.fields.Unit || '',
      timestamp: r.fields.Timestamp || '',
      acknowledgedAt: r.fields.AcknowledgedAt || '',
      clearedAt: r.fields.ClearedAt || '',
      duration: r.fields.Duration || '',
      nineOneOne: r.fields.NineOneOne || false,
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, calls })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
