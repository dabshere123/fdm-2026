// get-broadcast-status.js
// Returns all BroadcastQueue records for a given broadcastId (or the most recent active broadcast)
// with confirmed/unconfirmed counts and per-person status
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const { broadcastId } = event.queryStringParameters || {};
    let formula = encodeURIComponent('1=1');
    if (broadcastId) {
      formula = encodeURIComponent(`{BroadcastID}="${broadcastId}"`);
    } else {
      // Most recent broadcast — get records from last 7 days
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      formula = encodeURIComponent(`{SentAt}>="${cutoff}"`);
    }
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue?filterByFormula=${formula}&sort[0][field]=SentAt&sort[0][direction]=desc&maxRecords=200`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    const records = (data.records || []).map(r => ({
      id: r.id,
      broadcastId: r.fields.BroadcastID || '',
      name: r.fields.Name || '',
      phone: r.fields.Phone || '',
      role: r.fields.Role || '',
      confirmed: r.fields.Confirmed === 'Yes',
      confirmedAt: r.fields.ConfirmedAt || '',
      sentAt: r.fields.SentAt || '',
      message: r.fields.Message || '',
    }));
    // Group by broadcastId
    const groups = {};
    for (const r of records) {
      if (!groups[r.broadcastId]) groups[r.broadcastId] = { broadcastId: r.broadcastId, message: r.message, sentAt: r.sentAt, records: [] };
      groups[r.broadcastId].records.push(r);
    }
    return { statusCode: 200, headers, body: JSON.stringify({ groups: Object.values(groups) }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
