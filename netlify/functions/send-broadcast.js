const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { message, recipients, voiceScript, includeVoice } = JSON.parse(event.body || '{}');

  if (!message || !recipients || !Array.isArray(recipients)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: message, recipients' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const results = [];
  const errors = [];

  const twiml = voiceScript ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">${voiceScript}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">${voiceScript}</Say>
</Response>` : null;

  await Promise.allSettled(recipients.map(async (recipient) => {
    const { name, phone } = recipient;
    if (!phone) return;

    try {
      const sms = await client.messages.create({
        body: message,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: phone
      });

      const result = { name, phone, smsSid: sms.sid };

      if (includeVoice && twiml) {
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
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      success: true,
      sent: results.length,
      failed: errors.length,
      errors,
      results
    })
  };
};
