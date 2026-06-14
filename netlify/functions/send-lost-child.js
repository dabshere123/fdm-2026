// send-lost-child.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH   = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE   = '+16082289692';
const TWILIO_FROM   = process.env.TWILIO_PHONE_NUMBER || '+16089048750';

const GM_BOTS = {
  all_staff:   '98b725b13c73172ca29fc3cc1e',
  admin:       'e00d52092cbeee4126e1c47f2e',
  medical:     '18679f837dbeab3effa96a2471',
  bar_stage:   'fe4a796611de5dbb94be8772b8',
  financial:   '6e40448c62350a4f807aab679b',
  restock:     'e86ef1a3c4a49b36b9f04b0b98',
  maintenance: '7929442cf4989bfca533c419ee',
};

function fmtPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return String(p);
  return null;
}

async function sendSMS(to, body, auth) {
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, MessagingServiceSid: MESSAGING_SID, Body: body }).toString()
    });
    const d = await r.json();
    console.log(`SMS to ${to}: ${d.status || d.message || 'sent'}`);
  } catch(e) { console.log(`SMS error to ${to}:`, e.message); }
}

async function sendVoice(to, msg, auth) {
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: to, From: TWILIO_FROM,
        Twiml: `<Response><Say voice="man" loop="3">${msg}</Say></Response>`
      }).toString()
    });
    const d = await r.json();
    console.log(`Voice to ${to}: ${d.status || d.message || 'initiated'}`);
  } catch(e) { console.log(`Voice error to ${to}:`, e.message); }
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  console.log('send-lost-child invoked');

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) { console.log('Body parse error:', e.message); }

  const { location = 'Unknown', description = 'Child', requestedBy = 'Staff', assemblyPoint = 'Medical Tent' } = body;

  const ts = new Date().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });

  const msg = [
    '🧒 LOST CHILD 🧒',
    '',
    `LAST SEEN: ${location}`,
    `DESCRIPTION: ${description}`,
    `ASSEMBLY POINT: ${assemblyPoint}`,
    `REPORTED BY: ${requestedBy}`,
    `TIME: ${ts}`,
    '',
    'ALL STAFF PLEASE BE ON ALERT',
  ].join('\n');

  const voiceMsg = `Urgent. Lost child at Fete de Marquette. ${description}. Last seen near ${location}. Assembly point is ${assemblyPoint}. All staff please be on alert immediately.`;

  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');

  // STEP 1 — Admin SMS + Voice immediately (no Airtable dependency)
  console.log('Step 1: Alerting admin directly');
  await sendSMS(ADMIN_PHONE, msg, auth);
  await sendVoice(ADMIN_PHONE, voiceMsg, auth);

  // STEP 2 — GroupMe all channels
  console.log('Step 2: Sending GroupMe to all channels');
  await Promise.all(Object.entries(GM_BOTS).map(async ([channel, botId]) => {
    try {
      const r = await fetch('https://api.groupme.com/v3/bots/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId, text: msg })
      });
      console.log(`GroupMe ${channel}: ${r.status}`);
    } catch(e) { console.log(`GroupMe ${channel} error:`, e.message); }
  }));

  // STEP 3 — Fetch all approved staff and SMS + Voice
  console.log('Step 3: Fetching staff phones from Airtable');
  let extraPhones = [];
  try {
    let records = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff${offset ? `?offset=${offset}` : ''}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
      const data = await res.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    extraPhones = [...new Set(
      records
        .filter(r => r.fields.Status === 'Approved' && r.fields.Phone)
        .map(r => fmtPhone(r.fields.Phone))
        .filter(p => p && p !== ADMIN_PHONE)
    )];
    console.log(`Found ${extraPhones.length} additional staff phones`);
  } catch(e) { console.log('Airtable error:', e.message); }

  // Send to all staff phones
  for (const phone of extraPhones) {
    await sendSMS(phone, msg, auth);
    await sendVoice(phone, voiceMsg, auth);
  }

  console.log(`send-lost-child complete. GM: 7 channels, SMS+Voice: ${1 + extraPhones.length} phones`);
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, phones: 1 + extraPhones.length }) };
};
