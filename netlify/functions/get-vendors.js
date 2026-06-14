// get-vendors.js — returns all vendors from Airtable Vendors table
const AIRTABLE_BASE  = 'appUVEp7kO9NeeJh0';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

exports.handler = async(event)=>{
  const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS')return{statusCode:200,headers,body:''};
  try{
    let records=[],offset=null;
    do{
      const url=`https://api.airtable.com/v0/${AIRTABLE_BASE}/Vendors?sort[0][field]=SignedUpAt&sort[0][direction]=desc${offset?`&offset=${offset}`:''}`;
      const res=await fetch(url,{headers:{'Authorization':`Bearer ${AIRTABLE_TOKEN}`}});
      const data=await res.json();
      records=records.concat(data.records||[]);
      offset=data.offset||null;
    }while(offset);
    const vendors=records.map(r=>({id:r.id,...r.fields}));
    return{statusCode:200,headers,body:JSON.stringify({vendors})};
  }catch(e){
    return{statusCode:500,headers,body:JSON.stringify({error:e.message,vendors:[]})};
  }
};
