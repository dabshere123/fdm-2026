// resend-broadcast.js
// Scheduled every 1 min — resends broadcast to anyone who hasn't replied YES
// Stops resending after 2 hours or when everyone confirms

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;
const MAX_AGE_MS     = 2 * 60 * 60 * 1000; // 2 hours max
const MIN_WAIT_MS    = 60 * 1000;           // minimum 1 min between resends

exports.handler = async (event) => {
  console.log('resend-broadcast: checking for unconfirmed recipients...');
  const now = Date.now();
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');

  try {
    // Fetch all unconfirmed queue entries
    const formula = encodeURIComponent(`AND({Confirmed}="No",{SentAtISO}!="")`);
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue?filterByFormula=${formula}`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const unconfirmed = data.records || [];

    if (unconfirmed.length === 0) {
      console.log('All confirmed or no active broadcasts');
      return { statusCode: 200, body: 'Nothing to resend' };
    }

    let resent = 0;
    let skipped = 0;

    for (const record of unconfirmed) {
      const sentAt = new Date(record.fields.SentAtISO).getTime();
      const age = now - sentAt;
      const lastResent = record.fields.LastResentISO ? new Date(record.fields.LastResentISO).getTime() : sentAt;
      const timeSinceLastSend = now - lastResent;

      // Skip if too old (>2 hours) or sent too recently (<1 min)
      if (age > MAX_AGE_MS) {
        // Mark as expired
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue/${record.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Confirmed: 'Expired' } })
        });
        skipped++;
        continue;
      }

      if (timeSinceLastSend < MIN_WAIT_MS) { skipped++; continue; }

      const phone = record.fields.Phone;
      const message = record.fields.Message;

      // Resend SMS
      try {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: phone, MessagingServiceSid: MESSAGING_SID || TWILIO_FROM, Body: message }).toString()
        });

        // Update last resent time
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue/${record.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: {
            LastResentISO: new Date().toISOString(),
            ResendCount: (record.fields.ResendCount || 0) + 1,
          }})
        });

        resent++;
        console.log(`Resent to ${phone} (attempt #${(record.fields.ResendCount || 0) + 1})`);
      } catch(e) { console.log(`Error resending to ${phone}:`, e.message); }
    }

    console.log(`resend-broadcast: resent=${resent} skipped=${skipped}`);
    return { statusCode: 200, body: JSON.stringify({ resent, skipped }) };

  } catch(e) {
    console.error('resend-broadcast error:', e.message);
    return { statusCode: 500, body: e.message };
  }
};
