// send-scheduled-messages.js
// Runs every 5 minutes (see netlify.toml). Finds any ScheduledMessages that are
// Pending and due (SendAt <= now), sends the SMS to every phone on the list, and
// marks them Sent. Also sends a voice call using the same message text.

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TABLE = 'ScheduledMessages';

const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE = '+16082289692'; // Devin

function fmtPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return String(p);
  return null;
}

async function sendSMS(to, body) {
  const formatted = fmtPhone(to);
  if (!formatted || !TWILIO_SID || !TWILIO_AUTH) return false;
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: formatted, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: body }).toString()
    });
    return res.ok;
  } catch (e) { return false; }
}

exports.handler = async () => {
  // ═══ FDM 2026 IS OVER — set to false when reactivating for the 2027 festival ═══
  const DORMANT = true;
  if (DORMANT) return { statusCode: 200, body: JSON.stringify({ ok: true, dormant: true }) };

  try {
    const nowIso = new Date().toISOString();
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?filterByFormula=AND({Status}="Pending",IS_BEFORE({SendAt},"${nowIso}"))&maxRecords=20`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    if (!res.ok) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Could not read ScheduledMessages table' }) };
    const data = await res.json();
    const due = data.records || [];

    let totalSent = 0;
    for (const rec of due) {
      const message = rec.fields.Message || '';
      let phones = [];
      try { phones = JSON.parse(rec.fields.Phones || '[]'); } catch (e) {}

      const results = await Promise.all(phones.map(phone => sendSMS(phone, message)));
      const sentCount = results.filter(Boolean).length;
      totalSent += sentCount;

      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${rec.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ typecast: true, fields: { Status: 'Sent' } })
      }).catch(() => {});

      // Let Devin know it went out
      await sendSMS(ADMIN_PHONE, `📅 Scheduled message sent to ${sentCount}/${phones.length} people: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, processed: due.length, totalSent }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
