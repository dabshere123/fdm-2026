// send-scheduled.js
// Netlify scheduled function — runs every minute
// Checks ScheduledMessages table and fires any messages due
// Schedule: set in netlify.toml as "* * * * *"

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN_  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;

const GROUPME_BOTS = {
  all_staff: '98b725b13c73172ca29fc3cc1e',
  admin:     'e00d52092cbeee4126e1c47f2e',
  medical:   '18679f837dbeab3effa96a2471',
  bar_stage: 'fe4a796611de5dbb94be8772b8',
  financial: '6e40448c62350a4f807aab679b',
  restock:   'e86ef1a3c4a49b36b9f04b0b98',
  maintenance:'7929442cf4989bfca533c419ee',
  vendors:   '', // add vendor bot ID when available
};

async function sendGroupMe(botId, message) {
  if (!botId) return;
  await fetch('https://api.groupme.com/v3/bots/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id: botId, text: message })
  });
}

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN_}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }).toString()
  });
}

async function sendVoice(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN_}`).toString('base64');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" rate="90%">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Say><Pause length="1"/><Say voice="alice" rate="90%">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Say></Response>`;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Twiml: twiml }).toString()
  });
}

exports.handler = async () => {
  const now = new Date();
  const fired = [];

  try {
    // Fetch pending scheduled messages due now or overdue
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/ScheduledMessages?filterByFormula=AND({Status}="Pending",{SendAt}<="${now.toISOString()}")&pageSize=50`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    const records = data.records || [];

    for (const record of records) {
      const { Message, Channels, SMSRecipients, SendAt, Label } = record.fields;
      
      try {
        // Send GroupMe
        const channels = (Channels || '').split(',').map(c=>c.trim()).filter(Boolean);
        for (const ch of channels) {
          const botId = GROUPME_BOTS[ch];
          if (botId) await sendGroupMe(botId, `${Label ? Label+'\n\n' : ''}${Message}`);
        }

        // Send SMS + Voice to recipients
        const phones = (SMSRecipients || '').split(',').map(p=>p.trim()).filter(Boolean);
        for (const phone of phones) {
          await sendSMS(phone, `FDM 2026${Label?' — '+Label:''}\n\n${Message}`);
          await sendVoice(phone, `Fete de Marquette announcement. ${Message}`);
        }

        // Mark as Sent in Airtable
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/ScheduledMessages/${record.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Status: 'Sent', SentAt: now.toISOString() } })
        });

        fired.push(Label || Message.slice(0, 40));
      } catch (e) {
        console.error(`Failed to send ${record.id}:`, e.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ fired: fired.length, messages: fired }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
