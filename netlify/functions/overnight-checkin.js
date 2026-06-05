const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'OvernightReports';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  console.log('overnight-checkin called');
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { crewMember, eventDay } = body;
  const checkInTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const fields = {
    CrewMember: crewMember || 'Unknown',
    EventDay: eventDay || '',
    Status: 'Checked In',
    Notes: `Checked in at ${checkInTime}`,
  };

  console.log('Sending fields:', JSON.stringify(fields));

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  const data = await res.json();
  console.log('Airtable status:', res.status, JSON.stringify(data).slice(0, 300));

  if (!res.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: data.error?.message || 'Airtable error', details: data }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
};
