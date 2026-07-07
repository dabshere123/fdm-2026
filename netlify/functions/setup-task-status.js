// setup-task-status.js
// Tracks setup-day task assignments AND each group's phone number (for SMS alerts).
// Each row in SetupGroups is ONE task assigned to ONE group -- a group can have
// several tasks assigned at the same time, each completed independently.
// Phone numbers live in a separate table, SetupGroupPhones (GroupName, Phone).
//
// GET  -> { assignments: [{ id, groupName, task, status, assignedAt }], phones: [{groupName, phone}] }
// POST { action: "assign", groupName, task }      -> creates a new assignment row, texts the group if phone on file
// POST { action: "complete", id }                  -> marks that specific assignment done, texts Devin
// POST { action: "remove", id }                    -> deletes an assignment
// POST { action: "setPhone", groupName, phone }     -> saves/updates a group's phone number
// POST { action: "markAllComplete" }                -> sets the day-complete flag, texts every group with a phone on file
// POST { action: "clearAllComplete" }               -> undoes the above

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TABLE = 'SetupGroups';
const PHONE_TABLE = 'SetupGroupPhones';
const ADMIN_PHONE = '+16082289692'; // Devin

const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

function fmtPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  if (String(p).startsWith('+')) return String(p);
  return null;
}

async function sendSMS(to, body) {
  if (!TWILIO_SID || !TWILIO_AUTH) return;
  const formatted = fmtPhone(to);
  if (!formatted) return;
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: formatted, MessagingServiceSid: MSG_SID || TWILIO_FROM, Body: body }).toString()
    });
  } catch (e) { /* non-fatal */ }
}

async function getGroupPhone(groupName) {
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${PHONE_TABLE}?filterByFormula={GroupName}="${groupName}"`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    return data.records?.[0]?.fields?.Phone || null;
  } catch (e) { return null; }
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod === 'GET') {
    try {
      const [assignRes, phoneRes] = await Promise.all([
        fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?maxRecords=200`, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }),
        fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${PHONE_TABLE}?maxRecords=50`, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }),
      ]);
      const assignData = await assignRes.json();
      if (!assignRes.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ assignments: [], phones: [], error: `Airtable error reading "${TABLE}": ${assignData.error?.message || assignRes.status}. Make sure a table named exactly "${TABLE}" exists with fields GroupName, Task, Status, AssignedAt.` }) };
      }
      const phoneData = await phoneRes.json().catch(() => ({ records: [] }));
      const assignments = (assignData.records || []).map(r => ({
        id: r.id,
        groupName: r.fields.GroupName || '',
        task: r.fields.Task || '',
        status: r.fields.Status || 'In Progress',
        assignedAt: r.fields.AssignedAt || '',
      }));
      const phones = (phoneData.records || []).map(r => ({
        groupName: r.fields.GroupName || '',
        phone: r.fields.Phone || '',
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ assignments, phones }) };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify({ assignments: [], phones: [], error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { action, id, groupName, task, phone } = JSON.parse(event.body || '{}');

    if (action === 'assign') {
      if (!groupName || !task) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing groupName or task' }) };
      const assignRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ typecast: true, fields: { GroupName: groupName, Task: task, Status: 'In Progress', AssignedAt: new Date().toISOString() } })
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: `Airtable rejected the write: ${assignData.error?.message || assignRes.status}. Make sure a table named exactly "${TABLE}" exists with fields GroupName, Task, Status, AssignedAt (all single line text).` }) };
      }
      const groupPhone = await getGroupPhone(groupName);
      if (groupPhone) sendSMS(groupPhone, `📋 New task for ${groupName}: ${task}. Check the Setup Day app for details.`);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'complete') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      const getRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${id}`, {
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      const rec = await getRes.json();
      const patchRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ typecast: true, fields: { Status: 'DONE' } })
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: patchData.error?.message || 'Failed to mark complete' }) };
      }
      sendSMS(ADMIN_PHONE, `✅ Setup Day: ${rec?.fields?.GroupName || 'A group'} finished "${rec?.fields?.Task || 'a task'}". Assign their next task if needed.`);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'remove') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'setPhone') {
      if (!groupName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing groupName' }) };
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${PHONE_TABLE}?filterByFormula={GroupName}="${groupName}"`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const existing = (data.records || [])[0];
      if (existing) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${PHONE_TABLE}/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Phone: phone || '' } })
        });
      } else {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${PHONE_TABLE}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { GroupName: groupName, Phone: phone || '' } })
        });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // Sentinel record (GroupName="ALL") used to broadcast "the whole day is done" to every group's app
    if (action === 'markAllComplete') {
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?filterByFormula=AND({GroupName}="ALL",{Task}="DAY_COMPLETE")`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const existing = (data.records || [])[0];
      if (existing) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ typecast: true, fields: { Status: 'DONE' } })
        });
      } else {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ typecast: true, fields: { GroupName: 'ALL', Task: 'DAY_COMPLETE', Status: 'DONE', AssignedAt: new Date().toISOString() } })
        });
      }
      // Text every group that has a phone on file
      try {
        const phoneRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${PHONE_TABLE}?maxRecords=50`, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
        const phoneData = await phoneRes.json();
        for (const r of (phoneData.records || [])) {
          if (r.fields.Phone) sendSMS(r.fields.Phone, `🎉 Fête de Marquette Setup Day: everything is complete! Great work today — you can head back now.`);
        }
      } catch (e) { /* non-fatal */ }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'clearAllComplete') {
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?filterByFormula=AND({GroupName}="ALL",{Task}="DAY_COMPLETE")`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const existing = (data.records || [])[0];
      if (existing) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${existing.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
        });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
