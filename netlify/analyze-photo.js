// analyze-photo.js — server-side Claude vision for photo descriptions
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set in Netlify env vars');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY to Netlify environment variables.' }) };
  }

  try {
    const { imageData, mediaType, mode } = JSON.parse(event.body || '{}');
    if (!imageData) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No image provided' }) };

    const prompts = {
      lost_found: 'Describe this lost item in one concise sentence. Include color, type, brand if visible, and any identifying features. Example: "Black North Face backpack with red zipper and water bottle pocket." Only describe the item.',
      maintenance: 'Describe this maintenance issue in one concise sentence. Include what is broken or not working and where. Example: "Generator power cable disconnected at junction box near stage left." Only describe the issue.'
    };

    console.log(`analyze-photo: mode=${mode}, imageSize=${imageData.length} chars`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
            { type: 'text', text: prompts[mode] || prompts.lost_found }
          ]
        }]
      })
    });

    const data = await response.json();
    console.log('Claude response status:', response.status);

    if (!response.ok) {
      console.error('Claude API error:', JSON.stringify(data));
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Claude API error: ${data.error?.message || 'Unknown error'}` }) };
    }

    const description = data.content?.[0]?.text?.trim() || '';
    console.log('Description:', description);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, description }) };

  } catch(e) {
    console.error('analyze-photo error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
