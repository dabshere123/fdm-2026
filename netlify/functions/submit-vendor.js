// submit-vendor.js — saves vendor sign-up to Airtable Vendors table
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_SID     = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH    = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SID  = process.env.TWILIO_MESSAGING_SERVICE_SID;

function fmtPhone(p){
  if(!p)return null;
  const d=String(p).replace(/\D/g,'');
  if(d.length===10)return `+1${d}`;
  if(d.length===11&&d[0]==='1')return `+${d}`;
  if(String(p).startsWith('+'))return String(p);
  return null;
}

exports.handler = async(event)=>{
  const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
  if(event.httpMethod!=='POST')return{statusCode:405,headers,body:'Method not allowed'};

  const{businessName,contactName,phone,location,notes}=JSON.parse(event.body||'{}');
  if(!businessName||!phone)return{statusCode:400,headers,body:JSON.stringify({error:'Business name and phone required'})};

  const ts=new Date().toLocaleString('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

  // Save to Airtable
  const res=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Vendors`,{
    method:'POST',
    headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({fields:{
      BusinessName:businessName,
      ContactName:contactName||'',
      Phone:fmtPhone(phone)||phone,
      Location:location||'',
      Notes:notes||'',
      SignedUpAt:ts,
      Status:'Registered',
    }})
  });
  const data=await res.json();
  if(data.error){
    const msg=data.error?.type==="TABLE_NOT_FOUND"
      ?"Vendor sign-up is not yet active. Please try again shortly or contact festival operations."
      :data.error.message||"Submission failed. Please try again.";
    return{statusCode:500,headers,body:JSON.stringify({error:msg})};
  }

  // Confirmation SMS to vendor
  const fmt=fmtPhone(phone);
  if(fmt){
    const auth=Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,{
      method:'POST',
      headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({To:fmt,MessagingServiceSid: MESSAGING_SID || TWILIO_FROM,Body:`✅ Fête de Marquette 2026 — You're registered, ${contactName||businessName}! We have ${businessName} at ${location||'your location'} on file. You'll receive festival broadcasts and emergency alerts at this number. See you July 9–12!`}).toString()
    }).catch(()=>{});
  }

  return{statusCode:200,headers,body:JSON.stringify({success:true,id:data.id})};
};
