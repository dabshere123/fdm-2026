// send-mpd.js
// Makes voice calls to MPD officers when security or lost child alerts fire
// POST body: { type, officers: [{name, phone}], location, situation }

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;
const ADMIN2_PHONE = '+16082289692';

async function callOfficer(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  const safe = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Matthew" language="en-US">${safe}</Say><Pause length="2"/><Say voice="Polly.Matthew" language="en-US">${safe}</Say></Response>`;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`,
    {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Twiml: twiml }).toString()
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Voice call rejected by Twilio');
  return data;
}

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, MessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || TWILIO_FROM, Body: message }).toString()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'SMS rejected by Twilio');
  return data;
}

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

  const { type, officers, location, situation } = JSON.parse(event.body || '{}');

  const isLostChild = type === 'lost_child';
  const isSecurity  = type === 'security';

  let voiceMsg, smsMsg;

  if (isLostChild) {
    const situationVoice = (situation||'').replace(/Name:\s*[^-\n]+-\s*/i,'').replace(/ASSEMBLY:/gi,'MEET AT:').replace(/\n/g,' ').trim();
    voiceMsg = `Missing child. Location: ${location || 'festival grounds'}. ${situationVoice}. Please be on alert and report any sightings to the festival office immediately.`;
    smsMsg   = `🧒 LOST CHILD — FDM 2026\nLast seen: ${location || 'festival grounds'}\n${situation || ''}\nPlease be on alert.`;
  } else {
    voiceMsg = `MPD, you are requested to respond immediately to ${location || 'festival grounds'} for ${situation || 'a security incident'}. This is requested by Admin. Please respond text with ACK.`;
    smsMsg   = `🚨 MPD REQUESTED — FDM 2026\nLocation: ${location || 'festival grounds'}\nSituation: ${situation || ''}\nPlease respond.`;
  }

  const called = [];
  const errors = [];

  // Call all on-duty officers
  const onDuty = (officers || []).filter(o => o.phone);
  for (const officer of onDuty) {
    const ph = fmtPhone(officer.phone);
    if (!ph) { errors.push(`${officer.name}: invalid phone number`); continue; }
    try {
      await callOfficer(ph, voiceMsg);
      await sendSMS(ph, smsMsg);
      called.push(officer.name || ph);
    } catch (e) {
      errors.push(`${officer.name}: ${e.message}`);
    }
  }

  // Always notify Admin 2 (Devin) via SMS
  try {
    await sendSMS(ADMIN2_PHONE, `📋 MPD notified: ${called.length} officers called.\n${smsMsg}`);
  } catch(e) {
    console.log('Admin SMS error:', e.message);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, called, errors })
  };
};
