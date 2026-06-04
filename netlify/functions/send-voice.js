const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { to, script } = JSON.parse(event.body || '{}');

  if (!to || !script) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: to, script' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">${script}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">${script}</Say>
</Response>`;

  try {
    const result = await client.calls.create({
      twiml,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, sid: result.sid })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
