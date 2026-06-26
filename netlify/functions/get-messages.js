// get-messages.js — fetch messages for group channel or DM thread
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers,body:''};

  try{
    const p=event.queryStringParameters||{};
    const channel=p.channel||'';
    const dmThread=p.dmThread||'';
    const myName=p.myName||'';
    const limit=parseInt(p.limit||'100');

    let formula='';
    if(dmThread){
      // DM thread between two people
      formula=`{ThreadID}="${dmThread}"`;
    } else if(channel==='all'||channel==='recent'){
      formula='';
    } else if(channel){
      // Show channel messages + AllStaff + alerts
      formula=`OR({Channel}="${channel}",{Channel}="AllStaff",{IsAlert}="Yes")`;
    }

    const url=`https://api.airtable.com/v0/${AIRTABLE_BASE}/Messages?${formula?`filterByFormula=${encodeURIComponent(formula)}&`:''}sort[0][field]=SentAt&sort[0][direction]=asc&maxRecords=${limit}`;
    const res=await fetch(url,{headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`}});
    const data=await res.json();

    const messages=(data.records||[]).map(r=>({
      id:r.id,
      fromName:r.fields.FromName||'',
      fromRole:r.fields.FromRole||'',
      channel:r.fields.Channel||'',
      message:r.fields.Message||'',
      sentAt:r.fields.SentAt||'',
      threadId:r.fields.ThreadID||'',
      isFirst:r.fields.IsFirst==='Yes',
      isDM:r.fields.IsDM==='Yes',
      toName:r.fields.ToName||'',
      isAlert:r.fields.IsAlert==='Yes'
    }));

    // Also get DM threads for this user
    let dmThreads=[];
    if(myName){
      const dmRes=await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Messages?filterByFormula=AND({IsDM}="Yes",OR({FromName}="${myName}",{ToName}="${myName}"),{IsFirst}="Yes")&sort[0][field]=SentAt&sort[0][direction]=desc&maxRecords=20`,
        {headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`}}
      );
      const dmData=await dmRes.json();
      dmThreads=(dmData.records||[]).map(r=>({
        threadId:r.fields.ThreadID||'',
        otherName:r.fields.FromName===myName?r.fields.ToName:r.fields.FromName,
        lastMessage:r.fields.Message||'',
        sentAt:r.fields.SentAt||''
      }));
    }

    return {statusCode:200,headers,body:JSON.stringify({success:true,messages,dmThreads})};
  }catch(e){
    console.error('get-messages error:',e.message);
    return {statusCode:500,headers,body:JSON.stringify({error:e.message,messages:[],dmThreads:[]})};
  }
};
