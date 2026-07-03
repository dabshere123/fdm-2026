// request-mpd.js — send SMS + Voice to all online MPD officers
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;
const MSG_SID      = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE  = '+16082289692';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  try {
    const { location, situation, requestedBy, callType } = JSON.parse(event.body || '{}');

    // Get online officers
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/MPDOfficers?filterByFormula={MPDStatus}="On"`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const officers = (data.records || []).map(r => ({
      name: r.fields.Name,
      phone: String(r.fields.PhoneNumber || '').replace(/[^0-9]/g,''),
      id: r.id,
    })).filter(o => o.phone.length >= 10);

    if (!TWILIO_SID || !TWILIO_AUTH) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, notified: 0, message: 'Twilio not configured' }) };
    }
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const smsBody = `🚔 MPD REQUESTED — FDM 2026\n\nLocation: ${location}\nSituation: ${situation}\nRequested by: ${requestedBy}\n\nPlease respond to McPike Park.\nReply DISREGARD to cancel.`;
    const situationVoice = (situation||'').replace(/Name:\s*[^-\n]+-\s*/i,'').replace(/ASSEMBLY:/gi,'MEET AT:').replace(/\n/g,' ').trim();
    const voiceMsg = callType === 'lost_child'
      ? `Missing child. Location: ${location || 'festival grounds'}. ${situationVoice}. Please be on alert and report any sightings to the festival office immediately.`
      : `MPD, you are requested to respond immediately to ${location || 'festival grounds'} for ${situation || 'a security incident'}. This is requested by ${requestedBy || 'Admin'}. Please respond text with ACK.`;
    const twiml = `<Response><Say voice="alice">${voiceMsg}</Say><Pause length="1"/><Say voice="alice">${voiceMsg}</Say></Response>`;

    for (const o of officers) {
      const ph = o.phone.length === 10 ? `+1${o.phone}` : `+${o.phone}`;
      // SMS
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: ph, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: smsBody }).toString()
      }).catch(() => {});
      // Voice
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: ph, From: TWILIO_FROM, Twiml: twiml }).toString()
      }).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, notified: officers.length, officers: officers.map(o=>o.name) }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
