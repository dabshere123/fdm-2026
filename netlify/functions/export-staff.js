// export-staff.js — exports all staff from Airtable as CSV
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="FDM-2026-Staff.csv"'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Fetch all staff
    let all = [], offset = null;
    do {
      const url = `https://api.airtable.com/v0/${BASE}/Staff?pageSize=100${offset?`&offset=${offset}`:''}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
      const data = await res.json();
      all = all.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    // Build CSV
    const cols = [
      'Name', 'Phone', 'Role', 'Location', 'Status',
      'ShiftStart', 'ShiftEnd',
      'ThuStart', 'ThuEnd',
      'FriStart', 'FriEnd',
      'SatStart', 'SatEnd',
      'SunStart', 'SunEnd',
      'Days', 'SMSConsent'
    ];

    const escape = v => {
      const s = String(v || '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
    };

    const rows = [cols.join(',')];
    for (const r of all) {
      const f = r.fields;
      rows.push([
        f['Name1'] || f['Name'] || '',
        f['Phone'] || '',
        f['Role'] || '',
        f['Location'] || '',
        f['Status'] || '',
        f['ShiftStart'] || '',
        f['ShiftEnd'] || '',
        f['ThuStart'] || '',
        f['ThuEnd'] || '',
        f['FriStart'] || '',
        f['FriEnd'] || '',
        f['SatStart'] || '',
        f['SatEnd'] || '',
        f['SunStart'] || '',
        f['SunEnd'] || '',
        f['Days'] || '',
        f['SMSConsent'] || '',
      ].map(escape).join(','));
    }

    return { statusCode: 200, headers, body: rows.join('\n') };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
