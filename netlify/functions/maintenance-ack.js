const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const FROM        = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function normalizePhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return p;
  return null;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { reporterPhone, reporterName, urgency, location, problem, acknowledgedBy } = JSON.parse(event.body || '{}');
    if (!urgency) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing urgency' }) };

    const phone = normalizePhone(reporterPhone);
    if (!phone) return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: 'No valid phone to notify' }) };

    const firstName = (reporterName || 'there').trim().split(' ')[0];

    const messages = {
      urgent:   `Hi ${firstName} — maintenance has received your request at ${location} and is responding right now.\n\nIssue: ${problem}\n\n— FDM 2026 Operations`,
      soon:     `Hi ${firstName} — maintenance has received your request at ${location}. We're not able to respond immediately but will stop by as soon as possible.\n\nIssue: ${problem}\n\n— FDM 2026 Operations`,
      log:      `Hi ${firstName} — your maintenance request at ${location} has been logged and will be addressed after the festival. Thank you for reporting it.\n\nIssue: ${problem}\n\n— FDM 2026 Operations`,
    };

    const sms = messages[urgency] || messages.log;

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: phone,
        MessagingServiceSid: FROM || TWILIO_FROM,
        Body: sms
      }).toString()
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
