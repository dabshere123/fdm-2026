// get-weather-acks.js — returns names of everyone who has replied AWA (or a variant)
// since a given timestamp, by reading the Festival Chat log entries the sms-webhook writes.
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const sinceISO = (event.queryStringParameters || {}).since || new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/Messages?filterByFormula=AND(FIND("acknowledged the WEATHER ALERT",{Message})>0,IS_AFTER({SentAt},"${sinceISO}"))&maxRecords=200`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const acked = (data.records || []).map(r => ({
      name: r.fields.FromName || '',
      role: r.fields.FromRole || '',
      time: r.fields.SentAt || '',
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ acked }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
