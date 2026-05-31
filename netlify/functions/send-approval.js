const twilio = require('twilio');

const workerGuide = (name) => `Hi ${name}! You're approved for Fête de Marquette 2026 Operations. 🎉

Your worker app: https://fdm2026.netlify.app/field

📱 Add to home screen:
  iPhone: Tap Share → Add to Home Screen
  Android: Tap ⋮ → Add to Home Screen

Sign in with your name & phone number. Your role and location load automatically.

HOW THE APP WORKS:
• Use the request buttons to alert operations — EMS, Security, Restock, Maintenance and more
• When operations sends you a message, tap ACKNOWLEDGED to confirm you received it
• If you have assigned equipment, use the Equipment section to check out and return your radio and/or credit card reader

See you at the fest! 🎶
— Fête de Marquette Operations

Reply STOP to opt out.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { name, phone } = JSON.parse(event.body || '{}');

  if (!name || !phone) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: name, phone' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const result = await client.messages.create({
      body: workerGuide(name),
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
      to: phone
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
