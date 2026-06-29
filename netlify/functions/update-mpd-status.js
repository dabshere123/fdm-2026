// update-mpd-status.js — toggle officer online/offline
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { id, status } = JSON.parse(event.body || '{}');
    await fetch(`https://api.airtable.com/v0/${BASE}/MPDOfficers/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { MPDStatus: status } })
    });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
