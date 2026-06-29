// send-mpd-confirmation.js
// Called by hub form OR Airtable automation when officer is added/activated
const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function formatHour(h) {
  if (!h || h === '0' || h === 0) return null;
  const num = parseFloat(h);
  if (!num) return null;
  // Hours over 24 = next morning
  const adjusted = num > 24 ? num - 24 : num;
  const suffix = num > 24 ? ' (next morning)' : '';
  const period = adjusted >= 12 ? 'PM' : 'AM';
  const hour12 = adjusted % 12 === 0 ? 12 : Math.floor(adjusted % 12);
  const mins = (adjusted % 1) !== 0 ? ':' + String(Math.round((adjusted % 1) * 60)).padStart(2,'0') : '';
  return `${hour12}${mins} ${period}${suffix}`;
}

function buildSchedule(fields) {
  const days = [
    { label: 'Thursday July 10',  start: fields.thuStart, end: fields.thuEnd },
    { label: 'Friday July 11',    start: fields.friStart, end: fields.friEnd },
    { label: 'Saturday July 12',  start: fields.satStart, end: fields.satEnd },
    { label: 'Sunday July 13',    start: fields.sunStart, end: fields.sunEnd },
  ];
  const lines = days
    .filter(d => d.start || d.end)
    .map(d => {
      const s = formatHour(d.start);
      const e = formatHour(d.end);
      if (s && e) return `  ${d.label}: ${s} – ${e}`;
      if (s) return `  ${d.label}: Starting ${s}`;
      if (e) return `  ${d.label}: Until ${e}`;
      return null;
    })
    .filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, phone, thuStart, thuEnd, friStart, friEnd, satStart, satEnd, sunStart, sunEnd } = body;

    if (!name || !phone) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name and phone required' }) };

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    const schedule = buildSchedule({ thuStart, thuEnd, friStart, friEnd, satStart, satEnd, sunStart, sunEnd });

    const scheduleLine = schedule
      ? `\n\nYour scheduled shifts:\n${schedule}`
      : '';

    const sms = `Hello ${name.split(' ')[0]} — you have been added as an MPD contact for Fête de Marquette 2026 (July 9–12, McPike Park, Madison).${scheduleLine}\n\nIf you receive an alert from this number during the festival, please reply ACK to acknowledge.\n\nThank you!\n— FDM 2026`;

    if (!TWILIO_SID || !TWILIO_AUTH) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Twilio not configured', sms }) };
    }

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: formattedPhone, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: sms }).toString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: formattedPhone }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
