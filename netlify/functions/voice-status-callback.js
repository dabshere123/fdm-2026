// voice-status-callback.js
// Twilio calls this URL when an outbound voice call finishes (StatusCallbackEvent=completed).
// If the call wasn't actually answered (no-answer / busy / failed / canceled), automatically
// redial the same person with the same message, up to MAX_RETRIES times.

const SITE_URL = 'https://fdm2026.netlify.app';
const MAX_RETRIES = 4; // up to 5 total attempts (1 initial + 4 redials)

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const q = event.queryStringParameters || {};
    const to = q.to || '';
    const retry = parseInt(q.retry || '0', 10);
    const message = q.msg || '';

    const body = Object.fromEntries(new URLSearchParams(event.body || '').entries());
    const callStatus = body.CallStatus || '';

    // 'completed' means the call connected and ran to the end — someone answered. Nothing to do.
    const NOT_ANSWERED = ['no-answer', 'busy', 'failed', 'canceled'];
    if (!NOT_ANSWERED.includes(callStatus)) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'none', callStatus }) };
    }

    if (!to || !message || retry >= MAX_RETRIES) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'gave-up', retry, callStatus }) };
    }

    // Redial — fire-and-forget, don't block Twilio's webhook waiting on this
    fetch(`${SITE_URL}/.netlify/functions/send-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, retry: retry + 1 }),
    }).catch(() => {});

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, action: 'redialing', nextRetry: retry + 1, callStatus }) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
