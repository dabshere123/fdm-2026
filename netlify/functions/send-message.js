// send-message.js — supports single channel or multi-channel broadcast
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE    = '+16082289692';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { fromName, fromRole, message, isDM, toName, toPhone, threadId, isAlert } = body;

    // channels can be a single string or an array
    const channels = Array.isArray(body.channels) ? body.channels : [body.channel || 'AllStaff'];
    const sentAt   = new Date().toISOString();
    // Store all recipient channels as a comma-separated string in each record
    const recipients = channels.join(',');

    // Create one Airtable record per channel so each channel feed sees it
    const ids = [];
    for (const ch of channels) {
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          FromName:   fromName || '',
          FromRole:   fromRole || '',
          Channel:    ch,
          Recipients: recipients,     // all channels this went to
          Message:    message || '',
          SentAt:     sentAt,
          ThreadID:   threadId || '',
          IsFirst:    isDM ? 'Yes' : 'No',
          IsDM:       isDM ? 'Yes' : 'No',
          ToName:     toName || '',
          IsAlert:    isAlert ? 'Yes' : 'No',
        }})
      });
      const data = await res.json();
      ids.push(data.id);
    }

    // SMS alert to admin for Admin or Medical channels
    const notifyChannels = ['Admin', 'AdminMed'];
    if (channels.some(c => notifyChannels.includes(c)) && fromName !== 'Admin') {
      const smsBody = `💬 ${channels.filter(c=>notifyChannels.includes(c)).join('+')} msg from ${fromRole||fromName}:\n${message}`;
      if (TWILIO_SID && TWILIO_AUTH && MESSAGING_SID) {
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: ADMIN_PHONE, MessagingServiceSid: MESSAGING_SID || TWILIO_FROM, Body: smsBody }).toString()
        }).catch(() => {});
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, ids }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
