// auto-clear-staff.js
// Netlify scheduled function — runs every 30 minutes
// Checks Staff table for anyone whose ShiftEnd has passed and deletes them
// Schedule: set in netlify.toml as "*/30 * * * *"

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const ADMIN2_PHONE   = '+16082289692';

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }).toString()
  });
}

// Parse time string like "10:30 PM" or "22:30" to today's Date object
function parseShiftTime(timeStr) {
  if (!timeStr) return null;
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });

  // Try parsing as "H:MM AM/PM"
  const ampm = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const d = new Date(`${today} ${h}:${String(m).padStart(2,'0')}:00`);
    return d;
  }

  // Try parsing as "HH:MM" 24hr
  const military = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (military) {
    const d = new Date(`${today} ${military[1]}:${military[2]}:00`);
    return d;
  }

  return null;
}

exports.handler = async () => {
  const now = new Date();
  const deleted = [];
  const errors = [];

  try {
    // Fetch all staff with ShiftEnd set
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff?filterByFormula=AND({ShiftEnd}!="",{Status}="Approved")&pageSize=100`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const records = data.records || [];

    for (const record of records) {
      const { Name, ShiftEnd, Role } = record.fields;
      const shiftEndTime = parseShiftTime(ShiftEnd);

      if (!shiftEndTime) continue;

      // If shift ended more than 15 minutes ago, delete
      const diffMins = (now - shiftEndTime) / 60000;
      if (diffMins >= 15) {
        try {
          await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff/${record.id}`,
            { method: 'DELETE', headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
          );
          deleted.push({ name: Name, role: Role, shiftEnd: ShiftEnd });
          console.log(`Auto-deleted: ${Name} (${Role}) — shift ended ${ShiftEnd}`);
        } catch (e) {
          errors.push(`Failed to delete ${Name}: ${e.message}`);
        }
      }
    }

    // SMS summary to Admin if anyone was deleted
    if (deleted.length > 0) {
      const summary = `FDM Auto-Clear: ${deleted.length} staff removed after shift end.\n${deleted.map(d => `• ${d.name} (${d.role}) — ended ${d.shiftEnd}`).join('\n')}`;
      await sendSMS(ADMIN2_PHONE, summary);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ deleted: deleted.length, names: deleted.map(d => d.name), errors })
    };
  } catch (err) {
    console.error('auto-clear-staff error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
