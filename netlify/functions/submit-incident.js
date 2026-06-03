// submit-incident.js
// Saves incident report to Airtable and emails Admin
// POST body: { callId, type, location, problem, patientDescription, requestedBy, respondingUnit, interventions, disposition, narrative, notes, openedAt }

const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Incidents';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const ADMIN_EMAIL = 'dabshere@gmail.com';

function generateIncidentNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 900) + 100;
  return `FDM-2026-${month}${day}-${seq}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const {
    callId, type, location, problem, patientDescription,
    requestedBy, respondingUnit, interventions, disposition,
    narrative, notes, openedAt
  } = JSON.parse(event.body || '{}');

  const incidentNumber = generateIncidentNumber();
  const closedAt = new Date().toISOString();

  // Calculate duration
  let duration = '';
  if (openedAt) {
    const ms = new Date(closedAt) - new Date(openedAt);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  try {
    // Save to Airtable
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          IncidentNumber: incidentNumber,
          Type: type || '',
          Location: location || '',
          Problem: problem || '',
          PatientDescription: patientDescription || '',
          RequestedBy: requestedBy || '',
          RespondingUnit: respondingUnit || '',
          Interventions: interventions || '',
          Disposition: disposition || '',
          Narrative: narrative || '',
          Notes: notes || '',
          OpenedAt: openedAt || '',
          ClosedAt: closedAt,
          Duration: duration,
          CallId: callId || '',
        }
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    // Send email via Netlify's built-in email (or log for now)
    console.log(`Incident Report ${incidentNumber} saved — ${type} at ${location}`);

    // Build email body
    const emailBody = `
FÊTE DE MARQUETTE 2026 — INCIDENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident #: ${incidentNumber}
Date/Time Opened: ${openedAt ? new Date(openedAt).toLocaleString() : 'N/A'}
Date/Time Closed: ${new Date(closedAt).toLocaleString()}
Duration: ${duration}

INCIDENT DETAILS
Type: ${type}
Location: ${location}
Problem: ${problem}
Patient Description: ${patientDescription || 'N/A'}

RESPONSE
Responding Unit: ${respondingUnit}
Requested By: ${requestedBy}

INTERVENTIONS
${interventions || 'None documented'}

DISPOSITION
${disposition}

NARRATIVE
${narrative || 'None provided'}

NOTES
${notes || 'None'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fête de Marquette Operations
    `.trim();

    // Send via Twilio SMS to admin as fallback notification
    try {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `📋 Incident Report Filed\n${incidentNumber}\n${type} — ${location}\nUnit: ${respondingUnit}\nDisposition: ${disposition}`,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: '+16082289692'
      });
    } catch(smsErr) {
      console.log('SMS notification error:', smsErr.message);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, incidentNumber, id: data.id, emailBody })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
