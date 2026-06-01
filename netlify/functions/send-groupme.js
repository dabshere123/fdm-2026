const BOTS = {
  all_staff:  "98b725b13c73172ca29fc3cc1e",
  admin:      "e00d52092cbeee4126e1c47f2e",
  medical:    "18679f837dbeab3effa96a2471",
  bar_stage:  "fe4a796611de5dbb94be8772b8",
  financial:  "6e40448c62350a4f807aab679b",
  restock:    "e86ef1a3c4a49b36b9f04b0b98",
  maintenance:"7929442cf4989bfca533c419ee",
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { message, channels } = JSON.parse(event.body || '{}');

  if (!message || !channels || !Array.isArray(channels)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: message, channels' })
    };
  }

  const results = [];
  const errors = [];

  for (const channel of channels) {
    const botId = BOTS[channel];
    if (!botId) {
      errors.push({ channel, error: 'Unknown channel' });
      continue;
    }

    try {
      const res = await fetch('https://api.groupme.com/v3/bots/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botId, text: message })
      });

      if (res.ok) {
        results.push({ channel, success: true });
      } else {
        errors.push({ channel, error: `HTTP ${res.status}` });
      }
    } catch (err) {
      errors.push({ channel, error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: true, sent: results.length, errors, results })
  };
};
