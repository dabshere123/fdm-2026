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
  return res.json();
}

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, MessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || TWILIO_FROM, Body: message }).toString()
  });
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
    voiceMsg = `Attention. This is Fete de Marquette Operations. We have a lost child. ${situation || ''}. Last seen: ${location || 'festival grounds'}. Please be on alert and report any sightings to the festival office immediately.`;
    smsMsg   = `🧒 LOST CHILD — FDM 2026\nLast seen: ${location || 'festival grounds'}\n${situation || ''}\nPlease be on alert.`;
  } else {
    voiceMsg = `Attention. This is Fete de Marquette Operations requesting police assistance. ${situation || 'Security incident in progress'}. Location: ${location || 'festival grounds'}. Please respond.`;
    smsMsg   = `🚨 MPD REQUESTED — FDM 2026\nLocation: ${location || 'festival grounds'}\nSituation: ${situation || ''}\nPlease respond.`;
  }

  const called = [];
  const errors = [];

  // Call all on-duty officers
  const onDuty = (officers || []).filter(o => o.phone);
  for (const officer of onDuty) {
    try {
      await callOfficer(officer.phone, voiceMsg);
      await sendSMS(officer.phone, smsMsg);
      called.push(officer.name || officer.phone);
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
