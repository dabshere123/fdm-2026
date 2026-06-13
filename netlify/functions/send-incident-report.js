// send-incident-report.js
// Formats incident report as Google Doc-style HTML and emails to feteops@gmail.com
// POST body: { callId, type, location, problem, patientDescription, respondingUnit,
//              interventions, disposition, narrative, notes, openedAt, incidentNumber }

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL   = 'feteops@gmail.com';
const TO_EMAIL     = 'feteops@gmail.com';
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

function formatDate(iso) {
  if (!iso) return new Date().toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' });
  try { return new Date(iso).toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' }); }
  catch { return iso; }
}

function buildHTML(data) {
  const typeColors = { medical:'#be185d', fire:'#dc2626', security:'#1d4ed8', walk_in:'#7c3aed' };
  const typeLabels = { medical:'Medical Incident', fire:'Fire / Life Safety', security:'Security Incident', walk_in:'Walk-In Patient' };
  const color = typeColors[data.type] || '#374151';
  const label = typeLabels[data.type] || 'Incident';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; margin: 0; padding: 24px; color: #111827; }
  .wrapper { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: ${color}; padding: 24px 32px; color: #fff; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; }
  .header .meta { font-size: 13px; opacity: 0.85; margin-top: 6px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.06em; text-transform: uppercase; }
  .body { padding: 24px 32px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; }
  .field { display: flex; gap: 12px; margin-bottom: 8px; }
  .field-label { font-size: 12px; font-weight: 700; color: #6b7280; min-width: 140px; flex-shrink: 0; }
  .field-value { font-size: 14px; color: #111827; }
  .narrative { background: #f3f4f6; border-left: 4px solid ${color}; border-radius: 4px; padding: 14px 16px; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px; font-size: 12px; color: #9ca3af; }
  .incident-number { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: 0.06em; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="badge">Fête de Marquette 2026 — Operations</div>
    <div class="incident-number">${data.incidentNumber || 'INC-' + Date.now().toString().slice(-6)}</div>
    <h1>${label} Report</h1>
    <div class="meta">Generated: ${formatDate(new Date().toISOString())} · By: ${data.respondingUnit || 'Operations'}</div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">Incident Details</div>
      <div class="field"><div class="field-label">Date / Time</div><div class="field-value">${formatDate(data.openedAt)}</div></div>
      <div class="field"><div class="field-label">Type</div><div class="field-value">${label}</div></div>
      <div class="field"><div class="field-label">Location</div><div class="field-value">${data.location || '—'}</div></div>
      <div class="field"><div class="field-label">Problem</div><div class="field-value">${data.problem || '—'}</div></div>
      <div class="field"><div class="field-label">Reported By</div><div class="field-value">${data.requestedBy || '—'}</div></div>
      <div class="field"><div class="field-label">Responding Unit</div><div class="field-value">${data.respondingUnit || '—'}</div></div>
    </div>

    ${data.patientDescription ? `
    <div class="section">
      <div class="section-title">Patient / Person Description</div>
      <div class="narrative">${data.patientDescription}</div>
    </div>` : ''}

    ${data.interventions ? `
    <div class="section">
      <div class="section-title">Interventions Performed</div>
      <div class="narrative">${data.interventions}</div>
    </div>` : ''}

    <div class="section">
      <div class="section-title">Disposition</div>
      <div class="field-value" style="font-size:15px;font-weight:700;color:${color}">${data.disposition || '—'}</div>
    </div>

    ${data.narrative ? `
    <div class="section">
      <div class="section-title">Narrative</div>
      <div class="narrative">${data.narrative}</div>
    </div>` : ''}

    ${data.notes ? `
    <div class="section">
      <div class="section-title">Additional Notes</div>
      <div class="narrative">${data.notes}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    Fête de Marquette 2026 · Operations Hub · fdm2026.netlify.app/hub · Incident ${data.incidentNumber || ''}
  </div>
</div>
</body>
</html>`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const data = JSON.parse(event.body || '{}');
  const typeLabels = { medical:'Medical Incident', fire:'Fire / Life Safety', security:'Security Incident', walk_in:'Walk-In Patient' };
  const label = typeLabels[data.type] || 'Incident';
  const subject = `[FDM 2026] ${label} Report — ${data.incidentNumber || ''} — ${data.location || ''}`;

  // Save to Airtable first
  try {
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/IncidentReports`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        IncidentNumber: data.incidentNumber || '',
        Type: data.type || '',
        Location: data.location || '',
        Problem: data.problem || '',
        PatientDescription: data.patientDescription || '',
        RespondingUnit: data.respondingUnit || '',
        Interventions: data.interventions || '',
        Disposition: data.disposition || '',
        Narrative: data.narrative || '',
        Notes: data.notes || '',
        OpenedAt: data.openedAt || new Date().toISOString(),
        ReportedBy: data.requestedBy || '',
        GeneratedAt: new Date().toISOString(),
      }})
    });
  } catch(e) { console.log('Airtable error:', e.message); }

  // Send email via SendGrid
  if (!SENDGRID_KEY) {
    console.log('No SENDGRID_API_KEY — skipping email');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: 'No SendGrid key' }) };
  }

  try {
    const html = buildHTML(data);
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: TO_EMAIL }] }],
        from: { email: FROM_EMAIL, name: 'FDM 2026 Operations' },
        subject,
        content: [{ type: 'text/html', value: html }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('SendGrid error:', err);
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: err }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch(e) {
    console.error('Email error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
