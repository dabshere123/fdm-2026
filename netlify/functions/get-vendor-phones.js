// get-vendor-phones.js
// Returns all vendor phone numbers from the Vendors table for broadcast SMS/voice

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async () => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/Vendors?fields[]=Phone&fields[]=BusinessName&fields[]=Status`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
    if (!res.ok) return { statusCode: 200, headers, body: JSON.stringify({ phones: [], contacts: [] }) };
    const data = await res.json();
    const validRecords = (data.records || []).filter(r => {
      const d = (r.fields.Phone||'').replace(/\D/g,'');
      return d.length >= 10;
    });
    const phones = validRecords
      .map(r => r.fields.Phone.replace(/\D/g,''))
      .map(p => p.length===10 ? `+1${p}` : `+${p}`)
      .filter((p,i,a) => a.indexOf(p) === i); // dedupe
    const contacts = validRecords.map(r => {
      const d = r.fields.Phone.replace(/\D/g,'');
      return { name: r.fields.BusinessName || 'Vendor', phone: d.length===10?`+1${d}`:`+${d}` };
    });
    return { statusCode: 200, headers, body: JSON.stringify({ phones, contacts }) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ phones: [], error: e.message }) };
  }
};
