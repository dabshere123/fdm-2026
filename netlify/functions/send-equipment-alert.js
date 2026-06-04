const twilio = require('twilio');

const MESSAGES = {
  pre_broadcast: () =>
    `Hi team! This is Fête de Marquette Operations. A friendly reminder to stop by the festival office to pick up your radio and/or credit card reader before your shift begins. See you out there!\n\nReply STOP to opt out.`,

  pre_followup: (name) =>
    `Hi ${name}, this is Fête de Marquette Operations. It looks like your equipment hasn't been picked up yet. Please stop by the festival office as soon as possible to grab your radio and/or credit card reader(s). Thanks!\n\nReply STOP to opt out.`,

  post_broadcast: () =>
    `Hi team! Fête de Marquette is wrapping up for the night. Please return your radio and/or credit card reader to the festival office within the next 30 minutes. Thank you for a great night!\n\nReply STOP to opt out.`,

  post_followup: (name) =>
    `Hi ${name}, this is Fête de Marquette Operations. We still have your equipment on record. Please return your radio and/or credit card reader to the festival office as soon as possible. Thank you!\n\nReply STOP to opt out.`,
};

const VOICE_SCRIPTS = {
  pre_followup: (name) =>
    `Hi ${name}, this is Fête de Marquette Operations. It looks like your equipment hasn't been picked up yet. Please stop by the festival office as soon as possible to grab your radio and/or credit card reader. Thanks!`,

  post_followup: (name) =>
    `Hi ${name}, this is Fête de Marquette Operations. We still have your equipment on record. Please return your radio and/or credit card reader to the festival office as soon as possible. Thank you!`,
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { type, recipients, message: customMessage } = JSON.parse(event.body || '{}');

  if (!type || !recipients || !Array.isArray(recipients)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: type, recipients' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const results = [];
  const errors = [];

  for (const recipient of recipients) {
    const { name, phone } = recipient;
    if (!phone) continue;

    const smsBody = type === 'custom'
      ? customMessage
      : MESSAGES[type]?.(name) || customMessage;

    const voiceScript = VOICE_SCRIPTS[type]?.(name);

    try {
      const sms = await client.messages.create({
        body: smsBody,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: phone
      });

      const result = { name, phone, smsSid: sms.sid };

      if (voiceScript && (type === 'pre_followup' || type === 'post_followup')) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">${voiceScript}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">${voiceScript}</Say>
</Response>`;

        const call = await client.calls.create({
          twiml,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
        result.callSid = call.sid;
      }

      results.push(result);
    } catch (err) {
      errors.push({ name, phone, error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: true, sent: results.length, errors, results })
  };
};
