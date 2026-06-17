// register-staff.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;

function approvalSMS(name, role, lastName) {
  return `Hi ${name},\n\nThank you for registering as a ${role||'Staff Member'} at Fête de Marquette 2026! We're glad to have you on the team.\n\nTo access the Worker App:\n\n1️⃣ Tap the link below\n2️⃣ Sign in with your last name: ${lastName}\n3️⃣ Add the app to your home screen for quick access\n\n🔗 Worker App:\nhttps://fdm2026.netlify.app/field\n\n📋 User Guide & Info:\nhttps://fdm2026.netlify.app/guide\n\nIf you have any questions, reach out to festival operations. See you at McPike Park, July 9–12! 🎶\n\n— Fête de Marquette 2026 Operations\n\nReply STOP to unsubscribe.`;
}

function normalizePhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return p;
  return null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { name, role, location, phone, days, groupme, shiftStart, shiftEnd, smsConsent } = JSON.parse(event.body || '{}');

  if (!name || !phone || !role) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const lastName = name.trim().split(' ').pop();

  // Build compact day+time format
  let normalizedDays = '';
  if (Array.isArray(days) && days.length > 0 && typeof days[0] === 'object') {
    const abbrevMap = {thu:'Th', fri:'F', sat:'S', sun:'SU'};
    const parts = days.map(d => {
      const ab = abbrevMap[d.id] || d.id;
      return (d.start !== '' && d.end !== '') ? `${ab} ${d.start}-${d.end}` : ab;
    });
    const allSameTime = parts.every((p,_,arr) => p.replace(/\w+\s/,'') === arr[0].replace(/\w+\s/,''));
    if (days.length === 4 && allSameTime) {
      const time = parts[0].includes(' ') ? ' '+parts[0].split(' ')[1] : '';
      normalizedDays = 'EVERYDAY'+time;
    } else {
      normalizedDays = parts.join(' ');
    }
  } else if (Array.isArray(days)) {
    const abbrevMap = {thu:'Th', fri:'F', sat:'S', sun:'SU'};
    const abbrev = days.map(d => abbrevMap[d.toLowerCase()] || d);
    normalizedDays = days.length === 4 ? 'EVERYDAY' : abbrev.join(' ');
  } else {
    normalizedDays = days || 'EVERYDAY';
  }

  let normalizedLocation = location || '';
  if (normalizedLocation.toLowerCase().includes('all area')) {
    normalizedLocation = 'FULL FEST GROUNDS';
  }

  // Only include fields that exist in Airtable Staff table
  const fields = {
    Name1:    name,
    Role:     role,
    Phone:    phone,
    Status:   'Approved',
  };

  if (normalizedLocation)  fields.Location   = normalizedLocation;
  if (normalizedDays)      fields.Days       = normalizedDays;
  if (shiftStart)          fields.ShiftStart  = shiftStart;
  if (shiftEnd)            fields.ShiftEnd    = shiftEnd;
  if (smsConsent !== undefined) fields.SMSConsent = smsConsent ? 'Yes' : 'No';
  if (groupme)             fields.GroupMEGPName = groupme;

  console.log('Saving to Airtable:', JSON.stringify(fields));

  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const record = await airtableRes.json();

    if (record.error) {
      console.error('Airtable error:', JSON.stringify(record.error));
      return { statusCode: 500, headers, body: JSON.stringify({ error: record.error.message || 'Airtable save failed', detail: record.error }) };
    }

    console.log('Saved to Airtable. Record ID:', record.id);

    // Send confirmation SMS
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && smsConsent) {
      try {
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            To: normalizedPhone,
            MessagingServiceSid: MESSAGING_SID,
            Body: approvalSMS(name, role, lastName)
          }).toString()
        });
        const smsData = await smsRes.json();
        console.log('SMS status:', smsData.status || smsData.message);
      } catch(e) {
        console.log('SMS error:', e.message);
      }
    } else {
      console.log('SMS skipped — consent:', smsConsent, 'phone:', normalizedPhone);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, approved: true, recordId: record.id }) };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
