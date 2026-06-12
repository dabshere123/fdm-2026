// get-vendor-phones.js
// Returns all vendor phone numbers from VendorCheckins for broadcast SMS

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async () => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/VendorCheckins?fields[]=Phone&fields[]=BusinessName&fields[]=Status`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
    if (!res.ok) return { statusCode: 200, headers, body: JSON.stringify({ phones: [] }) };
    const data = await res.json();
    const phones = (data.records || [])
      .filter(r => r.fields.Phone)
      .map(r => r.fields.Phone.replace(/\D/g,''))
      .filter(p => p.length >= 10)
      .map(p => `+1${p}`)
      .filter((p,i,a) => a.indexOf(p) === i); // dedupe
    return { statusCode: 200, headers, body: JSON.stringify({ phones }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ phones: [], error: e.message }) };
  }
};
