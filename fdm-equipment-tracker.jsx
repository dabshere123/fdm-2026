import { useState, useEffect, useRef } from "react";

// ── EQUIPMENT DATA ─────────────────────────────────────────────────────────────
const LOCATIONS = [
  "Moon Stage 1","Moon Stage 2","Lafayette","Lagniappe","Sun Left",
  "Sun Right","Cabaret","Kids/Family Fete","Prize Wheel",
  "Cabaret Stage","Lafayette Stage","Lagniappe Stage","Moon Stage",
  "First Aid 1","First Aid 2","Medical Tent",
  "Devin","Marketing","MPD 1","MPD 2","MPD 3","MPD 4",
  "Extra 1","Extra 2","Extra 3"
];

const BAR_LOCATIONS = [
  "Cabaret Bar","Sun Left Bar","Sun Right Bar","Lagniappe Bar",
  "Lafayette Bar","Moon Bar","Family Bar","Everything Else Cafe"
];

const STAGE_LOCATIONS = [
  "Cabaret Stage","Sun Stage","Lafayette Stage",
  "Lagniappe Stage","Moon Stage","Family Stage"
];

// Radios 1-18 go to these specific roles/locations in this exact order (per handwritten list)
const RADIO_LOCATIONS = [
  "Devin/Admin",         // 1
  "Med 1",               // 2
  "Med 2",               // 3
  "Sun Left",            // 4
  "Sun Right",           // 5
  "Cabaret",             // 6
  "Cabaret Stage",       // 7
  "Carrin",              // 8 — specific person's radio
  "Sun Stage Manager",   // 9
  "Family Fete Bar",     // 10
  "Moon Bar",            // 11
  "Moon Stage",          // 12
  "Lagniappe",           // 13
  "Lagniappe Stage",     // 14
  "Lafayette Bar",       // 15
  "Prize Wheel",         // 16
  "MPD",                 // 17
  "Devin's Cart",        // 18
];

// Readers go to bars only, NOT Lagniappe, plus Prize Wheel = 8 spots
const READER_LOCATIONS = [...BAR_LOCATIONS.filter(b=>b!=="Lagniappe Bar"), "Prize Wheel"];

// 18 radios — each pre-assigned to its specific role/location per the handwritten list
const INIT_RADIOS = Array.from({length:18},(_,i)=>({
  id:`R${String(i+1).padStart(2,"0")}`, // internal key, kept stable so sync doesn't create duplicates
  num:1001+i,
  label:`Radio ${1001+i}`, // matches the physical number printed on the radio
  serial:"",
  location: RADIO_LOCATIONS[i],
  paired: false,
  status:"available", // available | out | returned
  checkedOutBy:"",checkedOutAt:null,
  checkedInBy:"",checkedInAt:null,
  notes:"",
}));

// 22 readers — not assigned yet, admin will assign to the 8 reader locations this week
const INIT_READERS = Array.from({length:22},(_,i)=>({
  id:`CR${String(i+1).padStart(2,"0")}`,
  num:i+1,
  label:`Reader ${i+1}`,
  serial:"",
  location: "", // not assigned yet — will be set by admin this week
  status:"available",
  checkedOutBy:"",checkedOutAt:null,
  checkedInBy:"",checkedInAt:null,
  notes:"",
}));

const ADMIN_PIN = "8510";
const STORAGE_KEY = "fdm2026-equipment-v1";

function ts(){return new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});}
function dt(){return new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}

function load(){
  try{const d=localStorage.getItem(STORAGE_KEY);return d?JSON.parse(d):null;}catch{return null;}
}
function save(data){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch{}
}

const S = {
  root:{minHeight:"100vh",background:"#0a0f1e",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0"},
  panel:{maxWidth:800,margin:"0 auto",padding:"0 0 80px"},
  hdr:{background:"linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,179,8,0.08))",borderBottom:"1px solid rgba(245,158,11,0.2)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"},
  card:{borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",marginBottom:8,overflow:"hidden"},
  inp:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"},
  btn:{border:"none",borderRadius:10,padding:"12px 18px",fontSize:14,fontWeight:700,cursor:"pointer"},
};

function Badge({status}){
  const map={available:["#10b981","✅ Available"],out:["#f59e0b","📤 Checked Out"],returned:["#6366f1","✅ Returned"]};
  const [color,label]=map[status]||["#64748b","Unknown"];
  return <span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700}}>{label}</span>;
}

export default function EquipmentTracker(){
  // ═══ FDM 2026 IS OVER — set to false when reactivating for the 2027 festival ═══
  const DORMANT=true;
  if(DORMANT){
    return (
      <div style={{minHeight:"100vh",background:"#0a0f1e",color:"#f1f5f9",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",textAlign:"center",fontFamily:"-apple-system,sans-serif"}}>
        <div style={{fontSize:56,marginBottom:16}}>🎪</div>
        <div style={{fontSize:24,fontWeight:900,marginBottom:10}}>Fête de Marquette 2026 Has Wrapped!</div>
        <div style={{fontSize:15,color:"#94a3b8",maxWidth:400,lineHeight:1.6}}>Thanks for an incredible festival. The Equipment Tracker is now closed for the season — see you in 2027!</div>
      </div>
    );
  }
  const cameFromHub = typeof window!=="undefined" && new URLSearchParams(window.location.search).get("from")==="hub";
  const saved = load();
  const migratedRadios = (() => {
    const existing = saved?.radios;
    if (!existing) return INIT_RADIOS;
    const trimmed = existing.length > 18 ? existing.slice(0, 18) : existing;
    // Radios are tied to a fixed role by their physical number now (1001=Devin/Admin, 1005=Sun Right, etc.)
    // so always force location/label/num to match that position -- no partial "still valid" leniency,
    // since a location being valid *somewhere* in the list isn't the same as being correct *here*.
    return trimmed.map((r,i) => ({
      ...r,
      location: INIT_RADIOS[i]?.location ?? r.location,
      label: INIT_RADIOS[i]?.label ?? r.label,
      num: INIT_RADIOS[i]?.num ?? r.num,
    }));
  })();
  const migratedReaders = (() => {
    const existing = saved?.readers || [];
    if (existing.length >= 22) return existing;
    // Upgrade from an older 9 (or fewer) reader save without losing existing check-out data
    const extra = INIT_READERS.slice(existing.length);
    return [...existing, ...extra];
  })();
  const [radios,setRadios] = useState(migratedRadios);
  const [readers,setReaders] = useState(migratedReaders);
  const [tab,setTab] = useState("overview"); // overview | radios | readers | admin | notifications
  const [adminUnlocked,setAdminUnlocked] = useState(false);
  const [pinInput,setPinInput] = useState("");
  const [pinError,setPinError] = useState("");
  const [searchQ,setSearchQ] = useState("");
  const [filterStatus,setFilterStatus] = useState("all");
  const [selectedItem,setSelectedItem] = useState(null); // {type,id}
  const [checkoutName,setCheckoutName] = useState("");
  const [checkinName,setCheckinName] = useState("");
  const [itemNotes,setItemNotes] = useState("");
  const [adminSearch,setAdminSearch] = useState("");
  const [editSerial,setEditSerial] = useState({}); // {id: serial}
  const [editLocation,setEditLocation] = useState({}); // {id: location}
  const [log,setLog] = useState(saved?.log||[]);
  const [notifSettings,setNotifSettings] = useState(saved?.notifSettings||{
    preEventTime:"09:00",
    followupMins:"30",
    broadcastSMS:"Hi team! This is Fête de Marquette Operations. A friendly reminder to stop by the festival office to pick up your radio and/or credit card reader before your shift begins. See you out there!",
    followupSMS:"Hi [Name], this is Fête de Marquette Operations. It looks like your equipment hasn't been picked up yet. Please stop by the festival office as soon as possible to grab your radio and/or credit card reader(s). Thanks!",
    postEventTime:"22:00",
    postBroadcastSMS:"Hi team! Fête de Marquette is wrapping up for the night. Please return your radio and/or credit card reader to the festival office within the next 30 minutes. Thank you for a great night!",
    post30SMS:"Hi [Name], this is Fête de Marquette Operations. We still have your equipment on record. Please return your radio and/or credit card reader to the festival office as soon as possible. Thank you!",
  });
  const [notifDirty,setNotifDirty] = useState(false);
  const [syncStatus,setSyncStatus] = useState("loading"); // loading | synced | offline
  const [lastSynced,setLastSynced] = useState(null);

  // ── SERVER SYNC — pulls the shared Airtable-backed state so multiple devices agree ──
  async function pullFromServer(silent){
    try{
      const res = await fetch("/.netlify/functions/equipment-action");
      const data = await res.json();
      const items = data.items || [];
      if(items.length === 0){
        // Fresh table — seed it with our current local state so it has a baseline
        const seedItems = [...radios, ...readers].map(it=>({itemId:it.id, status:it.status, serial:it.serial}));
        fetch("/.netlify/functions/equipment-action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"seed",items:seedItems})}).catch(()=>{});
        setSyncStatus("synced");setLastSynced(new Date());
        return;
      }
      const byId = Object.fromEntries(items.map(it=>[it.itemId,it]));
      setRadios(p=>p.map(r=>byId[r.id]?{...r,location:byId[r.id].location||r.location,serial:byId[r.id].serial||r.serial,status:byId[r.id].status||r.status,checkedOutBy:byId[r.id].checkedOutBy||"",checkedOutAt:byId[r.id].checkedOutAt||null,checkedInBy:byId[r.id].checkedInBy||"",checkedInAt:byId[r.id].checkedInAt||null}:r));
      setReaders(p=>p.map(r=>byId[r.id]?{...r,location:byId[r.id].location!==undefined?byId[r.id].location:r.location,serial:byId[r.id].serial||r.serial,status:byId[r.id].status||r.status,checkedOutBy:byId[r.id].checkedOutBy||"",checkedOutAt:byId[r.id].checkedOutAt||null,checkedInBy:byId[r.id].checkedInBy||"",checkedInAt:byId[r.id].checkedInAt||null}:r));
      setSyncStatus("synced");setLastSynced(new Date());
    }catch(e){
      setSyncStatus("offline");
    }
  }
  useEffect(()=>{
    pullFromServer();
    const interval=setInterval(()=>pullFromServer(true),20000); // pick up other devices' changes every 20s
    return ()=>clearInterval(interval);
  },[]);
  function pushToServer(action,itemId,extra){
    fetch("/.netlify/functions/equipment-action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,itemId,...extra})}).catch(()=>setSyncStatus("offline"));
  }

  // Persist
  useEffect(()=>{save({radios,readers,log,notifSettings});},[radios,readers,log,notifSettings]);

  const addLog = (msg)=>setLog(p=>[{id:Date.now(),ts:dt(),msg},...p].slice(0,200));

  // Derived
  const allItems = [
    ...radios.map(r=>({...r,type:"radio"})),
    ...readers.map(r=>({...r,type:"reader"}))
  ];

  const out = allItems.filter(i=>i.status==="out").length;
  const available = allItems.filter(i=>i.status==="available").length;
  const returned = allItems.filter(i=>i.status==="returned").length;

  function syncFields(id,fields){
    if(fields.location!==undefined) pushToServer("location",id,{location:fields.location});
    if(fields.serial!==undefined) pushToServer("serial",id,{serial:fields.serial});
    if(fields.status==="out") pushToServer("checkout",id,{checkedOutBy:fields.checkedOutBy});
    if(fields.status==="returned") pushToServer("checkin",id,{checkedInBy:fields.checkedInBy});
  }
  function updateRadio(id,fields){
    setRadios(p=>p.map(r=>r.id===id?{...r,...fields}:r));
    syncFields(id,fields);
  }
  function updateReader(id,fields){
    setReaders(p=>p.map(r=>r.id===id?{...r,...fields}:r));
    syncFields(id,fields);
  }
  function updateItem(type,id,fields){
    type==="radio"?updateRadio(id,fields):updateReader(id,fields);
  }

  function checkout(type,id,name){
    if(!name.trim()) return;
    updateItem(type,id,{status:"out",checkedOutBy:name,checkedOutAt:ts(),checkedInBy:"",checkedInAt:null});
    addLog(`${id} checked out to ${name}`);
    setCheckoutName("");setSelectedItem(null);
  }
  function checkin(type,id,byName,isAdmin){
    updateItem(type,id,{status:"returned",checkedInBy:byName||(isAdmin?"Admin Override":""),checkedInAt:ts()});
    addLog(`${id} checked in by ${byName||"Admin"}`);
    setCheckinName("");setSelectedItem(null);
  }
  function resetAll(){
    if(!window.confirm("Reset all equipment to Available? This clears all check-out data.")) return;
    setRadios(p=>p.map(r=>({...r,status:"available",checkedOutBy:"",checkedOutAt:null,checkedInBy:"",checkedInAt:null})));
    setReaders(p=>p.map(r=>({...r,status:"available",checkedOutBy:"",checkedOutAt:null,checkedInBy:"",checkedInAt:null})));
    [...radios,...readers].forEach(it=>pushToServer("reset",it.id));
    addLog("Full reset by Admin");
  }

  const selItem = selectedItem ? (selectedItem.type==="radio"?radios:readers).find(i=>i.id===selectedItem.id) : null;

  // Filter helper
  function filterItems(items){
    return items.filter(i=>{
      const q=searchQ.toLowerCase();
      const matchQ=!q||i.label.toLowerCase().includes(q)||i.location.toLowerCase().includes(q)||(i.serial||"").toLowerCase().includes(q)||(i.checkedOutBy||"").toLowerCase().includes(q);
      const matchS=filterStatus==="all"||i.status===filterStatus;
      return matchQ&&matchS;
    });
  }

  // ── ITEM DETAIL MODAL ─────────────────────────────────────────────────────────
  if(selectedItem&&selItem){
    const isOut = selItem.status==="out";
    const isAvail = selItem.status==="available";
    return(
      <div style={S.root}>
        <div style={S.panel}>
          <div style={S.hdr}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button style={{...S.btn,background:"rgba(255,255,255,0.1)",color:"#f1f5f9"}} onClick={()=>setSelectedItem(null)}>← Back</button>
              {cameFromHub&&<button title="Back to Hub" style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"#f59e0b",fontSize:15,padding:"6px 9px",cursor:"pointer"}} onClick={()=>{window.location.href="/hub";}}>🏠</button>}
            </div>
            <span style={{fontWeight:800,color:"#f59e0b",fontSize:16}}>{selItem.label}</span>
            <Badge status={selItem.status}/>
          </div>
          <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{...S.card,padding:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13}}>
                <div><div style={{color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Location</div><div style={{color:selItem.location?"#f1f5f9":"#fbbf24",fontWeight:700}}>{selItem.location||"⚠️ Not assigned yet"}</div></div>
                <div><div style={{color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Serial #</div><div style={{color:"#f1f5f9",fontWeight:700}}>{selItem.serial||"—"}</div></div>
                {selItem.checkedOutBy&&<div><div style={{color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Checked Out By</div><div style={{color:"#fbbf24",fontWeight:700}}>{selItem.checkedOutBy}</div></div>}
                {selItem.checkedOutAt&&<div><div style={{color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>At</div><div style={{color:"#f1f5f9"}}>{selItem.checkedOutAt}</div></div>}
                {selItem.checkedInBy&&<div><div style={{color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Checked In By</div><div style={{color:"#6ee7b7",fontWeight:700}}>{selItem.checkedInBy}</div></div>}
                {selItem.checkedInAt&&<div><div style={{color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>At</div><div style={{color:"#f1f5f9"}}>{selItem.checkedInAt}</div></div>}
              </div>
            </div>

            {isAvail&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>Check Out</div>
                <input style={S.inp} placeholder="Name checking out *" value={checkoutName} onChange={e=>setCheckoutName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&checkout(selectedItem.type,selItem.id,checkoutName)}/>
                <button style={{...S.btn,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#0a0f1e",opacity:!checkoutName?0.5:1}} disabled={!checkoutName} onClick={()=>checkout(selectedItem.type,selItem.id,checkoutName)}>📤 Check Out</button>
              </div>
            )}

            {isOut&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:13,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>Check In / Return</div>
                <input style={S.inp} placeholder="Your name (returning)" value={checkinName} onChange={e=>setCheckinName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&checkin(selectedItem.type,selItem.id,checkinName,false)}/>
                <button style={{...S.btn,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",opacity:!checkinName?0.5:1}} disabled={!checkinName} onClick={()=>checkin(selectedItem.type,selItem.id,checkinName,false)}>✅ Return Equipment</button>
                {adminUnlocked&&<button style={{...S.btn,background:"rgba(99,102,241,0.3)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.5)"}} onClick={()=>checkin(selectedItem.type,selItem.id,"Admin Override",true)}>👤 Admin Override — Force Check In</button>}
              </div>
            )}

            {selItem.status==="returned"&&adminUnlocked&&(
              <button style={{...S.btn,background:"rgba(245,158,11,0.2)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.4)"}} onClick={()=>{updateItem(selectedItem.type,selItem.id,{status:"available",checkedOutBy:"",checkedOutAt:null,checkedInBy:"",checkedInAt:null});addLog(`${selItem.id} reset to Available by Admin`);setSelectedItem(null);}}>🔄 Reset to Available</button>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase"}}>Notes</div>
              <textarea style={{...S.inp,resize:"vertical",height:80}} placeholder="Optional notes..." value={selItem.notes} onChange={e=>updateItem(selectedItem.type,selItem.id,{notes:e.target.value})}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN PIN GATE ────────────────────────────────────────────────────────────
  if(tab==="admin"&&!adminUnlocked){
    return(
      <div style={S.root}>
        <div style={S.panel}>
          <div style={S.hdr}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button style={{...S.btn,background:"rgba(255,255,255,0.1)",color:"#f1f5f9"}} onClick={()=>setTab("overview")}>← Back</button>
              {cameFromHub&&<button title="Back to Hub" style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"#f59e0b",fontSize:15,padding:"6px 9px",cursor:"pointer"}} onClick={()=>{window.location.href="/hub";}}>🏠</button>}
            </div>
            <span style={{fontWeight:800,color:"#f59e0b"}}>Admin Access</span>
            <span/>
          </div>
          <div style={{padding:"60px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div style={{fontSize:40}}>🔐</div>
            <div style={{fontSize:18,fontWeight:800,color:"#f1f5f9"}}>Enter Admin PIN</div>
            <input style={{...S.inp,maxWidth:200,textAlign:"center",fontSize:28,fontWeight:900,letterSpacing:"0.2em"}} type="password" maxLength={4} placeholder="• • • •" value={pinInput} onChange={e=>{setPinInput(e.target.value);setPinError("");}} onKeyDown={e=>{if(e.key==="Enter"){if(pinInput===ADMIN_PIN){setAdminUnlocked(true);}else{setPinError("Incorrect PIN");}}}}/>
            {pinError&&<div style={{color:"#ef4444",fontSize:14}}>{pinError}</div>}
            <button style={{...S.btn,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#0a0f1e"}} onClick={()=>{if(pinInput===ADMIN_PIN){setAdminUnlocked(true);}else{setPinError("Incorrect PIN");}}}>Enter</button>
          </div>
        </div>
      </div>
    );
  }

  // ── NOTIFICATIONS TAB ─────────────────────────────────────────────────────────
  if(tab==="notifications"){
    return(
      <div style={S.root}>
        <div style={S.panel}>
          <div style={S.hdr}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button style={{...S.btn,background:"rgba(255,255,255,0.1)",color:"#f1f5f9"}} onClick={()=>setTab("overview")}>← Back</button>
              {cameFromHub&&<button title="Back to Hub" style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"#f59e0b",fontSize:15,padding:"6px 9px",cursor:"pointer"}} onClick={()=>{window.location.href="/hub";}}>🏠</button>}
            </div>
            <span style={{fontWeight:800,color:"#f59e0b"}}>🔔 Notifications</span>
            <button style={{...S.btn,background:notifDirty?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,0.06)",color:notifDirty?"#fff":"#64748b",fontSize:12}} onClick={()=>{setNotifDirty(false);addLog("Notification settings saved");}}>💾 Save</button>
          </div>
          <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:20}}>

            {/* PRE-EVENT */}
            <div style={{...S.card,border:"1px solid rgba(245,158,11,0.3)"}}>
              <div style={{background:"rgba(245,158,11,0.15)",padding:"10px 14px",fontSize:13,fontWeight:900,color:"#fbbf24",textTransform:"uppercase",letterSpacing:"0.06em"}}>⏰ Pre-Event</div>
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Broadcast Reminder Time (daily)</div>
                  <div style={{fontSize:12,color:"#475569",marginBottom:6}}>SMS fires to all staff with assigned bundles at this time each event day</div>
                  <input type="time" style={{...S.inp,width:"auto"}} value={notifSettings.preEventTime} onChange={e=>{setNotifSettings(p=>({...p,preEventTime:e.target.value}));setNotifDirty(true);}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Individual Follow-up (mins before event)</div>
                  <div style={{fontSize:12,color:"#475569",marginBottom:6}}>If bundle not picked up → individual SMS + voice fires</div>
                  <div style={{display:"flex",gap:8}}>
                    {["15","30","45","60"].map(m=>(
                      <button key={m} style={{...S.btn,padding:"8px 14px",background:notifSettings.followupMins===m?"rgba(245,158,11,0.2)":"rgba(255,255,255,0.04)",color:notifSettings.followupMins===m?"#fbbf24":"#64748b",border:`1px solid ${notifSettings.followupMins===m?"rgba(245,158,11,0.4)":"rgba(255,255,255,0.1)"}`,fontSize:13}} onClick={()=>{setNotifSettings(p=>({...p,followupMins:m}));setNotifDirty(true);}}>{m}m</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>📱 Broadcast SMS</div>
                  <textarea style={{...S.inp,resize:"vertical",height:90,lineHeight:1.5}} value={notifSettings.broadcastSMS} onChange={e=>{setNotifSettings(p=>({...p,broadcastSMS:e.target.value}));setNotifDirty(true);}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>📱 Follow-up SMS</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:4}}>[Name] will be replaced with the staff member's name</div>
                  <textarea style={{...S.inp,resize:"vertical",height:90,lineHeight:1.5}} value={notifSettings.followupSMS} onChange={e=>{setNotifSettings(p=>({...p,followupSMS:e.target.value}));setNotifDirty(true);}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{...S.btn,flex:1,background:"rgba(245,158,11,0.15)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.3)",fontSize:13}} onClick={()=>alert("Sim: Would send broadcast SMS to all assigned staff")}>📤 Sim Broadcast</button>
                  <button style={{...S.btn,flex:1,background:"rgba(99,102,241,0.15)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.3)",fontSize:13}} onClick={()=>alert("Sim: Would send individual follow-up to unpicked-up staff")}>📞 Sim Follow-up</button>
                </div>
              </div>
            </div>

            {/* POST-EVENT */}
            <div style={{...S.card,border:"1px solid rgba(99,102,241,0.3)"}}>
              <div style={{background:"rgba(99,102,241,0.15)",padding:"10px 14px",fontSize:13,fontWeight:900,color:"#a5b4fc",textTransform:"uppercase",letterSpacing:"0.06em"}}>🌙 Post-Event</div>
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Event Close Time</div>
                  <div style={{fontSize:12,color:"#475569",marginBottom:6}}>Broadcast fires at close. 30-min follow-up runs automatically.</div>
                  <input type="time" style={{...S.inp,width:"auto"}} value={notifSettings.postEventTime} onChange={e=>{setNotifSettings(p=>({...p,postEventTime:e.target.value}));setNotifDirty(true);}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>📱 Broadcast SMS</div>
                  <textarea style={{...S.inp,resize:"vertical",height:90,lineHeight:1.5}} value={notifSettings.postBroadcastSMS} onChange={e=>{setNotifSettings(p=>({...p,postBroadcastSMS:e.target.value}));setNotifDirty(true);}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>📱 30-Min Follow-up SMS</div>
                  <div style={{fontSize:11,color:"#475569",marginBottom:4}}>[Name] will be replaced with the staff member's name</div>
                  <textarea style={{...S.inp,resize:"vertical",height:90,lineHeight:1.5}} value={notifSettings.post30SMS} onChange={e=>{setNotifSettings(p=>({...p,post30SMS:e.target.value}));setNotifDirty(true);}}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{...S.btn,flex:1,background:"rgba(99,102,241,0.15)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.3)",fontSize:13}} onClick={()=>alert("Sim: Would send post-event broadcast SMS")}>📤 Sim Broadcast</button>
                  <button style={{...S.btn,flex:1,background:"rgba(239,68,68,0.15)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.3)",fontSize:13}} onClick={()=>alert("Sim: Would send 30-min follow-up to unreturned staff")}>📞 Sim 30-Min</button>
                </div>
              </div>
            </div>

            {/* CUSTOM INDIVIDUAL */}
            <div style={{...S.card,border:"1px solid rgba(16,185,129,0.3)"}}>
              <div style={{background:"rgba(16,185,129,0.12)",padding:"10px 14px",fontSize:13,fontWeight:900,color:"#6ee7b7",textTransform:"uppercase",letterSpacing:"0.06em"}}>✉️ Custom Individual Reminder</div>
              <div style={{padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:12,color:"#64748b"}}>Send a one-off SMS + voice call to any person</div>
                <input style={S.inp} placeholder="Name"/>
                <input style={S.inp} placeholder="Phone Number" type="tel"/>
                <textarea style={{...S.inp,resize:"vertical",height:80}} placeholder="Message" defaultValue="Please return your equipment to the festival office."/>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"#64748b",alignSelf:"center"}}>Quick Templates</span>
                  <button style={{...S.btn,padding:"6px 12px",background:"rgba(255,255,255,0.06)",color:"#94a3b8",fontSize:12,border:"1px solid rgba(255,255,255,0.1)"}} onClick={()=>{}}>Pick up your equipment</button>
                  <button style={{...S.btn,padding:"6px 12px",background:"rgba(255,255,255,0.06)",color:"#94a3b8",fontSize:12,border:"1px solid rgba(255,255,255,0.1)"}} onClick={()=>{}}>Return your equipment</button>
                </div>
                <button style={{...S.btn,background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff"}}>📱 Send SMS + Voice Call</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN TAB ─────────────────────────────────────────────────────────────────
  if(tab==="admin"){
    const adminItems = allItems.filter(i=>{
      const q=adminSearch.toLowerCase();
      return !q||i.label.toLowerCase().includes(q)||i.location.toLowerCase().includes(q)||(i.serial||"").toLowerCase().includes(q)||(i.checkedOutBy||"").toLowerCase().includes(q);
    });
    return(
      <div style={S.root}>
        <div style={S.panel}>
          <div style={S.hdr}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button style={{...S.btn,background:"rgba(255,255,255,0.1)",color:"#f1f5f9"}} onClick={()=>setTab("overview")}>← Back</button>
              {cameFromHub&&<button title="Back to Hub" style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"#f59e0b",fontSize:15,padding:"6px 9px",cursor:"pointer"}} onClick={()=>{window.location.href="/hub";}}>🏠</button>}
            </div>
            <span style={{fontWeight:800,color:"#f59e0b"}}>⚙️ Admin</span>
            <button style={{...S.btn,background:"rgba(239,68,68,0.2)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.4)",fontSize:12}} onClick={resetAll}>Reset All</button>
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>

            {/* Serial Numbers + Locations */}
            <div style={{...S.card,border:"1px solid rgba(245,158,11,0.3)"}}>
              <div style={{background:"rgba(245,158,11,0.12)",padding:"10px 14px",fontSize:13,fontWeight:900,color:"#fbbf24",textTransform:"uppercase",letterSpacing:"0.06em"}}>📟 Serial # &amp; Location</div>
              <div style={{padding:"10px",display:"flex",flexDirection:"column",gap:0}}>
                <div style={{fontSize:11,color:"#64748b",padding:"0 4px 8px"}}>📻 Radios (18) — assigned by role/location, see list</div>
                {radios.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",minWidth:70}}>{r.label}</div>
                    <select style={{...S.inp,width:150,fontSize:12,padding:"6px 8px"}} value={r.location} onChange={e=>updateRadio(r.id,{location:e.target.value})}>
                      <option value="">— Unassigned —</option>
                      {RADIO_LOCATIONS.map((loc,i)=><option key={loc+i} value={loc}>{loc}</option>)}
                      {!RADIO_LOCATIONS.includes(r.location)&&r.location&&<option value={r.location}>{r.location}</option>}
                    </select>
                    <input style={{...S.inp,width:100,fontSize:12,padding:"6px 8px"}} placeholder="Serial #" value={editSerial[r.id]!==undefined?editSerial[r.id]:r.serial} onChange={e=>setEditSerial(p=>({...p,[r.id]:e.target.value}))}
                      onBlur={()=>{if(editSerial[r.id]!==undefined){updateRadio(r.id,{serial:editSerial[r.id]});setEditSerial(p=>{const n={...p};delete n[r.id];return n;});}}}/>
                  </div>
                ))}
                <div style={{fontSize:11,color:"#64748b",padding:"12px 4px 8px"}}>💳 Readers (22) — bars (no Lagniappe) + prize wheel — assign here</div>
                {readers.map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",minWidth:70}}>{r.label}</div>
                    <select style={{...S.inp,width:150,fontSize:12,padding:"6px 8px",border:!r.location?"1px solid rgba(245,158,11,0.5)":S.inp.border}} value={r.location} onChange={e=>updateReader(r.id,{location:e.target.value})}>
                      <option value="">⚠️ Not assigned yet</option>
                      {READER_LOCATIONS.map(loc=><option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    <input style={{...S.inp,width:100,fontSize:12,padding:"6px 8px"}} placeholder="Serial #" value={editSerial[r.id]!==undefined?editSerial[r.id]:r.serial} onChange={e=>setEditSerial(p=>({...p,[r.id]:e.target.value}))}
                      onBlur={()=>{if(editSerial[r.id]!==undefined){updateReader(r.id,{serial:editSerial[r.id]});setEditSerial(p=>{const n={...p};delete n[r.id];return n;});}}}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Check-in Override */}
            <div style={{...S.card,border:"1px solid rgba(99,102,241,0.3)"}}>
              <div style={{background:"rgba(99,102,241,0.12)",padding:"10px 14px",fontSize:13,fontWeight:900,color:"#a5b4fc",textTransform:"uppercase",letterSpacing:"0.06em"}}>👤 Admin Check-In Override</div>
              <div style={{padding:"10px"}}>
                <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>Force check-in any item — use when staff can't scan themselves</div>
                <input style={{...S.inp,marginBottom:8}} placeholder="Search by name, location, serial..." value={adminSearch} onChange={e=>setAdminSearch(e.target.value)}/>
                {adminItems.filter(i=>i.status==="out").map(i=>(
                  <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px",borderRadius:10,border:"1px solid rgba(245,158,11,0.2)",background:"rgba(245,158,11,0.06)",marginBottom:6}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{i.label} <span style={{fontSize:11,color:"#64748b"}}>· {i.location}</span></div>
                      <div style={{fontSize:12,color:"#fbbf24"}}>Out: {i.checkedOutBy} · {i.checkedOutAt}</div>
                    </div>
                    <button style={{...S.btn,padding:"8px 14px",background:"rgba(16,185,129,0.2)",color:"#6ee7b7",border:"1px solid rgba(16,185,129,0.4)",fontSize:12}} onClick={()=>checkin(i.type,i.id,"Admin Override",true)}>✅ Force In</button>
                  </div>
                ))}
                {adminItems.filter(i=>i.status==="out").length===0&&<div style={{fontSize:13,color:"#475569",padding:"8px 0"}}>No items currently checked out.</div>}
              </div>
            </div>

            {/* Activity Log */}
            <div style={{...S.card}}>
              <div style={{padding:"10px 14px",fontSize:13,fontWeight:900,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>📋 Activity Log</div>
              <div style={{padding:"0 10px 10px",maxHeight:300,overflowY:"auto"}}>
                {log.length===0&&<div style={{fontSize:13,color:"#475569",padding:"8px 0"}}>No activity yet.</div>}
                {log.map(l=>(
                  <div key={l.id} style={{padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12}}>
                    <span style={{color:"#f59e0b",marginRight:8}}>{l.ts}</span>
                    <span style={{color:"#94a3b8"}}>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <BottomNav tab={tab} setTab={setTab} adminUnlocked={adminUnlocked}/>
      </div>
    );
  }

  // ── ITEMS LIST (radios / readers) ─────────────────────────────────────────────
  if(tab==="radios"||tab==="readers"){
    const items = filterItems(tab==="radios"?radios.map(r=>({...r,type:"radio"})):readers.map(r=>({...r,type:"reader"})));
    return(
      <div style={S.root}>
        <div style={S.panel}>
          <div style={S.hdr}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button style={{...S.btn,background:"rgba(255,255,255,0.1)",color:"#f1f5f9"}} onClick={()=>setTab("overview")}>← Back</button>
              {cameFromHub&&<button title="Back to Hub" style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,color:"#f59e0b",fontSize:15,padding:"6px 9px",cursor:"pointer"}} onClick={()=>{window.location.href="/hub";}}>🏠</button>}
            </div>
            <span style={{fontWeight:800,color:"#f59e0b"}}>{tab==="radios"?"📻 Radios":"💳 Readers"}</span>
            <span style={{fontSize:12,color:"#64748b"}}>{items.length} items</span>
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
            <input style={S.inp} placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            <div style={{display:"flex",gap:6}}>
              {["all","available","out","returned"].map(s=>(
                <button key={s} style={{...S.btn,padding:"6px 12px",fontSize:12,background:filterStatus===s?"rgba(245,158,11,0.2)":"rgba(255,255,255,0.04)",color:filterStatus===s?"#fbbf24":"#64748b",border:`1px solid ${filterStatus===s?"rgba(245,158,11,0.4)":"rgba(255,255,255,0.08)"}`}} onClick={()=>setFilterStatus(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
              ))}
            </div>
            {items.map(i=>(
              <button key={i.id} style={{...S.card,padding:"12px",display:"flex",alignItems:"center",gap:12,border:`1px solid ${i.status==="out"?"rgba(245,158,11,0.3)":i.status==="returned"?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.08)"}`,cursor:"pointer",background:i.status==="out"?"rgba(245,158,11,0.05)":i.status==="returned"?"rgba(99,102,241,0.05)":"rgba(255,255,255,0.02)",textAlign:"left",width:"100%"}}
                onClick={()=>setSelectedItem({type:i.type,id:i.id})}>
                <div style={{width:40,height:40,borderRadius:8,background:i.status==="out"?"rgba(245,158,11,0.2)":i.status==="returned"?"rgba(99,102,241,0.2)":"rgba(16,185,129,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {i.type==="radio"?"📻":"💳"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>{i.label} {i.serial&&<span style={{fontSize:11,color:"#64748b",fontWeight:400}}>#{i.serial}</span>}</div>
                  <div style={{fontSize:12,color:i.location?"#64748b":"#fbbf24"}}>{i.location||"⚠️ Not assigned yet"}</div>
                  {i.status==="out"&&<div style={{fontSize:12,color:"#fbbf24",marginTop:2}}>→ {i.checkedOutBy} · {i.checkedOutAt}</div>}
                  {i.status==="returned"&&<div style={{fontSize:12,color:"#a5b4fc",marginTop:2}}>Returned by {i.checkedInBy} · {i.checkedInAt}</div>}
                </div>
                <Badge status={i.status}/>
              </button>
            ))}
          </div>
        </div>
        <BottomNav tab={tab} setTab={setTab} adminUnlocked={adminUnlocked}/>
      </div>
    );
  }

  // ── OVERVIEW ──────────────────────────────────────────────────────────────────
  const outItems = allItems.filter(i=>i.status==="out");
  const notReturned = allItems.filter(i=>i.status==="out"||i.status==="available").filter(i=>i.checkedOutBy); // has been out and not returned
  return(
    <div style={S.root}>
      <div style={S.panel}>
        <div style={S.hdr}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {cameFromHub&&<button style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,color:"#f1f5f9",fontSize:18,padding:"4px 10px",cursor:"pointer"}} onClick={()=>{window.location.href="/hub";}}>←</button>}
            <div>
              <div style={{fontSize:18,fontWeight:900,color:"#f59e0b"}}>📻 Equipment Tracker</div>
              <div style={{fontSize:11,color:"#64748b"}}>Fête de Marquette 2026</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button title="Refresh from other devices" style={{background:"none",border:"none",color:syncStatus==="offline"?"#ef4444":"#4ade80",fontSize:16,cursor:"pointer",padding:4}} onClick={()=>{setSyncStatus("loading");pullFromServer();}}>
              {syncStatus==="loading"?"⏳":syncStatus==="offline"?"⚠️":"🔄"}
            </button>
            <button style={{...S.btn,background:"rgba(245,158,11,0.15)",color:"#fbbf24",border:"1px solid rgba(245,158,11,0.3)",fontSize:12}} onClick={()=>setTab("notifications")}>🔔 Notifications</button>
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:10,color:syncStatus==="offline"?"#ef4444":"#64748b",padding:"4px 0 8px",background:"#0a0f1e"}}>
          {syncStatus==="offline"?"⚠️ Offline — showing this device's last known data":syncStatus==="loading"?"Syncing...":lastSynced?`Synced across devices · ${lastSynced.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}`:""}
        </div>

        <div style={{padding:"16px"}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {[["📤",out,"Out","rgba(245,158,11,0.3)","#fbbf24"],["✅",available,"Available","rgba(16,185,129,0.3)","#6ee7b7"],["🔄",returned,"Returned","rgba(99,102,241,0.3)","#a5b4fc"]].map(([icon,count,label,bg,color])=>(
              <div key={label} style={{...S.card,padding:"14px 10px",textAlign:"center",border:`1px solid ${bg}`}}>
                <div style={{fontSize:22,fontWeight:900,color}}>{count}</div>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",fontWeight:700,marginTop:2}}>{icon} {label}</div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            <button style={{...S.card,padding:"16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:"1px solid rgba(245,158,11,0.2)",textAlign:"left"}} onClick={()=>setTab("radios")}>
              <span style={{fontSize:28}}>📻</span>
              <div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>Radios</div><div style={{fontSize:12,color:"#64748b"}}>{radios.filter(r=>r.status==="out").length} out of {radios.length}</div></div>
            </button>
            <button style={{...S.card,padding:"16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",border:"1px solid rgba(99,102,241,0.2)",textAlign:"left"}} onClick={()=>setTab("readers")}>
              <span style={{fontSize:28}}>💳</span>
              <div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>Readers</div><div style={{fontSize:12,color:"#64748b"}}>{readers.filter(r=>r.status==="out").length} out of {readers.length}</div></div>
            </button>
          </div>

          {/* Currently out */}
          {outItems.length>0&&<>
            <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Currently Out ({outItems.length})</div>
            {outItems.map(i=>(
              <button key={i.id} style={{...S.card,padding:"12px",display:"flex",alignItems:"center",gap:10,marginBottom:6,border:"1px solid rgba(245,158,11,0.25)",background:"rgba(245,158,11,0.04)",cursor:"pointer",textAlign:"left",width:"100%"}} onClick={()=>setSelectedItem({type:i.type,id:i.id})}>
                <span style={{fontSize:20}}>{i.type==="radio"?"📻":"💳"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{i.label} <span style={{fontSize:11,color:"#64748b"}}>· {i.location}</span></div>
                  <div style={{fontSize:12,color:"#fbbf24"}}>{i.checkedOutBy} · {i.checkedOutAt}</div>
                </div>
                <span style={{color:"#64748b",fontSize:12}}>→</span>
              </button>
            ))}
          </>}

          {outItems.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#475569",fontSize:14}}>All equipment accounted for ✅</div>}
        </div>
      </div>
      <BottomNav tab={tab} setTab={setTab} adminUnlocked={adminUnlocked}/>
    </div>
  );
}

function BottomNav({tab,setTab,adminUnlocked}){
  const tabs=[["overview","🏠","Home"],["radios","📻","Radios"],["readers","💳","Readers"],["admin","⚙️","Admin"]];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(10,15,30,0.97)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",zIndex:100}}>
      {tabs.map(([id,icon,label])=>(
        <button key={id} style={{flex:1,padding:"12px 0",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <span style={{fontSize:20,opacity:tab===id?1:0.5}} onClick={()=>setTab(id)}>{icon}</span>
          <span style={{fontSize:10,color:tab===id?"#f59e0b":"#475569",fontWeight:tab===id?700:400}}>{label}{id==="admin"&&adminUnlocked?" 🔓":""}</span>
        </button>
      ))}
    </div>
  );
}
