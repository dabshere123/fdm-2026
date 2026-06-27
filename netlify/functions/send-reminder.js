// send-reminder.js — sends reminder SMS to staff who haven't submitted RSVP
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE           = 'appUVEp7kO9NeeJh0';
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    // 1. Fetch all approved staff
    const staffRes = await fetch(
      `https://api.airtable.com/v0/${BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const staffData = await staffRes.json();
    const staff = (staffData.records || []).map(r => ({
      name: r.fields['Name1'] || r.fields['Name'] || '',
      phone: String(r.fields['Phone'] || '').replace(/[^0-9]/g, ''),
    })).filter(s => s.name && s.phone.length >= 10);

    // 2. Fetch all RSVP submissions (by name)
    const rsvpRes = await fetch(
      `https://api.airtable.com/v0/${BASE}/RSVPs?maxRecords=500`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const rsvpData = await rsvpRes.json();
    const submittedNames = new Set(
      (rsvpData.records || []).map(r => (r.fields['Name'] || '').toLowerCase().trim())
    );

    // 3. Filter to staff who haven't submitted
    const needReminder = staff.filter(s => !submittedNames.has(s.name.toLowerCase().trim()));

    // 4. Send reminder to each
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const results = [];

    for (const s of needReminder) {
      const firstName = s.name.split(' ')[0];
      const encodedName = encodeURIComponent(s.name.trim());
      const msg =
        `FDM 2026 — This is NOT spam\n\n` +
        `Hey ${firstName} — this is Devin Abshere reaching out personally about Fête de Marquette 2026. You're receiving this because you're part of our festival crew and I have your number on file.\n\n` +
        `I'm still waiting on your worker registration — it takes less than 2 minutes:\n\n` +
        `👉 fdm2026.netlify.app/rsvp?name=${encodedName}\n\n` +
        `Then explore:\n` +
        `📱 Worker App: fdm2026.netlify.app/field\n` +
        `📖 Staff Guide: fdm2026.netlify.app/guide\n` +
        `✅ Quiz: fdm2026.netlify.app/quiz\n\n` +
        `We'll briefly go over the app at Giant Jones on Tuesday evening, but the more familiar you are before you walk in, the better prepared you'll be when the festival starts.\n\n` +
        `Thanks for being part of the festival crew — see you at Giant Jones on Tuesday, and of course at McPike Park for the 20th anniversary of Fête de Marquette!\n\n` +
        `— Devin Abshere\nFête de Marquette 2026 Operations`;

      const to = `+1${s.phone}`;
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: to, MessagingServiceSid: MESSAGING_SID, Body: msg }).toString()
        }
      );
      const d = await res.json();
      results.push({ name: s.name, to, status: d.status || d.error_message || 'sent' });
    }

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, sent: results.length, skipped: staff.length - needReminder.length, results })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
