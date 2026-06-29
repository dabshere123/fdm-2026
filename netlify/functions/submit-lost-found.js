// submit-lost-found.js
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'LostFound';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const MSG_SID        = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE    = '+16082289692';

function generateItemNumber(dayFound, foundAt) {
  const d = (dayFound || '').toUpperCase();
  const dayCode = d.startsWith('TH') ? 'THU' : d.startsWith('FR') ? 'FRI' :
                  d.startsWith('SA') ? 'SAT' : d.startsWith('SU') ? 'SUN' : 'FES';
  const loc = (foundAt || '').toLowerCase();
  const locCode = loc.includes('moon') && loc.includes('bar') ? 'MOON' :
                  loc.includes('moon') && loc.includes('stage') ? 'MOONST' :
                  loc.includes('sun') && loc.includes('left') ? 'SUNL' :
                  loc.includes('sun') && loc.includes('right') ? 'SUNR' :
                  loc.includes('lafayette') && loc.includes('bar') ? 'LAFBAR' :
                  loc.includes('lafayette') ? 'LAF' :
                  loc.includes('lagniappe') && loc.includes('bar') ? 'LAGBAR' :
                  loc.includes('lagniappe') ? 'LAG' :
                  loc.includes('family') ? 'FAM' :
                  loc.includes('cabaret') ? 'CAB' :
                  loc.includes('medical') || loc.includes('med') ? 'MED' :
                  loc.includes('moon') ? 'MOON' :
                  loc.includes('sun') ? 'SUN' : 'FEST';
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${dayCode}-${locCode}-${seq}`;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  let itemNumber = '???';

  try {
    const body = JSON.parse(event.body || '{}');
    const { description, foundAt, currentLocation, dayFound, foundBy, role, photoData, atFestOffice } = body;

    if (!description || !foundAt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing description or foundAt', itemNumber }) };
    }

    // Generate item number FIRST — always returned even if Airtable fails
    itemNumber = generateItemNumber(dayFound, foundAt);

    const safePhoto = photoData && photoData.length > 80000 ? photoData.slice(0, 80000) : (photoData || '');

    const fieldsWithPhoto = {
      Description:     description,
      FoundAt:         foundAt,
      CurrentLocation: currentLocation || 'With finder',
      DayFound:        dayFound || 'Unknown',
      FoundBy:         foundBy || 'Staff',
      Status:          'Unclaimed',
      ItemNumber:      itemNumber,
      PhotoData:       safePhoto,
      AtFestOffice:    atFestOffice || 'No',
    };

    const fieldsBasic = {
      Description:     description,
      FoundAt:         foundAt,
      CurrentLocation: currentLocation || 'With finder',
      DayFound:        dayFound || 'Unknown',
      FoundBy:         foundBy || 'Staff',
      Status:          'Unclaimed',
      ItemNumber:      itemNumber,
    };

    let res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fieldsWithPhoto })
    });
    let data = await res.json();

    // If unknown field, retry without photo fields
    if (!res.ok && JSON.stringify(data).includes('UNKNOWN_FIELD_NAME')) {
      console.log('Retrying without photo fields');
      res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsBasic })
      });
      data = await res.json();
    }

    const airtableError = !res.ok ? JSON.stringify(data) : null;

    // SMS to admin regardless of Airtable success
    if (TWILIO_SID && TWILIO_TOKEN) {
      const sms = `FDM 2026 L&F — Item #${itemNumber}\nDescription: ${description}\nFound at: ${foundAt}\nDay: ${dayFound||'Unknown'}\nBy: ${foundBy||'Staff'}${atFestOffice==='Yes'?'\nAT FEST OFFICE':''}`;
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: ADMIN_PHONE, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: sms }).toString()
      }).catch(() => {});
    }

    // Always return itemNumber — even if Airtable had an error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: !airtableError,
        itemNumber,
        id: data.id || null,
        airtableError: airtableError || null
      })
    };

  } catch (e) {
    console.error('submit-lost-found error:', e.message);
    // Still return itemNumber so worker sees their tag number
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, itemNumber, error: e.message }) };
  }
};
