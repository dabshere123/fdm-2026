// submit-lost-found.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE    = '+16082289692';

function generateItemNumber(dayFound, foundAt) {
  const d = (dayFound || '').toUpperCase();
  const dayCode = d.startsWith('TH') ? 'THU' : d.startsWith('FR') ? 'FRI' :
                  d.startsWith('SA') ? 'SAT' : d.startsWith('SU') ? 'SUN' : 'FES';
  const loc = (foundAt || '').toLowerCase();
  const locCode = loc.includes('moon')&&loc.includes('bar') ? 'MOON' :
                  loc.includes('moon')&&loc.includes('stage') ? 'MOONST' :
                  loc.includes('sun')&&loc.includes('left') ? 'SUNL' :
                  loc.includes('sun')&&loc.includes('right') ? 'SUNR' :
                  loc.includes('lafayette') ? 'LAF' :
                  loc.includes('lagniappe') ? 'LAG' :
                  loc.includes('family') ? 'FAM' :
                  loc.includes('cabaret') ? 'CAB' :
                  loc.includes('moon') ? 'MOON' :
                  loc.includes('sun') ? 'SUN' : 'FEST';
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${dayCode}-${locCode}-${seq}`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { description, foundAt, currentLocation, dayFound, foundBy, role, photoData, atFestOffice } = body;

    if (!description || !foundAt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing description or foundAt' }) };
    }

    const itemNumber = generateItemNumber(dayFound, foundAt);

    // Trim photoData if too large (Airtable field limit ~100KB base64 safe)
    const safePhoto = photoData && photoData.length > 80000 ? photoData.slice(0, 80000) : (photoData || '');

    const fields = {
      Description:     description,
      FoundAt:         foundAt,
      CurrentLocation: currentLocation || 'With finder',
      DayFound:        dayFound || 'Unknown',
      FoundBy:         foundBy || 'Staff',
      Status:          'Found',
      ItemNumber:      itemNumber,
      PhotoData:       safePhoto,
      AtFestOffice:    atFestOffice || 'No',
    };

    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(JSON.stringify(data));

    // SMS notification to admin
    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      const sms = `📦 L&F ITEM LOGGED\n\nItem #: ${itemNumber}\nDescription: ${description}\nFound at: ${foundAt}\nDay: ${dayFound || 'Unknown'}\nBy: ${foundBy || 'Staff'}\n${atFestOffice === 'Yes' ? '\n✅ AT FEST OFFICE' : ''}`;
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: ADMIN_PHONE, From: TWILIO_FROM, Body: sms }).toString()
      }).catch(() => {});
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, itemNumber, id: data.id }) };
  } catch (e) {
    console.error('submit-lost-found error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
