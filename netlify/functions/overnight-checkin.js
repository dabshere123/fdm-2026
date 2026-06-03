// overnight-checkin.js
// Logs overnight crew arrival and alerts Admin
// POST body: { crewMember, eventDay }

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'OvernightReports';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const ADMIN_PHONE = '+16082289692';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { crewMember, eventDay } = JSON.parse(event.body || '{}');

  if (!crewMember) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing crewMember' }) };
  }

  const now = new Date().toISOString();

  try {
    // Create overnight report record
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          CrewMember: crewMember,
          CheckInTime: now,
          ShiftStart: now,
          EventDay: eventDay || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          Status: 'Active',
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    // Alert Admin via SMS
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      await client.messages.create({
        body: `🌙 Overnight crew has arrived!\n${crewMember} checked in at ${time}.\nGo meet them for the handoff.`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: ADMIN_PHONE
      });
    } catch(smsErr) {
      console.log('SMS error:', smsErr.message);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, id: data.id, checkInTime: now })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
