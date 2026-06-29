// sms-webhook.js — handles incoming SMS from MPD officers (ACK / DISREGARD)
// Configure as Twilio webhook: https://fdm2026.netlify.app/.netlify/functions/sms-webhook
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/xml',
  };

  try {
    // Parse incoming Twilio SMS
    const body = Object.fromEntries(new URLSearchParams(event.body || '').entries());
    const fromPhone = (body.From || '').replace(/[^0-9]/g, '');
    const msgBody  = (body.Body || '').trim().toUpperCase();
    const now = new Date().toLocaleString('en-US', {
      timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit',
      month: 'short', day: 'numeric'
    });

    // Find officer by phone number in Airtable
    const searchPhone = fromPhone.slice(-10); // last 10 digits
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/MPDOfficers?maxRecords=50`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const officer = (data.records || []).find(r => {
      const p = String(r.fields.Phone || '').replace(/[^0-9]/g, '').slice(-10);
      return p === searchPhone;
    });

    const officerName = officer ? (officer.fields.Name || 'Unknown Officer') : `Unknown (${body.From})`;
    let replyMsg = '';

    if (msgBody === 'ACK' || msgBody === 'ACKNOWLEDGE' || msgBody === '1') {
      // Mark officer as acknowledged in Airtable
      if (officer) {
        await fetch(`https://api.airtable.com/v0/${BASE}/MPDOfficers/${officer.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { LastAck: now, MPDStatus: 'Online' } })
        }).catch(() => {});
      }
      // Post to admin Messages so hub shows the acknowledgment
      await fetch(`https://api.airtable.com/v0/${BASE}/Messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          FromName: officerName,
          FromRole: 'MPD',
          Channel: 'Admin',
          Message: `🚔 ${officerName} acknowledged MPD alert — en route to McPike Park`,
          SentAt: new Date().toISOString(),
          IsAlert: 'No', IsDM: 'No', IsFirst: 'No',
        }})
      }).catch(() => {});
      replyMsg = `✅ Acknowledged, ${officerName.split(' ')[0]}. En route to McPike Park — FDM 2026 Admin`;

    } else if (msgBody === 'ETA' || msgBody.startsWith('ETA ')) {
      const eta = msgBody.replace('ETA','').trim() || 'unknown';
      await fetch(`https://api.airtable.com/v0/${BASE}/Messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          FromName: officerName, FromRole: 'MPD', Channel: 'Admin',
          Message: `🚔 ${officerName} ETA: ${eta === 'unknown' ? '?' : eta} min — McPike Park`,
          SentAt: new Date().toISOString(), IsAlert: 'No', IsDM: 'No', IsFirst: 'No',
        }})
      }).catch(() => {});
      replyMsg = `Got it — ETA noted. FDM 2026 Admin`;

    } else if (msgBody === 'ON SCENE' || msgBody === 'ONSCENE') {
      await fetch(`https://api.airtable.com/v0/${BASE}/Messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          FromName: officerName, FromRole: 'MPD', Channel: 'Admin',
          Message: `🚔 ${officerName} ON SCENE at McPike Park`,
          SentAt: new Date().toISOString(), IsAlert: 'No', IsDM: 'No', IsFirst: 'No',
        }})
      }).catch(() => {});
      replyMsg = `Noted — on scene confirmed. FDM 2026 Admin`;

    } else {
      // Unknown reply — give them the command list
      replyMsg = `FDM 2026 — Reply options:\nACK = Acknowledge\nETA [min] = Estimated arrival\nON SCENE = Arrived on site`;
    }

    // Send reply via Twilio TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMsg}</Message></Response>`;
    return { statusCode: 200, headers, body: twiml };

  } catch (e) {
    console.error('sms-webhook error:', e.message);
    return { statusCode: 200, headers, body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>' };
  }
};
