// send-message.js — full chat system with groups, DMs, and alert posting
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;
const ADMIN_PHONE    = '+16082289692';

function fmtPhone(p){
  if(!p) return null;
  const d=String(p).replace(/\D/g,'');
  if(d.length===10) return `+1${d}`;
  if(d.length===11&&d[0]==='1') return `+${d}`;
  if(String(p).startsWith('+')) return String(p);
  return null;
}

async function sendSMS(to, body){
  const fmt=fmtPhone(to);
  if(!fmt) return;
  const auth=Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,{
    method:'POST',
    headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({To:fmt,MessagingServiceSid:MESSAGING_SID,Body:body}).toString()
  });
}

async function getStaffPhones(channel){
  // Fetch staff phones for a given channel to notify them of new DMs
  try{
    const res=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Staff?filterByFormula={Status}="Approved"`,
      {headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`}});
    const data=await res.json();
    return (data.records||[]).map(r=>r.fields);
  }catch(e){return [];}
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers,body:'Method not allowed'};

  try{
    const {fromName,fromRole,channel,message,isDM,toName,toPhone,isAlert,threadId} = JSON.parse(event.body||'{}');
    if(!fromName||!channel||!message) return {statusCode:400,headers,body:JSON.stringify({error:'Missing required fields'})};

    const ts=new Date().toISOString();
    const tid=threadId||`${channel}-${Date.now()}`;

    // Check if first message in thread
    const checkRes=await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Messages?filterByFormula={ThreadID}="${tid}"&maxRecords=1`,
      {headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`}}
    );
    const checkData=await checkRes.json();
    const isFirst=(checkData.records||[]).length===0;

    // Save to Airtable
    const saveRes=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Messages`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({fields:{
        FromName:fromName,
        FromRole:fromRole||'',
        Channel:channel,
        Message:message,
        SentAt:ts,
        ThreadID:tid,
        IsFirst:isFirst?'Yes':'No',
        IsDM:isDM?'Yes':'No',
        ToName:toName||'',
        IsAlert:isAlert?'Yes':'No'
      }})
    });
    const saved=await saveRes.json();

    // NOTIFICATIONS
    if(isDM&&toPhone&&isFirst){
      // Direct message — SMS the recipient on first message
      await sendSMS(toPhone,`💬 Direct message from ${fromName}:\n\n"${message}"\n\nReply in the FDM Worker App: https://fdm2026.netlify.app/field`);
    } else if(!isDM&&!isAlert&&isFirst&&channel!=='Admin'){
      // New group message — SMS admin
      await sendSMS(ADMIN_PHONE,`💬 NEW MESSAGE — ${channel}\n\nFrom: ${fromName}\n"${message}"\n\nView in hub: https://fdm2026.netlify.app/hub`);
    }

    return {statusCode:200,headers,body:JSON.stringify({success:true,id:saved.id,threadId:tid,isFirst})};
  }catch(e){
    console.error('send-message error:',e.message);
    return {statusCode:500,headers,body:JSON.stringify({error:e.message})};
  }
};
