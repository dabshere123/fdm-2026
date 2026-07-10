// get-delivery-status.js
// Returns recent SMS delivery log entries, optionally filtered by context
// (e.g. "vendor_broadcast") so the Hub can show real delivered/failed status
// per recipient without a blocking popup.
// GET /.netlify/functions/get-delivery-status?context=vendor_broadcast&sinceMinutes=30

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const LOG_TABLE = 'SMSDeliveryLog';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const q = event.queryStringParameters || {};
    const context = q.context || '';
    const sinceMinutes = parseInt(q.sinceMinutes || '60', 10);
    const cutoff = new Date(Date.now() - sinceMinutes * 60000).toISOString();

    const clauses = [`IS_AFTER({UpdatedAt},"${cutoff}")`];
    if (context) clauses.push(`{Context}="${context}"`);
    const formula = clauses.length > 1 ? `AND(${clauses.join(',')})` : clauses[0];

    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${LOG_TABLE}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=100&sort[0][field]=UpdatedAt&sort[0][direction]=desc`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    if (!res.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ entries: [], error: `Could not read ${LOG_TABLE}: ${data.error?.message || res.status}. Make sure a table named exactly "${LOG_TABLE}" exists with fields MessageSid, To, Status, Context, UpdatedAt.` }) };
    }

    const entries = (data.records || []).map(r => ({
      to: r.fields.To || '',
      status: r.fields.Status || '',
      context: r.fields.Context || '',
      updatedAt: r.fields.UpdatedAt || '',
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ entries }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ entries: [], error: e.message }) };
  }
};
