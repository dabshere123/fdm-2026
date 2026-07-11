// weather-monitor.js
// Netlify scheduled function — runs every 5 minutes
// Checks NWS alerts for Dane County, WI
// Fires inclement weather broadcast for dangerous alerts
// Schedule: "*/5 * * * *"

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN_  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const ADMIN2_PHONE   = '+16082289692';

// NWS zone for Dane County, WI
const NWS_ZONE = 'WIZ064';
const NWS_URL  = `https://api.weather.gov/alerts/active?zone=${NWS_ZONE}`;

// Alert types that trigger a broadcast
const DANGEROUS_EVENTS = [
  'Tornado Warning',
  'Tornado Watch',
  'Severe Thunderstorm Warning',
  'Severe Thunderstorm Watch',
  'High Wind Warning',
  'High Wind Watch',
  'Wind Advisory',
  'Flash Flood Warning',
  'Flash Flood Watch',
  'Special Weather Statement',
];

const GROUPME_BOTS = {
  all_staff:   '98b725b13c73172ca29fc3cc1e',
  admin:       'e00d52092cbeee4126e1c47f2e',
  medical:     '18679f837dbeab3effa96a2471',
  bar_stage:   'fe4a796611de5dbb94be8772b8',
  financial:   '6e40448c62350a4f807aab679b',
  restock:     'e86ef1a3c4a49b36b9f04b0b98',
  maintenance: '7929442cf4989bfca533c419ee',
};

async function sendGroupMe(botId, message) {
  if (!botId) return;
  await fetch('https://api.groupme.com/v3/bots/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id: botId, text: message })
  });
}

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN_}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }).toString()
  });
}

async function sendVoice(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN_}`).toString('base64');
  const safe = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Matthew" language="en-US">${safe}</Say><Pause length="2"/><Say voice="Polly.Matthew" language="en-US">${safe}</Say></Response>`;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Twiml: twiml }).toString()
  });
}

async function alreadyFired(alertId) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/WeatherAlertLog?filterByFormula={AlertID}="${alertId}"`,
    { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
  );
  const data = await res.json();
  return (data.records || []).length > 0;
}

async function logAlert(alertId, event, headline) {
  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/WeatherAlertLog`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { AlertID: alertId, Event: event, Headline: headline, FiredAt: new Date().toISOString() } })
  });
}

// Also get all staff phones from Airtable
async function getAllStaffPhones() {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff?fields[]=Phone&filterByFormula={Status}="Approved"&pageSize=100`,
    { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
  );
  const data = await res.json();
  return (data.records || []).map(r => r.fields.Phone).filter(Boolean);
}

exports.handler = async () => {
  try {
    // Fetch NWS alerts
    const nwsRes = await fetch(NWS_URL, {
      headers: { 'User-Agent': 'FDMOps/1.0 (fdm2026.netlify.app; contact: dabshere@gmail.com)' }
    });
    const nwsData = await nwsRes.json();
    const alerts = nwsData.features || [];

    const fired = [];

    for (const alert of alerts) {
      const { id, properties } = alert;
      const event    = properties.event || '';
      const headline = properties.headline || '';
      const desc     = properties.description || '';
      const severity = properties.severity || '';
      const urgency  = properties.urgency || '';

      // Only fire for dangerous events
      if (!DANGEROUS_EVENTS.some(e => event.includes(e))) continue;

      // Skip if already fired
      const shortId = id.split('/').pop();
      if (await alreadyFired(shortId)) continue;

      // Build message
      const msg = [
        `⛈️ WEATHER ALERT — ${event.toUpperCase()}`,
        ``,
        `${headline}`,
        ``,
        `Fête de Marquette Operations is monitoring this alert. Stay alert and follow instructions from Operations staff.`,
        ``,
        `Severity: ${severity} | Urgency: ${urgency}`,
        `Source: National Weather Service`
      ].join('\n');

      const voiceMsg = `Weather alert from the National Weather Service. ${event}. ${headline}. Fete de Marquette Operations is monitoring this situation. Please stay alert and await instructions.`;

      // Send to all GroupMe channels
      for (const botId of Object.values(GROUPME_BOTS)) {
        await sendGroupMe(botId, msg);
      }

      // Get all staff phones and send SMS + Voice
      const staffPhones = await getAllStaffPhones();
      const allPhones = [...new Set([ADMIN2_PHONE, ...staffPhones])];

      await Promise.all(allPhones.map(async phone => {
        await sendSMS(phone, msg);
        await sendVoice(phone, voiceMsg);
      }));

      // Log to Airtable so we don't re-fire
      await logAlert(shortId, event, headline);
      fired.push(event);

      console.log(`Weather alert fired: ${event}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ checked: alerts.length, fired: fired.length, events: fired })
    };
  } catch (err) {
    console.error('weather-monitor error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
