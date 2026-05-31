const twilio = require('twilio');

const MPD_SMS_NOTIFY = (location, situation) =>
`🚨 MPD RESPONSE REQUESTED
Fête de Marquette Operations

📍 Location: ${location}
Situation: ${situation}

Please respond promptly.
Reply YES to acknowledge.
— Fête de Marquette Operations`;

const MPD_VOICE_NOTIFY = (location, situation) =>
  `Attention Madison Police Officers — you are requested to respond to ${location} for ${situation}. Please respond promptly. This call has been initiated by Fête de Marquette Operations. Thank you.`;

const MPD_SMS_STANDDOWN = () =>
`✅ STAND DOWN
Per Fête de Marquette Operations — stand down. No response needed. Thank you!`;

const MPD_VOICE_STANDDOWN = () =>
  `Per Fête de Marquette Operations — stand down. No response needed. Thank you!`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { type, officers, location, situation } = JSON.parse(event.body || '{}');

  if (!type || !officers || !Array.isArray(officers)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: type, officers' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const results = [];
  const errors = [];

  const smsBody = type === 'notify'
    ? MPD_SMS_NOTIFY(location, situation)
    : MPD_SMS_STANDDOWN();

  const voiceScript = type === 'notify'
    ? MPD_VOICE_NOTIFY(location, situation)
    : MPD_VOICE_STANDDOWN();

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">${voiceScript}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">${voiceScript}</Say>
</Response>`;

  for (const officer of officers) {
    const { name, badge, phone } = officer;
    if (!phone) continue;

    try {
      const sms = await client.messages.create({
        body: smsBody,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: phone
      });

      const call = await client.calls.create({
        twiml,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      results.push({ name, badge, phone, smsSid: sms.sid, callSid: call.sid });
    } catch (err) {
      errors.push({ name, badge, phone, error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: true, type, sent: results.length, errors, results })
  };
};
