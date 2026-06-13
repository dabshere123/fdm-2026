// equipment-action.js
// Handles equipment checkout/checkin synced to Airtable
// POST { action: "checkout"|"checkin"|"list", id, type, name, by }

const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TABLE = 'Equipment';

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // GET — list all equipment status
  if (event.httpMethod === 'GET') {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?sort[0][field]=ItemID`,
        { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const data = await res.json();
      const items = (data.records || []).map(r => ({
        id: r.id,
        itemId: r.fields.ItemID || '',
        type: r.fields.Type || '',
        label: r.fields.Label || '',
        location: r.fields.Location || '',
        status: r.fields.Status || 'available',
        checkedOutBy: r.fields.CheckedOutBy || '',
        checkedOutAt: r.fields.CheckedOutAt || '',
        checkedInBy: r.fields.CheckedInBy || '',
        checkedInAt: r.fields.CheckedInAt || '',
        serial: r.fields.Serial || '',
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ items }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };

  const { action, itemId, type, label, location, checkedOutBy, checkedInBy, serial } = JSON.parse(event.body || '{}');

  // Find record by ItemID
  async function findRecord(id) {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}?filterByFormula={ItemID}="${id}"`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const data = await res.json();
    return (data.records || [])[0];
  }

  async function upsert(id, fields) {
    const existing = await findRecord(id);
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
        body: JSON.stringify({ fields: { ItemID: id, Type: type, Label: label, Location: location, ...fields } })
      });
    }
  }

  try {
    if (action === 'checkout') {
      await upsert(itemId, {
        Status: 'out',
        CheckedOutBy: checkedOutBy,
        CheckedOutAt: new Date().toISOString(),
        CheckedInBy: '',
        CheckedInAt: '',
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'checkin') {
      await upsert(itemId, {
        Status: 'returned',
        CheckedInBy: checkedInBy,
        CheckedInAt: new Date().toISOString(),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'serial') {
      await upsert(itemId, { Serial: serial });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (action === 'reset') {
      const existing = await findRecord(itemId);
      if (existing) {
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${TABLE}/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Status: 'available', CheckedOutBy: '', CheckedOutAt: '', CheckedInBy: '', CheckedInAt: '' } })
        });
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: 'Unknown action' };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
