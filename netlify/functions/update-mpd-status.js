// update-mpd-status.js — toggle officer online/offline
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { id, status, schedule } = JSON.parse(event.body || '{}');
    const fields = {};
    if (status !== undefined) fields.MPDStatus = status;
    if (schedule && typeof schedule === 'object') Object.assign(fields, schedule);
    await fetch(`https://api.airtable.com/v0/${BASE}/MPDOfficers/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ typecast: true, fields })
    });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
