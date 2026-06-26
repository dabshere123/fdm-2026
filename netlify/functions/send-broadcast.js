// send-broadcast-tracked.js
// Sends broadcast SMS to all staff AND saves to BroadcastQueue for confirmation tracking
// POST { message, broadcastId, type }

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;

function fmtPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return String(p);
  return null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { message, broadcastId, type } = JSON.parse(event.body || '{}');
  if (!message) return { statusCode: 400, headers, body: 'Missing message' };

  const bId = broadcastId || `BCAST-${Date.now()}`;
  const ts = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');

  // Fetch all approved staff phones
  let phones = [];
  try {
    let records = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff${offset ? `?offset=${offset}` : ''}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
      const data = await res.json();
      records = records.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    phones = [...new Set(
      records
        .filter(r => r.fields.Status === 'Approved' && r.fields.Phone && r.fields.SMSConsent === 'Yes')
        .map(r => fmtPhone(r.fields.Phone))
        .filter(Boolean)
    )];
    console.log(`Sending broadcast to ${phones.length} phones`);
  } catch(e) { console.log('Staff fetch error:', e.message); }

  // Send SMS + save to BroadcastQueue
  const results = await Promise.allSettled(phones.map(async phone => {
    // Send SMS
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, MessagingServiceSid: MESSAGING_SID, Body: message }).toString()
    });

    // Save to BroadcastQueue
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/BroadcastQueue`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        BroadcastID: bId,
        Phone: phone,
        Message: message,
        Type: type || 'broadcast',
        SentAt: ts,
        SentAtISO: new Date().toISOString(),
        Confirmed: 'No',
      }})
    });
  }));

  const sent = results.filter(r => r.status === 'fulfilled').length;
  console.log(`Broadcast sent: ${sent}/${phones.length}`);

  // Save to Messages table as alert — appears in all chat inboxes
  if (process.env.AIRTABLE_TOKEN) {
    const AT_BASE = 'appUVEp7kO9NeeJh0';
    await fetch(`https://api.airtable.com/v0/${AT_BASE}/Messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { FromName:'Admin', FromRole:'Admin', Channel:'AllStaff', Message:message, SentAt:new Date().toISOString(), IsAlert:'Yes', IsDM:'No', IsFirst:'No' }})
    }).catch(() => {});
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent, broadcastId: bId }) };
};
