// submit-call.js — saves call to Airtable + SMS+Voice for Medical/Fire/Security
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'ActiveMedCalls';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONES   = ['+16082289692', '+16082352925']; // Devin + Gary

async function sendSMS(to, message) {
  if (!TWILIO_SID || !TWILIO_AUTH || !MESSAGING_SID) return;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, MessagingServiceSid: MESSAGING_SID, Body: message }).toString()
  }).catch(() => {});
}

async function sendVoice(phones, message) {
  if (!TWILIO_SID || !TWILIO_AUTH) return;
  await fetch(`/.netlify/functions/send-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phones, message })
  }).catch(() => {});
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { type, location, problem, details, requestedBy, phone } = body;
  if (!type) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing type' }) };

  const fields = {
    Type:        type || '',
    Location:    location || '',
    Problem:     problem || '',
    Details:     details || '',
    RequestedBy: requestedBy || 'Staff',
    Phone:       phone || '',
    Status:      'Pending',
    Timestamp:   new Date().toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Chicago' }),
  };

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Airtable save failed' }) };

    // SMS + Voice for Medical, Fire/Life Safety, Security
    const urgentTypes = ['medical', 'walk_in', 'fire', 'security'];
    if (urgentTypes.includes((type || '').toLowerCase())) {
      const typeLabel = type === 'medical' ? '🩺 MEDICAL' :
                        type === 'walk_in'  ? '🩺 WALK-IN PATIENT' :
                        type === 'fire'     ? '🔥 FIRE / LIFE SAFETY' :
                        type === 'security' ? '🔒 SECURITY' : type.toUpperCase();

      const sms = `🚨 ${typeLabel} CALL — FDM 2026\n\nLocation: ${location}\nProblem: ${problem}${details ? '\nDetails: ' + details : ''}\nFrom: ${requestedBy}\n\nMcPike Park · Respond immediately`;
      const voice = `Urgent ${typeLabel.replace(/[🩺🔥🔒]/g, '').trim()} call at Fête de Marquette. Location: ${location}. ${problem}. Please respond immediately to McPike Park.`;

      // SMS to Devin + Gary
      for (const ph of ADMIN_PHONES) {
        await sendSMS(ph, sms);
      }

      // Voice call to Devin + Gary for Medical and Fire
      if (['medical', 'walk_in', 'fire'].includes(type.toLowerCase())) {
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        const twiml = `<Response><Say voice="alice">${voice}</Say><Pause length="1"/><Say voice="alice">${voice}</Say></Response>`;
        for (const ph of ADMIN_PHONES) {
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: ph, From: process.env.TWILIO_PHONE_NUMBER || ADMIN_PHONES[0], Twiml: twiml }).toString()
          }).catch(() => {});
        }
      }
    }

    console.log('Call saved:', data.id, type, location);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
