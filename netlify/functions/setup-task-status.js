// setup-task-status.js
// Tracks each setup-day group's current task and completion status, synced via Airtable
// so it works across everyone's phones at once.
//
// GET  -> { groups: [{ groupName, currentTask, status, updatedAt }] }
// POST { action: "complete", groupName }
// POST { action: "assign", groupName, task }
// POST { action: "reset", groupName }

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
        Body: `✅ Setup Day: ${groupName} finished "${task}". Ready for next assignment.`,
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
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const groups = (data.records || []).map(r => ({
        groupName: r.fields.GroupName || '',
        currentTask: r.fields.CurrentTask || '',
        status: r.fields.Status || 'idle',
        updatedAt: r.fields.UpdatedAt || '',
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ groups }) };
    } catch (e) {
      return { statusCode: 200, headers, body: JSON.stringify({ groups: [], error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  try {
    const { action, groupName, task } = JSON.parse(event.body || '{}');
    if (!groupName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing groupName' }) };

    async function findRecord(name) {
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?filterByFormula={GroupName}="${name}"`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      return (data.records || [])[0];
    }

    async function upsert(name, fields) {
      const existing = await findRecord(name);
      if (existing) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        });
      } else {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { GroupName: name, ...fields } })
        });
      }
    }

    if (action === 'complete') {
      const existing = await findRecord(groupName);
      const finishedTask = existing?.fields?.CurrentTask || '';
      await upsert(groupName, { Status: 'complete', UpdatedAt: new Date().toISOString() });
      notifyAdmin(groupName, finishedTask); // fire and forget
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'assign') {
      await upsert(groupName, { CurrentTask: task || '', Status: 'assigned', UpdatedAt: new Date().toISOString() });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'reset') {
      await upsert(groupName, { CurrentTask: '', Status: 'idle', UpdatedAt: new Date().toISOString() });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
