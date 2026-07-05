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
    const WEATHER_ACK_KEYWORDS = ['AWA', 'ACK WA', 'ACK WEATHER', 'ACK WEATHER ALERT'];
    const isWeatherAck = WEATHER_ACK_KEYWORDS.includes(msgBody);
    const CALL_ACK_MAP = {
      'ACK MED':      { types: ['medical', 'walk_in'], label: 'MEDICAL' },
      'ACK MEDICAL':  { types: ['medical', 'walk_in'], label: 'MEDICAL' },
      'ACK FIRE':     { types: ['fire'], label: 'FIRE / LIFE SAFETY' },
      'ACK SEC':      { types: ['security'], label: 'SECURITY' },
      'ACK SECURITY': { types: ['security'], label: 'SECURITY' },
    };
    const callAck = CALL_ACK_MAP[msgBody] || null;

    if (msgBody !== 'ACK' && !isWeatherAck && !callAck) {
      // Only handle ACK / weather-alert ACK / call-type ACK — ignore everything else silently
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

    // ── Medical / Fire / Security call acknowledgment ──
    // Finds the most recent still-open call of the matching type, marks it Acknowledged,
    // texts the original requester (autofill location comes from the call record itself).
    let callLocation = null;
    if (callAck) {
      try {
        const typeFormula = callAck.types.map(t => `LOWER({Type})="${t}"`).join(',');
        const callsRes = await fetch(
          `https://api.airtable.com/v0/${BASE}/ActiveMedCalls?filterByFormula=AND(OR(${typeFormula}),{Status}="Pending")&maxRecords=50`,
          { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const callsData = await callsRes.json();
        const matchingCalls = callsData.records || [];
        const targetCall = matchingCalls[matchingCalls.length - 1]; // most recently created pending call of this type

        if (targetCall) {
          callLocation = targetCall.fields.Location || 'festival grounds';
          await fetch(`https://api.airtable.com/v0/${BASE}/ActiveMedCalls/${targetCall.id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { Status: 'Acknowledged', Unit: `${personName} (text)`, AcknowledgedAt: new Date().toISOString() } })
          }).catch(() => {});

          // Notify the original requester, same as an in-app acknowledgment would
          const reqPhone = String(targetCall.fields.Phone || '').replace(/[^0-9]/g, '');
          if (reqPhone.length >= 10) {
            const fmtReq = reqPhone.length === 10 ? `+1${reqPhone}` : `+${reqPhone}`;
            const TWILIO_SID2  = process.env.TWILIO_ACCOUNT_SID;
            const TWILIO_AUTH2 = process.env.TWILIO_AUTH_TOKEN;
            const MSG_SID2     = process.env.TWILIO_MESSAGING_SERVICE_SID;
            const TWILIO_FROM2 = process.env.TWILIO_PHONE_NUMBER;
            if (TWILIO_SID2 && TWILIO_AUTH2) {
              const auth2 = Buffer.from(`${TWILIO_SID2}:${TWILIO_AUTH2}`).toString('base64');
              await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID2}/Messages.json`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth2}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ To: fmtReq, MessagingServiceSid: MSG_SID2 || TWILIO_FROM2, Body: `✅ FDM 2026 — Your ${callAck.label} request at ${callLocation} has been acknowledged by ${personName}. Help is on the way.` }).toString()
              }).catch(() => {});
            }
          }
        }
      } catch (e) { /* fall through with whatever we have */ }

      replyMsg = callLocation
        ? `✅ ${callAck.label} alert acknowledged, ${personName.split(' ')[0]} (${personRole}). Responding to ${callLocation}. Please also confirm on the two-way radio with your location. — FDM 2026`
        : `✅ ${callAck.label} alert acknowledged, ${personName.split(' ')[0]} (${personRole}). No open ${callAck.label.toLowerCase()} call found to attach this to — please also confirm on the two-way radio with your location. — FDM 2026`;
    }

    // Post acknowledgment to admin chat so hub shows it
    const channel = personRole === 'MPD' ? 'Admin' : 'AllStaff';
    const icon = callAck ? '🚨✅' : isWeatherAck ? '⛈✅' : (personRole === 'MPD' ? '🚔' : '✅');
    const chatLabel = callAck ? `acknowledged the ${callAck.label} alert${callLocation ? ' at ' + callLocation : ''}` : isWeatherAck ? 'acknowledged the WEATHER ALERT' : 'acknowledged';
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
      const fwdMsg = callAck
        ? `🚨✅ ${callAck.label} ACK: ${personName} (${personRole}) responding to ${callLocation || 'unknown location'} at ${now}`
        : isWeatherAck
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
