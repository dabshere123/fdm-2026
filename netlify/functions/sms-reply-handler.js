// sms-reply-handler.js
// Twilio inbound SMS webhook — when someone replies YES, marks them confirmed in BroadcastQueue

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const params = new URLSearchParams(event.body || '');
  const from   = params.get('From') || '';
  const body   = (params.get('Body') || '').trim().toUpperCase();
  const twiml  = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  console.log(`Inbound SMS from ${from}: "${body}"`);

  if (body === 'YES' || body === 'YES.') {
    const ts = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

    try {
      // Find all unconfirmed BroadcastQueue records for this phone
      const formula = encodeURIComponent(`AND({Phone}="${from}",{Confirmed}="No")`);
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue?filterByFormula=${formula}`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const records = data.records || [];

      // Mark all as confirmed
      await Promise.all(records.map(r =>
        fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue/${r.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Confirmed: 'Yes', ConfirmedAt: ts } })
        })
      ));

      console.log(`✅ Confirmed ${records.length} broadcast(s) for ${from} at ${ts}`);
    } catch(e) {
      console.log('Confirmation error:', e.message);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: twiml,
  };
};
