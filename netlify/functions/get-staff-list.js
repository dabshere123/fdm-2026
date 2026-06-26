// get-staff-list.js
const AIRTABLE_BASE = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TABLE = 'Staff';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

function normalizeDays(days) {
  if (!days) return '';
  const d = days.toLowerCase().trim();
  // EVERYDAY → full festival
  if (d.includes('every') || d.includes('all day') || d === 'all') {
    return 'EVERYDAY';
  }
  // Already in abbreviated format — return as-is
  return days;
}

function expandDaysForDisplay(days) {
  if (!days) return '';
  const d = days.toLowerCase();
  if (d.includes('every')) return 'Thu · Fri · Sat · Sun';
  const parts = [];
  if (d.includes('th')) parts.push('Thu');
  if (/f/.test(d) || d.startsWith('f ') || d === 'f') parts.push('Fri');
  if (/s/.test(d) && !d.includes('su')) parts.push('Sat');
  if (d.includes('su')) parts.push('Sun');
  return parts.join(' · ') || days;
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
        name: (r.fields['Name'] || r.fields['FullName'] || r.fields['Full Name'] || r.fields['Name'] || '').trim(),
        role: (r.fields['Role'] || '').trim(),
        location: normalizeLocation(r.fields['Location'] || ''),
        phone: (r.fields['Phone'] || '').trim(),
        groupmeUN: (r.fields['GroupmeUN'] || r.fields['GroupMEUN'] || r.fields['UserName'] || r.fields['Username'] || '').trim(),
        groupmeGPName: (r.fields['GroupMEGPName'] || r.fields['GroupMe'] || r.fields['GroupME'] || '').trim(),
        days: normalizeDays(r.fields['Days'] || ''),
        shiftStart: r.fields['ShiftStart'] || '',
        shiftEnd: r.fields['ShiftEnd'] || '',
        smsConsent: r.fields['SMSConsent'] || '',
        secondaryRole: (r.fields['SecondaryRole'] || r.fields['Secondary Role'] || '').trim(),
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
