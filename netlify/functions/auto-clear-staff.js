// auto-clear-staff.js
// Checks per-day shift end times and marks staff inactive when their shift ends
// Called from hub every 30 minutes, and via Netlify scheduled function

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = 'appUVEp7kO9NeeJh0';

// Festival dates
const FESTIVAL_DAYS = {
  '2026-07-09': 'Thu',
  '2026-07-10': 'Fri',
  '2026-07-11': 'Sat',
  '2026-07-12': 'Sun',
};

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  try {
    // Get current time in Central Time
    const now = new Date();
    const cdtString = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const cdt = new Date(cdtString);
    const todayDate = cdt.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = cdt.getHours() + cdt.getMinutes() / 60; // e.g. 22.5 for 10:30pm

    const dayCode = FESTIVAL_DAYS[todayDate];

    // Also check if we're in the early morning hours of the day after a festival day
    // e.g. it's 2am on Jul 10 (Fri) — we're still clearing Thu shifts that end at "26" (2am)
    const yesterdayDate = new Date(cdt);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const yesterdayCode = FESTIVAL_DAYS[yesterdayStr];

    if (!dayCode && !yesterdayCode) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Not a festival day', cleared: 0 }) };
    }

    // Fetch all approved staff
    const staffRes = await fetch(
      `https://api.airtable.com/v0/${BASE}/Staff?filterByFormula={Status}="Approved"&maxRecords=200`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const staffData = await staffRes.json();
    const records = staffData.records || [];

    const cleared = [];

    for (const r of records) {
      const f = r.fields;
      let shouldClear = false;

      // Check today's shift end
      if (dayCode) {
        const endField = f[`${dayCode}End`];
        if (endField !== undefined && endField !== '' && endField !== null) {
          const endHour = parseFloat(endField);
          // If end hour <= 24, check if current time has passed it
          // If end hour > 24 (next day), it will be caught by the overnight check below
          if (endHour <= 24 && currentHour >= endHour) {
            shouldClear = true;
          }
        }
      }

      // Check yesterday's overnight shift (end time > 24, e.g. 26 = 2am)
      if (yesterdayCode && !shouldClear) {
        const endField = f[`${yesterdayCode}End`];
        if (endField !== undefined && endField !== '' && endField !== null) {
          const endHour = parseFloat(endField);
          if (endHour > 24) {
            // Convert to current-day hour: 26 = 2am = hour 2
            const overnightEnd = endHour - 24;
            if (currentHour >= overnightEnd) {
              shouldClear = true;
            }
          }
        }
      }

      // Also check if staff has NO shift fields for today — don't clear those
      // (they may not be working today, that's fine)

      // Fallback: use ShiftEnd if no day-specific fields are set
      if (!shouldClear && dayCode) {
        const genericEnd = f['ShiftEnd'];
        if (genericEnd !== undefined && genericEnd !== '' && genericEnd !== null && genericEnd !== '0') {
          const endHour = parseFloat(genericEnd);
          // 24 = midnight end of shift, 26 = 2am, etc.
          // Never clear if end is 0 (invalid) or blank
          if (!isNaN(endHour) && endHour > 0 && endHour <= 24 && currentHour >= endHour) {
            shouldClear = true;
          }
        }
      }

      if (shouldClear) {
        // Set Status to Inactive for today
        await fetch(`https://api.airtable.com/v0/${BASE}/Staff/${r.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Status: 'Inactive' } })
        });
        cleared.push(f['Name1'] || f['Name'] || r.id);
      }
    }

    // Also auto-toggle MPD officers On/Off by their shift schedule
    let mpdChanged = 0;
    try {
      mpdChanged = await autoOfflineMPD(AIRTABLE_TOKEN, BASE);
    } catch (e) { console.log('MPD auto on/off error:', e.message); }

    console.log(`Auto-clear: ${cleared.length} staff cleared for ${todayDate} at ${currentHour.toFixed(1)}h CDT · ${mpdChanged} MPD officers auto-toggled`);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, cleared: cleared.length, names: cleared, day: dayCode, hour: currentHour.toFixed(1), mpdChanged })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

// ── MPD OFFICER AUTO ON/OFF BY SCHEDULE ──
// Also runs as part of the same scheduled function (every 30 min)
// MPDOfficers table needs: SatStart, SatEnd, SunStart, SunEnd (Thu/Fri fields removed)
async function autoOfflineMPD(token, base) {
  const dayMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const dayName = dayMap[today.getDay()];
  const festDays = ['Sat','Sun']; // Thu/Fri MPD shift fields were removed from the table
  if (!festDays.includes(dayName)) return 0;

  const hourNow = today.getHours() + today.getMinutes() / 60;
  let changed = 0;

  try {
    // Fetch ALL officers (not just On) so we can also catch Off ones whose shift is starting
    const res = await fetch(
      `https://api.airtable.com/v0/${base}/MPDOfficers?maxRecords=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();
    for (const r of data.records || []) {
      const status = r.fields.MPDStatus;
      const startField = r.fields[`${dayName}Start`];
      const endField = r.fields[`${dayName}End`];

      // ── Auto-OFF: shift has ended and they're still marked On ──
      if (status === 'On' && endField) {
        const endHour = parseFloat(endField);
        if (endHour && endHour !== 0) {
          const effectiveEnd = endHour > 24 ? endHour - 24 : endHour;
          const isNextDay = endHour > 24;
          const shiftEnded = isNextDay ? (hourNow < 12 && hourNow >= effectiveEnd) : hourNow >= effectiveEnd;
          if (shiftEnded) {
            await fetch(`https://api.airtable.com/v0/${base}/MPDOfficers/${r.id}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ typecast: true, fields: { MPDStatus: 'Off' } })
            }).catch(() => {});
            changed++;
            continue;
          }
        }
      }

      // ── Auto-ON: shift is just starting and they're still marked Off ──
      // Only fires in a narrow window right after Start, so a manual "Off" during
      // the shift is never overridden back to "On" by this scheduled check.
      if (status === 'Off' && startField) {
        const startHour = parseFloat(startField);
        if (startHour && startHour !== 0) {
          const effectiveStart = startHour > 24 ? startHour - 24 : startHour;
          const withinCatchWindow = hourNow >= effectiveStart && hourNow < effectiveStart + 0.6; // ~35 min catch window
          if (withinCatchWindow) {
            await fetch(`https://api.airtable.com/v0/${base}/MPDOfficers/${r.id}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ typecast: true, fields: { MPDStatus: 'On' } })
            }).catch(() => {});
            changed++;
          }
        }
      }
    }
  } catch (e) {
    console.log('MPD auto on/off error:', e.message);
  }
  return changed;
}
