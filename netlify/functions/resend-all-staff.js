// resend-all-staff.js — sends onboarding text to all approved staff
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function fmtPhone(p) {
  const d = String(p||'').replace(/\D/g,'');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Fetch all approved staff
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const staff = (data.records || []).map(r => ({
      name: r.fields.Name1 || r.fields.Name || 'Team',
      phone: fmtPhone(r.fields.Phone),
    })).filter(s => s.phone);

    if (!TWILIO_SID || !TWILIO_AUTH) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: 0, message: 'Twilio not configured' }) };
    }

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    let sent = 0;
    let failed = 0;
    const failures = [];

    for (const member of staff) {
      const message = `FDM 2026 — Hi ${member.name.split(' ')[0]}! You are on the crew for Fete de Marquette July 9-12 at McPike Park Madison.\n\nWorker app:\nfdm2026.netlify.app/field\n\nConfirm your role:\nfdm2026.netlify.app/rsvp\n\nSee you at orientation!\n— Devin`;

      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: member.phone, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: message }).toString()
        });
        const d = await r.json();
        if (d.sid) { sent++; }
        else { failed++; failures.push(`${member.name}: ${d.message}`); }
      } catch(e) {
        failed++;
        failures.push(`${member.name}: ${e.message}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, total: staff.length, sent, failed, failures }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
