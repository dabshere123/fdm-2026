// get-conversations.js — inbox filtered by role
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

// Which channels each role can see
function allowedChannels(role) {
  const r = (role || '').toLowerCase();

  // Admin sees everything
  if (r === 'admin' || r === 'a1' || r === 'a2' || r === 'a3' || r.includes('admin')) {
    return 'ALL';
  }

  // Med sees Medical + AllStaff (NOT Admin, NOT bars, NOT stages)
  if (r === 'm1' || r === 'm2' || r === 'med 1' || r === 'med 2' || r.includes('med unit') || r.includes('medical')) {
    return ['AdminMed', 'AllStaff', 'Hospitality'];
  }

  // Bars — their specific channel + All Bars + AllStaff
  if (r.includes('moon bar') || r === 'msb1' || r === 'msb2') return ['MoonBar', 'Bars', 'AllStaff'];
  if (r.includes('sun bar left') || r === 'ssbl') return ['SunBarL', 'Bars', 'AllStaff'];
  if (r.includes('sun bar right') || r === 'ssbr') return ['SunBarR', 'Bars', 'AllStaff'];
  if (r.includes('lafayette bar') || r === 'lafb') return ['LafBar', 'Bars', 'AllStaff'];
  if (r.includes('lagniappe bar') || r === 'lagb') return ['LagBar', 'Bars', 'AllStaff'];
  if (r.includes('family fete bar') || r.includes('family bar') || r === 'ffb') return ['FamilyBar', 'Bars', 'AllStaff'];
  if (r.includes('cabaret bar') || r === 'cb') return ['CabBar', 'Bars', 'AllStaff'];
  if (r.includes('everything else') || r.includes('eec') || r === 'etecm' || r === 'mtm') return ['EverythingBar', 'Bars', 'AllStaff'];
  if (r.includes('bar')) return ['Bars', 'AllStaff']; // generic bar

  // Stages — their specific channel + AllStaff
  if (r.includes('moon stage') || r === 'msm') return ['MoonST', 'AllStaff'];
  if (r.includes('sun stage') || r === 'ssm') return ['SunST', 'AllStaff'];
  if (r.includes('lafayette stage') || r === 'lafm') return ['LafST', 'AllStaff'];
  if (r.includes('lagniappe stage') || r === 'lagm') return ['LagST', 'AllStaff'];
  if (r.includes('family fete stage') || r === 'famsm') return ['FamST', 'AllStaff'];
  if (r.includes('cabaret stage') || r === 'cabsm') return ['CabST', 'AllStaff'];
  if (r.includes('stage')) return ['AllStaff']; // generic stage

  // Hospitality
  if (r.includes('hospitality') || r === 'hosp') return ['Hospitality', 'AllStaff'];

  // Overnight, Merch, Greeters — AllStaff only
  return ['AllStaff'];
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const p = event.queryStringParameters || {};
    const myName = p.myName || '';
    const myRole = p.myRole || '';
    const allowed = allowedChannels(myRole);

    const url = `https://api.airtable.com/v0/${BASE}/Messages?sort[0][field]=SentAt&sort[0][direction]=desc&maxRecords=200`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    const records = data.records || [];

    const convMap = {};

    for (const r of records) {
      const f = r.fields;
      const isDM = f.IsDM === 'Yes';
      const isAlert = f.IsAlert === 'Yes';
      const channel = f.Channel || '';

      if (isDM) {
        // DMs: only show if user is a participant
        const isParticipant = f.FromName === myName || f.ToName === myName;
        if (!isParticipant) continue;
      } else {
        // Channel messages: check if allowed
        if (allowed !== 'ALL') {
          // Alerts visible to everyone
          if (!isAlert && !allowed.includes(channel)) continue;
        }
        // Admin channel: Admin only
        if (channel === 'Admin' && allowed !== 'ALL') continue;
      }

      const key = isDM
        ? (f.ThreadID || `DM_${[f.FromName, f.ToName].sort().join('_')}`)
        : channel;

      if (!key) continue;

      if (!convMap[key]) {
        convMap[key] = {
          id: key,
          isDM,
          channel,
          otherName: isDM ? (f.FromName === myName ? f.ToName : f.FromName) : null,
          lastMessage: f.Message || '',
          lastFrom: f.FromRole || f.FromName || '',
          lastAt: f.SentAt || '',
          recipients: f.Recipients || channel || '',
        };
      }
    }

    const conversations = Object.values(convMap).sort((a, b) =>
      new Date(b.lastAt) - new Date(a.lastAt)
    );

    return { statusCode: 200, headers, body: JSON.stringify({ conversations }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
