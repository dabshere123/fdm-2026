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

  // Normalize Days — "Everyday" / "All Days" → all 4 days
  let normalizedDays = Array.isArray(days) ? days.join(', ') : (days || '');
  const daysLower = normalizedDays.toLowerCase();
  if (daysLower.includes('every') || daysLower.includes('all day') || daysLower === 'all') {
    normalizedDays = 'Thursday, Friday, Saturday, Sunday';
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
