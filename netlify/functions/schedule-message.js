// schedule-message.js
// Lets admin schedule a custom broadcast message to send at a future time.
// GET  -> { messages: [{id, message, phones, channels, sendAt, status}] }  (pending + recent)
// POST { action: "create", message, phones, channels, sendAt, createdBy }
// POST { action: "cancel", id }

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TABLE = 'ScheduledMessages';

function airtableFormulaUrl(base, table, formula, extra) {
  const params = new URLSearchParams();
  if (formula) params.set('filterByFormula', formula);
  if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
  return `https://api.airtable.com/v0/${base}/${table}?${params.toString()}`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod === 'GET') {
    try {
      const res = await fetch(airtableFormulaUrl(AIRTABLE_BASE, TABLE, null, { maxRecords: '50', 'sort[0][field]': 'SendAt', 'sort[0][direction]': 'asc' }), {
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      const data = await res.json();
      if (!res.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ messages: [], error: `Airtable error: ${data.error?.message || res.status}. Make sure a table named exactly "${TABLE}" exists with fields Message, Phones, Channels, SendAt, Status, CreatedBy.` }) };
      }
      const messages = (data.records || []).map(r => ({
        id: r.id,
        message: r.fields.Message || '',
        phones: r.fields.Phones || '[]',
        channels: r.fields.Channels || '[]',
        sendAt: r.fields.SendAt || '',
        status: r.fields.Status || 'Pending',
        createdBy: r.fields.CreatedBy || '',
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ messages }) };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify({ messages: [], error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { action, id, message, phones, channels, sendAt, createdBy } = JSON.parse(event.body || '{}');

    if (action === 'create') {
      if (!message || !phones || !sendAt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing message, phones, or sendAt' }) };
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ typecast: true, fields: {
          Message: message,
          Phones: JSON.stringify(phones),
          Channels: JSON.stringify(channels || []),
          SendAt: sendAt,
          Status: 'Pending',
          CreatedBy: createdBy || '',
        }})
      });
      const data = await res.json();
      if (!res.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: `Airtable rejected the save: ${data.error?.message || res.status}. Make sure a table named exactly "${TABLE}" exists with fields Message, Phones, Channels, SendAt, Status, CreatedBy.` }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
    }

    if (action === 'cancel') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ typecast: true, fields: { Status: 'Cancelled' } })
      });
      if (!res.ok) {
        const data = await res.json();
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: data.error?.message || 'Failed to cancel' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
