// submit-incident.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Incidents';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

function generateIncidentNumber() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 900) + 100;
  return `FDM-2026-${month}${day}-${seq}`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { callId, type, location, problem, patientDescription, requestedBy, respondingUnit, interventions, disposition, narrative, notes, openedAt } = body;

  const incidentNumber = generateIncidentNumber();
  const closedAt = new Date().toISOString();

  let duration = '';
  if (openedAt) {
    try {
      const ms = new Date(closedAt) - new Date(openedAt);
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    } catch(e) {}
  }

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
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
        OpenedAt: openedAt ? new Date(openedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        ClosedAt: new Date(closedAt).toISOString().split('T')[0],
        Duration: duration,
        CallId: callId || '',
      }
    })
  });

  const data = await res.json();
  console.log('Airtable status:', res.status, JSON.stringify(data).slice(0, 400));

  if (!res.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: data.error?.message || 'Airtable error', details: data }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, incidentNumber, id: data.id }) };
};
