// vendor-checkin.js
// Handles vendor check-in, setup complete, and list actions

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN_  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM    = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE    = '+16082289692';

async function sendSMS(to, message) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN_}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }).toString()
  });
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // GET — list all vendors
  if (event.httpMethod === 'GET') {
    const params = new URLSearchParams(event.queryStringParameters || {});
    if (params.get('action') === 'list') {
      try {
        const res = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE}/VendorCheckins?sort[0][field]=CheckInTime&sort[0][direction]=desc`,
          { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
        );
        const data = await res.json();
        const vendors = (data.records || []).map(r => ({
          business: r.fields.BusinessName || '',
          contact: r.fields.ContactName || '',
          phone: r.fields.Phone || '',
          plot: r.fields.Plot || '',
          day: r.fields.Day || '',
          status: r.fields.Status || '',
          checkedInAt: r.fields.CheckInTime || '',
        }));
        return { statusCode: 200, headers, body: JSON.stringify({ vendors }) };
      } catch(e) {
        return { statusCode: 500, headers, body: JSON.stringify({ vendors: [], error: e.message }) };
      }
    }
    return { statusCode: 400, headers, body: 'Bad request' };
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { action, business, contact, phone, day, plot, checkedInAt } = JSON.parse(event.body || '{}');

  if (action === 'checkin') {
    try {
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/VendorCheckins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            BusinessName: business,
            ContactName: contact,
            Phone: phone,
            Plot: String(plot),
            Day: day,
            Status: 'Checked In',
            CheckInTime: new Date().toISOString(),
          }
        })
      });

      // Notify Admin
      try {
        await sendSMS(ADMIN_PHONE, `🎪 VENDOR CHECK-IN\n${business}\nPlot ${plot} · ${day}\nContact: ${contact} · ${phone}`);
      } catch(e) { console.log('SMS error:', e.message); }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, plot }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (action === 'setup_complete') {
    try {
      // Find the Airtable record and update status
      const search = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/VendorCheckins?filterByFormula=AND({Plot}="${plot}",{Status}="Checked In")`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await search.json();
      const record = (data.records || [])[0];

      if (record) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/VendorCheckins/${record.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Status: 'Setup Complete', SetupCompleteTime: new Date().toISOString() } })
        });
      }

      try {
        await sendSMS(ADMIN_PHONE, `✅ VENDOR SETUP COMPLETE\n${business} — Plot ${plot}`);
      } catch(e) { console.log('SMS error:', e.message); }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 400, headers, body: 'Unknown action' };
};
