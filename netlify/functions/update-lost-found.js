// update-lost-found.js
const BASE  = 'appUVEp7kO9NeeJh0';
const TABLE = 'LostFound';
const TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { id, status, atFestOffice, claimantName, currentLocation, photoData, pin } = JSON.parse(event.body || '{}');
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };

    // Photo replacement is an admin-only action -- require the PIN, same as delete/clear-all
    if (photoData && pin !== '8510') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect PIN' }) };
    }

    const fields = {};
    if (status)          fields.Status          = status;
    if (atFestOffice)    fields.AtFestOffice    = atFestOffice;
    if (claimantName)    fields.ClaimantName    = claimantName;
    if (currentLocation) fields.CurrentLocation = currentLocation;

    // Photo replacement -- never truncate (a cut-off base64 string can never decode into an
    // image, so a truncated photo is a guaranteed broken link). Client compresses before
    // sending; if it's still too large, drop it cleanly rather than save corrupted data.
    const PHOTO_LIMIT = 90000;
    let photoTooLarge = false;
    if (photoData) {
      if (photoData.length > PHOTO_LIMIT) {
        photoTooLarge = true;
      } else {
        fields.PhotoData = photoData;
      }
    }

    // If marking at Fest Office, update location too
    if (atFestOffice === 'Yes' && !currentLocation) fields.CurrentLocation = 'Fest Office';

    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(d));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, photoTooLarge }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
