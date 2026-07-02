// get-mpd-officers.js — fetch MPD officer list
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/MPDOfficers?maxRecords=50`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const officers = (data.records || []).map(r => ({
      id: r.id,
      name: r.fields.Name || '',
      phone: r.fields.Phone || '',
      status: r.fields.MPDStatus || 'OFF',
      lastAck: r.fields.LastAck || '',
      sched: {
        ThuStart: r.fields.ThuStart || '', ThuEnd: r.fields.ThuEnd || '',
        FriStart: r.fields.FriStart || '', FriEnd: r.fields.FriEnd || '',
        SatStart: r.fields.SatStart || '', SatEnd: r.fields.SatEnd || '',
        SunStart: r.fields.SunStart || '', SunEnd: r.fields.SunEnd || '',
      },
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ officers }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
