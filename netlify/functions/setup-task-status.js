// setup-task-status.js
// Tracks setup-day task assignments. Each row is ONE task assigned to ONE group --
// a group can have several tasks assigned at the same time, each completed independently.
//
// GET  -> { assignments: [{ id, groupName, task, status, assignedAt }] }
// POST { action: "assign", groupName, task }      -> creates a new assignment row
// POST { action: "complete", id }                  -> marks that specific assignment done
// POST { action: "remove", id }                    -> deletes an assignment (mis-assigned, etc.)

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TABLE = 'SetupGroups';
const ADMIN_PHONE = '+16082289692'; // Devin

const TWILIO_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN;
const MSG_SID     = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

async function notifyAdmin(groupName, task) {
  if (!TWILIO_SID || !TWILIO_AUTH) return;
  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: ADMIN_PHONE,
        MessagingServiceSid: MSG_SID || TWILIO_FROM,
        Body: `✅ Setup Day: ${groupName} finished "${task}". Assign their next task if needed.`,
      }).toString()
    });
  } catch (e) { /* non-fatal */ }
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod === 'GET') {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?maxRecords=200`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const assignments = (data.records || []).map(r => ({
        id: r.id,
        groupName: r.fields.GroupName || '',
        task: r.fields.Task || '',
        status: r.fields.Status || 'assigned',
        assignedAt: r.fields.AssignedAt || '',
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ assignments }) };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify({ assignments: [], error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { action, id, groupName, task } = JSON.parse(event.body || '{}');

    if (action === 'assign') {
      if (!groupName || !task) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing groupName or task' }) };
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { GroupName: groupName, Task: task, Status: 'assigned', AssignedAt: new Date().toISOString() } })
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'complete') {
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing id' }) };
      const getRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${id}`, {
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
      });
      const rec = await getRes.json();
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Status: 'complete' } })
      });
      notifyAdmin(rec?.fields?.GroupName || 'A group', rec?.fields?.Task || 'a task');
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
          body: JSON.stringify({ fields: { Status: 'complete' } })
        });
      } else {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { GroupName: 'ALL', Task: 'DAY_COMPLETE', Status: 'complete', AssignedAt: new Date().toISOString() } })
        });
      }
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
