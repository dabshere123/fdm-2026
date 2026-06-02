// update-call.js
// Updates a call status in Airtable — acknowledge or clear
// POST body: { id, status, unit }
// status: "Acknowledged" | "Cleared"

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Calls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { id, status, unit } = JSON.parse(event.body || '{}');

  if (!id || !status) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: id, status' })
    };
  }

  const now = new Date().toISOString();
  const fields = { Status: status, Unit: unit || '' };

  if (status === 'Acknowledged') {
    fields.AcknowledgedAt = now;
  }

  if (status === 'Cleared') {
    fields.ClearedAt = now;
    // Calculate duration if we have the original record
    try {
      const getRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${id}`, {
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      const record = await getRes.json();
      const start = record.fields?.Timestamp;
      if (start) {
        const ms = new Date(now) - new Date(start);
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        fields.Duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      }
    } catch (e) { /* ignore duration calc error */ }
  }

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data }) };
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, record: data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
