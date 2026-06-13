// get-staff-list.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

function normalizeDays(days) {
  if (!days) return '';
  const d = days.toLowerCase();
  if (d.includes('every') || d.includes('all day') || d === 'all') {
    return 'Thursday, Friday, Saturday, Sunday';
  }
  return days;
}

function normalizeLocation(loc) {
  if (!loc) return '';
  if (loc.toLowerCase().includes('all area') || loc.toLowerCase().includes('all areas')) {
    return 'FULL FEST GROUNDS';
  }
  return loc;
}

exports.handler = async (event) => {
  try {
    let allRecords = [];
    let offset = null;

    // Paginate through all Airtable records
    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}${offset ? `?offset=${offset}` : ''}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      const data = await res.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    const staff = allRecords
      .filter(r => r.fields.Status === 'Approved')
      .map(r => ({
        id: r.id,
        name: (r.fields['FullName'] || r.fields['Full Name'] || r.fields['Name'] || '').trim(),
        role: (r.fields['Role'] || '').trim(),
        location: normalizeLocation(r.fields['Location'] || ''),
        phone: (r.fields['Phone'] || '').trim(),
        groupmeUN: (r.fields['GroupMEUN'] || r.fields['UserName'] || r.fields['Username'] || '').trim(),
        groupmeGPName: (r.fields['GroupMEGPName'] || r.fields['GroupMe'] || r.fields['GroupME'] || '').trim(),
        days: normalizeDays(r.fields['Days'] || ''),
        shiftStart: r.fields['ShiftStart'] || '',
        shiftEnd: r.fields['ShiftEnd'] || '',
        smsConsent: r.fields['SMSConsent'] || '',
      }))
      .filter(s => s.name && s.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, staff })
    };
  } catch (err) {
    console.error('get-staff-list error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
