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
    body: new URLSearchParams({ To: to, MessagingServiceSid: MESSAGING_SID || TWILIO_FROM, Body: message }).toString()
  }).catch(() => {});
}

async function sendVoice(phones, message) {
  if (!TWILIO_SID || !TWILIO_AUTH) return;
  await fetch(`https://fdm2026.netlify.app/.netlify/functions/send-voice`, {
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
      body: JSON.stringify({ fields, typecast: true })
    });
    const data = await res.json();
    if (!res.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Airtable save failed' }) };

    // Lookup helper — same role-code matching used elsewhere in the app, needed here
    // since Maintenance/Supplies notify a role-based roster, not just the two admin phones
    async function getRolePhones(roleCodes) {
      try {
        const staffRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
          { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const staffData = await staffRes.json();
        return (staffData.records || [])
          .filter(r => roleCodes.some(rc => String(r.fields['Role'] || '').toLowerCase().includes(rc)))
          .map(r => {
            const ph = String(r.fields['Phone'] || '').replace(/[^0-9]/g, '');
            return ph.length === 10 ? `+1${ph}` : ph.length === 11 ? `+${ph}` : null;
          }).filter(Boolean);
      } catch (e) { return []; }
    }

    // SMS + Voice for Medical, Fire/Life Safety, Security
    const urgentTypes = ['medical', 'walk_in', 'fire', 'security'];
    if (urgentTypes.includes((type || '').toLowerCase())) {
      const typeLabel = type === 'medical' ? '🩺 MEDICAL' :
                        type === 'walk_in'  ? '🩺 WALK-IN PATIENT' :
                        type === 'fire'     ? '🔥 FIRE / LIFE SAFETY' :
                        type === 'security' ? '🔒 SECURITY' : type.toUpperCase();

      const sms = `🚨 ${typeLabel} CALL — FDM 2026\n\nLocation: ${location}\nProblem: ${problem}${details ? '\nDetails: ' + details : ''}\nFrom: ${requestedBy}\n · Respond immediately`;
      const voice = `Urgent ${typeLabel.replace(/[🩺🔥🔒]/g, '').trim()} call at Fête de Marquette. Location: ${location}. ${problem}. Please respond immediately to McPike Park.`;

      // WALK-IN PATIENT — Admin 2 (Devin) + Med 1 + Med 2 only
      if (type.toLowerCase() === 'walk_in') {
        let targetPhones = [ADMIN_PHONES[0]]; // Devin / Admin 2
        try {
          const staffRes = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
            { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
          );
          const staffData = await staffRes.json();
          const medRoles = ['med unit 1', 'med 1', 'm1', 'med unit 2', 'med 2', 'm2'];
          const medPhones = (staffData.records || [])
            .filter(r => medRoles.some(role => String(r.fields['Role'] || '').toLowerCase().includes(role)))
            .map(r => {
              const ph = String(r.fields['Phone'] || '').replace(/[^0-9]/g, '');
              return ph.length === 10 ? `+1${ph}` : ph.length === 11 ? `+${ph}` : null;
            }).filter(Boolean);
          targetPhones = [...new Set([...targetPhones, ...medPhones])];
        } catch (e) {
          console.error('Walk-in Med roster lookup error:', e.message);
        }

        await Promise.all(targetPhones.map(ph => sendSMS(ph, sms)));
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        const twiml = `<Response><Say voice="alice">${voice}</Say><Pause length="1"/><Say voice="alice">${voice}</Say></Response>`;
        await Promise.all(targetPhones.map(ph =>
          fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: ph, From: process.env.TWILIO_PHONE_NUMBER || ADMIN_PHONES[0], Twiml: twiml }).toString()
          }).catch(() => {})
        ));
      } else {
        // MEDICAL / FIRE / SECURITY — SMS to Devin + Gary
        await Promise.all(ADMIN_PHONES.map(ph => sendSMS(ph, sms)));

        // Voice call to Devin + Gary for Medical and Fire
        if (['medical', 'fire'].includes(type.toLowerCase())) {
          const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
          const twiml = `<Response><Say voice="alice">${voice}</Say><Pause length="1"/><Say voice="alice">${voice}</Say></Response>`;
          await Promise.all(ADMIN_PHONES.map(ph =>
            fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
              method: 'POST',
              headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ To: ph, From: process.env.TWILIO_PHONE_NUMBER || ADMIN_PHONES[0], Twiml: twiml }).toString()
            }).catch(() => {})
          ));
        }
      }
    }

    // SMS for Maintenance and Supplies — SMS only, no voice, same roster used at acknowledgment time
    if ((type || '').toLowerCase() === 'maintenance' || (type || '').toLowerCase() === 'supplies') {
      const isMaint = (type || '').toLowerCase() === 'maintenance';
      const label = isMaint ? '🔧 MAINTENANCE' : '📦 RESTOCK REQUEST';
      const problemLabel = isMaint ? "WHAT'S THE PROBLEM" : "WHAT'S NEEDED";
      const sms = [
        `${label} ${label}`,
        ``,
        `LOCATION: ${location}`,
        `${problemLabel}: ${problem || ''}`,
        details ? `DESCRIPTION: ${details}` : '',
        `REQUESTING PARTY: ${requestedBy || 'Staff'}`,
      ].filter(Boolean).join('\n');

      // Same role codes used by getNotifyList() on the frontend for these types
      const roleCodes = isMaint
        ? ['admin', 'a1', 'a2', 'oc1', 'oc2', 'oc3', 'oc4', 'slb', 'ssm', 'sbl']
        : ['admin', 'a1', 'a2'];
      const rolePhones = await getRolePhones(roleCodes);
      const targetPhones = [...new Set([ADMIN_PHONES[0], ...rolePhones])];
      await Promise.all(targetPhones.map(ph => sendSMS(ph, sms)));
    }

    // Lost child: SMS + Voice ALL staff + broadcast to AllStaff chat
    if (type === 'lost_child') {
      const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
      const alertMsg = JSON.stringify({
        _lostChild: true, location: location || '', problem: problem || '',
        details: details || '', reportedBy: requestedBy || 'Staff', at: ts,
      });
      // Save to AllStaff channel so worker apps show full-screen alert
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          FromName: 'Admin', FromRole: 'Admin', Channel: 'AllStaff',
          Message: alertMsg, SentAt: new Date().toISOString(),
          IsAlert: 'Yes', IsDM: 'No', IsFirst: 'No',
        }})
      }).catch(() => {});

      // SMS + Voice to ALL approved staff
      const smsTxt = `🚨 LOST CHILD ALERT — FDM 2026

Location: ${location}
${problem}
Reported by: ${requestedBy} at ${ts}

Search your area immediately — notify admin if found.`;
      const voiceTxt = `Urgent alert at Fête de Marquette. A child has been reported missing. Last seen at ${location}. ${problem}. All staff please search your area immediately and contact admin if found.`;

      try {
        // Get all approved staff phones
        const staffRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
          { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const staffData = await staffRes.json();
        const allPhones = [...new Set([
          ...ADMIN_PHONES,
          ...(staffData.records || []).map(r => {
            const ph = String(r.fields['Phone'] || '').replace(/[^0-9]/g, '');
            return ph.length === 10 ? `+1${ph}` : ph.length === 11 ? `+${ph}` : null;
          }).filter(Boolean)
        ])];

        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        // SMS to everyone — sent in parallel so all staff get it at roughly the same time
        await Promise.all(allPhones.map(ph =>
          fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: ph, MessagingServiceSid: MESSAGING_SID || TWILIO_FROM, Body: smsTxt }).toString()
          }).catch(() => {})
        ));
        // Voice call to admin + first 10 staff (to avoid too many simultaneous calls), also in parallel
        const voicePhones = allPhones.slice(0, 10);
        const twiml = `<Response><Say voice="alice">${voiceTxt}</Say><Pause length="1"/><Say voice="alice">${voiceTxt}</Say></Response>`;
        await Promise.all(voicePhones.map(ph =>
          fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ To: ph, From: process.env.TWILIO_PHONE_NUMBER || ADMIN_PHONES[0], Twiml: twiml }).toString()
          }).catch(() => {})
        ));
      } catch (e) {
        console.error('Lost child SMS error:', e.message);
      }
    }

    console.log('Call saved:', data.id, type, location);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
