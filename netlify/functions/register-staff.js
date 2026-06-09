// register-staff.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;

const approvalSMS = (name) => {
  const lastName = name.trim().split(' ').pop();
  return `Hi ${name}! You're registered for Fête de Marquette 2026 Operations! 🎉\n\nWorker App: https://fdm2026.netlify.app/field\n\nSign in with your last name: ${lastName}\n\n📱 Add to home screen for quick access.\n\nSee you at the fest! 🎶\n— Fête de Marquette Operations\n\nReply STOP to unsubscribe.`;
};

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { name, role, location, phone, days, groupme, shiftStart, shiftEnd, smsConsent } = JSON.parse(event.body || '{}');

  if (!name || !phone || !role) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Save to Airtable — only fields that exist in the table
  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Name:         name,
          Role:         role,
          Location:     location || '',
          Phone:        phone,
          Days:         Array.isArray(days) ? days.join(', ') : days || '',
          ShiftStart:   shiftStart || '',
          ShiftEnd:     shiftEnd || '',
          SMSConsent:   smsConsent ? 'Yes' : 'No',
          GroupMe:      groupme || '',
          Status:       'Approved',
          RegisteredAt: new Date().toISOString()
        }
      })
    });

    if (!airtableRes.ok) {
      const err = await airtableRes.text();
      console.error('Airtable error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to save', detail: err }) };
    }

    const record = await airtableRes.json();

    // Send approval SMS
    try {
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: phone, From: TWILIO_FROM, Body: approvalSMS(name) }).toString()
      });
    } catch(e) {
      console.log('SMS error:', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, approved: true, recordId: record.id })
    };
  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
