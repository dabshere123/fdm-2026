// register-staff.js
// Saves registration to Airtable and fires approval SMS
// POST body: { name, role, location, phone, days, groupme, code }

const twilio = require('twilio');

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

const APPROVAL_CODES = ['FDM2026', 'FETE26', 'MARQUETTE'];

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_MSG_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

function generateUsername(name) {
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name.replace(/\s/g, '').slice(0, 10);
  const first = parts[0][0].toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).toLowerCase();
  return `${first}${last}`;
}

const approvalSMS = (name) => {
  const lastName = name.trim().split(' ').pop();
  return `Hi ${name}! You're registered for Fête de Marquette 2026 Operations! 🎉

Worker App: https://fdm2026.netlify.app/field

To sign in, enter your last name: ${lastName}

📱 Add to home screen for quick access:
  iPhone: Share → Add to Home Screen
  Android: Menu → Add to Home Screen

See you at the fest! 🎶
— Fête de Marquette Operations

Reply STOP to unsubscribe.`;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { name, role, location, phone, days, groupme, code, shiftStart, shiftEnd, smsConsent } = JSON.parse(event.body || '{}');

  if (!name || !phone || !role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' })
    };
  }

  const approved = APPROVAL_CODES.includes((code || '').toUpperCase().trim());
  const username = generateUsername(name);
  const password = '1234';

  // Save to Airtable
  try {
    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Name: name,
          Role: role,
          Location: location || '',
          Phone: phone,
          Days: Array.isArray(days) ? days.join(', ') : days || '',
          ShiftStart: shiftStart || '',
          ShiftEnd: shiftEnd || '',
          SMSConsent: smsConsent ? 'Yes' : 'No',
          GroupMe: groupme || '',
          Username: username,
          Password: password,
          Status: approved ? 'Approved' : 'Pending',
          ApprovalCode: code || '',
          RegisteredAt: new Date().toISOString()
        }
      })
    });

    if (!airtableRes.ok) {
      const err = await airtableRes.text();
      console.error('Airtable error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save to Airtable' }) };
    }

    const record = await airtableRes.json();

    // Fire approval SMS if approved
    if (approved) {
      const client = twilio(TWILIO_SID, TWILIO_AUTH);
      const msgParams = {
        body: approvalSMS(name),
        to: phone
      };
      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        msgParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        msgParams.from = process.env.TWILIO_PHONE_NUMBER;
      }
      await client.messages.create(msgParams);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        approved,
        username: approved ? username : null,
        recordId: record.id
      })
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
