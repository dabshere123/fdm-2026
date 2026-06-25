// submit-lost-found.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const ADMIN2_PHONE   = '+16082289692';

function generateItemNumber(dayFound, foundAt) {
  // Day prefix: THU FRI SAT SUN
  const d = (dayFound || '').toUpperCase();
  const dayCode = d.startsWith('TH') ? 'THU' :
                  d.startsWith('FR') ? 'FRI' :
                  d.startsWith('SA') ? 'SAT' :
                  d.startsWith('SU') ? 'SUN' :
                  d.slice(0,3) || 'FRI';

  // Location code from foundAt
  const loc = (foundAt || '').toLowerCase();
  const locCode = loc.includes('moon')&&loc.includes('bar') ? 'MOON' :
                  loc.includes('moon')&&loc.includes('stage') ? 'MOONST' :
                  loc.includes('moon') ? 'MOON' :
                  loc.includes('sun')&&loc.includes('left') ? 'SUNL' :
                  loc.includes('sun')&&loc.includes('right') ? 'SUNR' :
                  loc.includes('sun')&&loc.includes('stage') ? 'SUNST' :
                  loc.includes('sun') ? 'SUN' :
                  loc.includes('lafayette')||loc.includes('laf') ? 'LAF' :
                  loc.includes('lagniappe')||loc.includes('lag') ? 'LAG' :
                  loc.includes('family') ? 'FAM' :
                  loc.includes('cabaret') ? 'CAB' :
                  loc.includes('everything')||loc.includes('eec') ? 'EEC' :
                  loc.includes('merch') ? 'MERCH' :
                  loc.includes('medical')||loc.includes('first aid') ? 'MED' :
                  'FEST';

  const seq = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  return `${dayCode}-${locCode}-${seq}`;
}

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }).toString()
  });
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}
  const { description, location, foundBy } = body;

  if (!description || !location) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing description or location' }) };
  }

  const itemNumber  = generateItemNumber(body.dayFound, body.foundAt || body.location);
  const now         = new Date();
  const eventDay    = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const foundAtDate = now.toISOString().split('T')[0];
  const timeStr     = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        ItemNumber:  itemNumber,
        Description: description,
        Location:    location,
        FoundBy:     foundBy || 'Staff',
        FoundAt:     foundAtDate,
        Status:      'Unclaimed',
        EventDay:    eventDay,
      }
    })
  });

  const data = await res.json();

  if (!res.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: data.error?.message || 'Airtable error' }) };
  }

  // SMS notification to Admin 2 (Devin)
  try {
    const smsMsg = `📦 L&F Item Logged — #${itemNumber}\nItem: ${description}\nFound at: ${location}\nBy: ${foundBy || 'Staff'}\nTime: ${timeStr}`;
    await sendSMS(ADMIN2_PHONE, smsMsg);
  } catch(e) {
    console.log('SMS error:', e.message);
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, itemNumber, id: data.id }) };
};
