const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Incidents';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  console.log('submit-incident called');

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { type, location, problem, patientDescription, requestedBy, respondingUnit, interventions, disposition, notes, openedAt } = body;

  if (!disposition) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing disposition' }) };

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = Math.floor(Math.random() * 900) + 100;
  const incidentNumber = `FDM-2026-${month}${day}-${seq}`;

  const openedDate = openedAt ? new Date(openedAt).toISOString().split('T')[0] : now.toISOString().split('T')[0];
  const closedDate = now.toISOString().split('T')[0];

  let duration = '';
  if (openedAt) {
    try {
      const ms = now - new Date(openedAt);
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    } catch(e) {}
  }

  const fields = {
    IncidentNumber: incidentNumber,
    Type: type || '',
    Location: location || '',
    Problem: problem || '',
    PatientDescription: patientDescription || '',
    RequestedBy: requestedBy || '',
    RespondingUnit: respondingUnit || '',
    Interventions: interventions || '',
    Disposition: disposition || '',
    Notes: notes || '',
    OpenedAt: openedDate,
    ClosedAt: closedDate,
    Duration: duration,
  };

  console.log('Sending fields:', JSON.stringify(fields).slice(0, 400));

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  const data = await res.json();
  console.log('Airtable status:', res.status, JSON.stringify(data).slice(0, 300));

  if (!res.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: data.error?.message || 'Airtable error' }) };
  }

  // Trigger incident report email for medical/security/fire incidents
  if (['medical','walk_in','fire','security'].includes(type)) {
    try {
      const baseUrl = `https://${event.headers.host || 'fdm2026.netlify.app'}`;
      fetch(`${baseUrl}/.netlify/functions/send-incident-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentNumber, type, location, problem, patientDescription,
          respondingUnit, interventions, disposition, narrative: notes,
          notes: '', requestedBy, openedAt,
        })
      }).catch(e => console.log('Report email error:', e.message));
    } catch(e) { console.log('Report trigger error:', e.message); }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, incidentNumber, id: data.id }) };
};
