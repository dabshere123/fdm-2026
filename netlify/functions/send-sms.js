const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { to, message } = JSON.parse(event.body || '{}');

  if (!to || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: to, message' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const result = await client.messages.create({
      body: message,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
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
