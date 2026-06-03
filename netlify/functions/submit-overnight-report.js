// submit-overnight-report.js
// Saves overnight report and emails Admin
// POST body: { id, crewMember, incidents, narrative, lostFoundItems, notes, eventDay }

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'OvernightReports';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const ADMIN_PHONE = '+16082289692';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { id, crewMember, incidents, narrative, lostFoundItems, notes, eventDay } = JSON.parse(event.body || '{}');

  if (!id && !crewMember) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id or crewMember' }) };
  }

  const now = new Date().toISOString();

  const fields = {
    ShiftEnd: now,
    CheckOutTime: now,
    Incidents: incidents || '',
    Narrative: narrative || '',
    LostFoundItems: lostFoundItems || '',
    Notes: notes || '',
    Status: 'Submitted',
  };

  try {
    let recordId = id;

    if (recordId) {
      // Update existing record
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });
    } else {
      // Create new record
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: { ...fields, CrewMember: crewMember, EventDay: eventDay || '' } })
      });
      const data = await res.json();
      recordId = data.id;
    }

    // SMS Admin
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      await client.messages.create({
        body: `☀️ Overnight report submitted!\n${crewMember} — ${eventDay}\nShift ended: ${time}\n${incidents ? `Incidents: ${incidents.slice(0,100)}` : 'No incidents'}`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: ADMIN_PHONE
      });
    } catch(smsErr) {
      console.log('SMS error:', smsErr.message);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, id: recordId })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
