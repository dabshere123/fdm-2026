// analyze-photo.js — server-side Claude vision API for photo descriptions
// Staff takes a photo → this function describes it → fills in the form

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { imageData, mediaType, mode } = JSON.parse(event.body || '{}');
    if (!imageData) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No image provided' }) };

    const prompts = {
      lost_found: 'Describe this lost item in one concise sentence for a lost and found log. Include color, type, brand if visible, and any identifying features. Be specific but brief. Example: "Black Nike backpack with red zipper and side water bottle pocket." Only describe the item, nothing else.',
      maintenance: 'Describe this maintenance issue in one concise sentence for an operations log. Include what is broken, damaged, or not working. Be specific and practical. Example: "Generator power cable disconnected at junction box near stage left speaker stack." Only describe the issue, nothing else.'
    };

    const prompt = prompts[mode] || prompts.lost_found;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    const description = data.content?.[0]?.text?.trim() || '';
    console.log(`Photo analyzed (${mode}): ${description}`);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, description }) };
  } catch(e) {
    console.log('analyze-photo error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
