// get-conversations.js — returns inbox: all channels + DM threads with last message
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const p = event.queryStringParameters || {};
    const myName = p.myName || '';

    // Fetch last 200 messages sorted newest first
    const url = `https://api.airtable.com/v0/${BASE}/Messages?sort[0][field]=SentAt&sort[0][direction]=desc&maxRecords=200`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    const records = data.records || [];

    // Build conversation map keyed by channel (or DM thread)
    const convMap = {};
    for (const r of records) {
      const f = r.fields;
      const isDM = f.IsDM === 'Yes';
      const key = isDM
        ? (f.ThreadID || `DM_${[f.FromName, f.ToName].sort().join('_')}`)
        : f.Channel;
      if (!key) continue;

      if (!convMap[key]) {
        convMap[key] = {
          id: key,
          isDM,
          channel: f.Channel || key,
          otherName: isDM ? (f.FromName === myName ? f.ToName : f.FromName) : null,
          lastMessage: f.Message || '',
          lastFrom: f.FromRole || f.FromName || '',
          lastAt: f.SentAt || '',
          unread: 0,
          recipients: f.Recipients || f.Channel || '',
        };
      }
    }

    const conversations = Object.values(convMap).sort((a, b) =>
      new Date(b.lastAt) - new Date(a.lastAt)
    );

    return { statusCode: 200, headers, body: JSON.stringify({ conversations }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
