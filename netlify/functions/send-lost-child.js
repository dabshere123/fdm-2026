// send-lost-child.js
// Sends Lost Child alert to ALL registered staff via SMS + Voice + all GroupMe channels
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE    = '+16082289692';
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER || '+16089048750';

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

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { location, description, requestedBy, assemblyPoint } = JSON.parse(event.body || '{}');

  const msg = [
    '🧒 LOST CHILD 🧒',
    '',
    `LOCATION LAST SEEN: ${location || 'Unknown'}`,
    `DESCRIPTION: ${description || 'Unknown'}`,
    `ASSEMBLY POINT: ${assemblyPoint || 'Medical Tent'}`,
    `REPORTED BY: ${requestedBy || 'Staff'}`,
    `TIME: ${new Date().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}`,
    '',
    'ALL STAFF PLEASE BE ON ALERT',
  ].join('\n');

  const voiceMsg = `Urgent. Lost child at Fete de Marquette. ${description || 'Child'}. Last seen near ${location || 'the festival grounds'}. Assembly point is ${assemblyPoint || 'the medical tent'}. All staff please be on alert immediately. This is urgent.`;

  // 1. Send to all GroupMe channels
  const gmPromises = Object.entries(GM_BOTS).map(([channel, botId]) =>
    fetch('https://api.groupme.com/v3/bots/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: botId, text: msg })
    }).catch(e => console.log(`GM ${channel} error:`, e.message))
  );
  await Promise.all(gmPromises);
  console.log('GroupMe: all 7 channels sent');

  // 2. Fetch all approved staff phones from Airtable
  let allPhones = [ADMIN_PHONE];
  try {
    let records = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff${offset ? `?offset=${offset}` : ''}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
      const data = await res.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    const staffPhones = records
      .filter(r => r.fields.Status === 'Approved' && r.fields.Phone)
      .map(r => fmtPhone(r.fields.Phone))
      .filter(Boolean);

    allPhones = [...new Set([ADMIN_PHONE, ...staffPhones])];
    console.log(`Sending to ${allPhones.length} phones`);
  } catch(e) {
    console.log('Airtable staff fetch error:', e.message);
  }

  // 3. Send SMS + Voice to all phones
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
  const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;

  const phonePromises = allPhones.map(async phone => {
    try {
      // SMS
      await fetch(twilioBase, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, MessagingServiceSid: MESSAGING_SID, Body: msg }).toString()
      });
      // Voice
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_FROM,
          Twiml: `<Response><Say voice="alice" loop="2">${voiceMsg}</Say></Response>`
        }).toString()
      });
    } catch(e) { console.log(`Error for ${phone}:`, e.message); }
  });

  await Promise.all(phonePromises);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, phones: allPhones.length }) };
};
