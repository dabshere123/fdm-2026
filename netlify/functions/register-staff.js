// register-staff.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;

const approvalSMS = (name) => {
  const lastName = name.trim().split(' ').pop();
  return `Hi ${name}! You're registered for Fête de Marquette 2026 Operations! 🎉\n\nWorker App: https://fdm2026.netlify.app/field\n\nSign in with your last name: ${lastName}\n\n📱 Add to home screen for quick access.\n\nSee you at the fest! 🎶\n— Fête de Marquette Operations\n\nReply STOP to unsubscribe.`;
};

function normalizePhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (p.startsWith('+')) return p;
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

  // Build compact day+time format: "Th 16-23 F 16-23 S 12-23 SU 10-21"
  // payload.work_days = [{id:'thu',start:16,end:23}, ...]  OR  ['thu','fri',...]
  // payload.shiftStart/shiftEnd = may also be passed as separate fields
  let normalizedDays = '';
  if (Array.isArray(days) && days.length > 0 && typeof days[0] === 'object') {
    // Rich format: [{id, start, end}]
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
    // Simple string array — build without times
    const abbrevMap = {thu:'Th', fri:'F', sat:'S', sun:'SU'};
    const abbrev = days.map(d => abbrevMap[d.toLowerCase()] || d);
    normalizedDays = days.length === 4 ? 'EVERYDAY' : abbrev.join(' ');
  } else {
    normalizedDays = days || 'EVERYDAY';
  }

  // Normalize Location — "All Areas" → "FULL FEST GROUNDS"
  let normalizedLocation = location || '';
  if (normalizedLocation.toLowerCase().includes('all area')) {
    normalizedLocation = 'FULL FEST GROUNDS';
  }

  // Build Airtable fields using updated field names
  const fields = {
    Name:     name,
    FullName: name,
    Role:     role,
    Phone:    phone,
    Status:   'Approved',
  };

  if (normalizedLocation) fields.Location  = normalizedLocation;
  if (groupme)            fields.GroupMEGPName = groupme;  // renamed field
  if (smsConsent !== undefined) fields.SMSConsent = smsConsent ? 'Yes' : 'No';
  if (normalizedDays)     fields.Days      = normalizedDays;
  if (shiftStart)         fields.ShiftStart = shiftStart;
  if (shiftEnd)           fields.ShiftEnd   = shiftEnd;

  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (!airtableRes.ok) {
      const err = await airtableRes.text();
      console.error('Airtable error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save', detail: err }) };
    }

    const record = await airtableRes.json();

    // Send approval SMS via Messaging Service (A2P compliant)
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone && smsConsent) {
      try {
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            To: normalizedPhone,
            MessagingServiceSid: MESSAGING_SID,
            Body: approvalSMS(name)
          }).toString()
        });
      } catch(e) {
        console.log('SMS error:', e.message);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, approved: true, recordId: record.id }) };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
