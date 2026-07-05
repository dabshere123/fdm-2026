// sms-webhook.js — handles incoming ACK from MPD officers AND all workers
// Twilio setup: Phone Numbers → your number → Messaging → A Message Comes In
// → Webhook URL: https://fdm2026.netlify.app/.netlify/functions/sms-webhook
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'text/xml', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = Object.fromEntries(new URLSearchParams(event.body || '').entries());
    const fromPhone = (body.From || '').replace(/[^0-9]/g, '').slice(-10);
    const msgBody  = (body.Body || '').trim().toUpperCase();
    const WEATHER_ACK_KEYWORDS = ['ACK WA', 'AWA', 'ACK WEATHER', 'ACK WEATHER ALERT'];
    const isWeatherAck = WEATHER_ACK_KEYWORDS.includes(msgBody);

    if (msgBody !== 'ACK' && !isWeatherAck) {
      // Only handle ACK / weather-alert ACK — ignore everything else silently
      return { statusCode: 200, headers, body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>' };
    }

    const now = new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit'
    });

    // Check MPD Officers first
    let personName = null;
    let personRole = null;
    let replyMsg = '';

    const mpdRes = await fetch(
      `https://api.airtable.com/v0/${BASE}/MPDOfficers?maxRecords=50`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const mpdData = await mpdRes.json();
    const officer = (mpdData.records || []).find(r => {
      const p = String(r.fields.PhoneNumber || '').replace(/[^0-9]/g, '').slice(-10);
      return p === fromPhone;
    });

    if (officer) {
      personName = officer.fields.Name || 'MPD Officer';
      personRole = 'MPD';
      // Update officer LastAck
      await fetch(`https://api.airtable.com/v0/${BASE}/MPDOfficers/${officer.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { LastAck: now } })
      }).catch(() => {});
      replyMsg = isWeatherAck
        ? `⛈✅ Weather alert acknowledged, ${personName.split(' ')[0]} (MPD). Please also confirm on the two-way radio with your location. — FDM 2026`
        : `✅ Acknowledged, ${personName.split(' ')[0]}. En route to McPike Park — FDM 2026`;
    } else {
      // Check Staff table
      const staffRes = await fetch(
        `https://api.airtable.com/v0/${BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const staffData = await staffRes.json();
      const staffMember = (staffData.records || []).find(r => {
        const p = String(r.fields.Phone || '').replace(/[^0-9]/g, '').slice(-10);
        return p === fromPhone;
      });

      if (staffMember) {
        personName = staffMember.fields.Name1 || 'Staff';
        personRole = staffMember.fields.Role || 'Staff';
        replyMsg = isWeatherAck
          ? `⛈✅ Weather alert acknowledged, ${personName.split(' ')[0]} (${personRole}). Please also confirm on the two-way radio with your location. — FDM 2026`
          : `✅ ACK received, ${personName.split(' ')[0]}. — FDM 2026`;
      } else {
        // Unknown sender — just reply
        personName = `Unknown (${body.From})`;
        personRole = 'Unknown';
        replyMsg = isWeatherAck
          ? `⛈✅ Weather alert acknowledged. We don't have your number on file for auto-name/role — please also confirm on the two-way radio with your name and location. — FDM 2026`
          : `✅ ACK received — FDM 2026`;
      }
    }

    // Post acknowledgment to admin chat so hub shows it
    const channel = personRole === 'MPD' ? 'Admin' : 'AllStaff';
    const icon = isWeatherAck ? '⛈✅' : (personRole === 'MPD' ? '🚔' : '✅');
    const chatLabel = isWeatherAck ? 'acknowledged the WEATHER ALERT' : 'acknowledged';
    await fetch(`https://api.airtable.com/v0/${BASE}/Messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        FromName: personName,
        FromRole: personRole,
        Channel: channel,
        Message: `${icon} ${personName} (${personRole}) ${chatLabel} at ${now}`,
        SentAt: new Date().toISOString(),
        IsAlert: 'No', IsDM: 'No', IsFirst: 'No',
      }})
    }).catch(() => {});

    // Forward ACK to Devin's phone so he gets a personal text
    const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
    const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
    const DEVIN_PHONE = '+16082289692';
    if (TWILIO_SID && TWILIO_AUTH) {
      const fwdMsg = isWeatherAck
        ? `⛈✅ WEATHER ACK: ${personName} (${personRole}) acknowledged at ${now}`
        : personRole === 'MPD'
        ? `🚔 MPD ACK: ${personName} acknowledged the alert at ${now}`
        : `✅ Staff ACK: ${personName} acknowledged at ${now}`;
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: DEVIN_PHONE, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: fwdMsg }).toString()
      }).catch(() => {});
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMsg}</Message></Response>`;
    return { statusCode: 200, headers, body: twiml };

  } catch (e) {
    console.error('sms-webhook error:', e.message);
    return { statusCode: 200, headers, body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>' };
  }
};
