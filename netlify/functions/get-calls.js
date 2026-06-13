// get-calls.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'ActiveMedCalls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    // Fetch all non-cleared calls
    const formula = encodeURIComponent(`NOT({Status}="Cleared")`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula=${formula}&sort[0][field]=Timestamp&sort[0][direction]=desc`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Airtable error:', JSON.stringify(data));
      return { statusCode: 500, headers, body: JSON.stringify({ error: data }) };
    }

    const calls = (data.records || []).map(r => ({
      id:          r.id,
      type:        (r.fields.Type || '').toLowerCase(),
      location:    r.fields.Location || '',
      problem:     r.fields.Problem || '',
      details:     r.fields.Details || '',
      requestedBy: r.fields.RequestedBy || '',
      status:      r.fields.Status || 'Pending',
      unit:        r.fields.Unit || '',
      timestamp:   r.fields.Timestamp || '',
      firedAt:     Date.now(),
      acknowledged: r.fields.Status !== 'Pending',
      history:     [],
    }));

    console.log(`Returning ${calls.length} active calls`);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, calls }) };

  } catch(e) {
    console.error('get-calls error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
