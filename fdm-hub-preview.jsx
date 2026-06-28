const {useState,useEffect,useRef,useCallback,useMemo}=React;



const ALL_LOCS=["Moon Stage 1","Moon Stage 2","Lafayette","Lagniappe","Sun Left","Sun Right","Cabaret","Financial 1","Greeter Head Ingersoll Left","Greeter Head Ingersoll Right","Greeter Head Few","Moon Stage Manager","Lagniappe Manager","Lafayette Manager","Sun Stage Manager","Cabaret Manager","Med 1","Med 2","Hospitality","First Aid","Merch Tent","Sun Stage Vendors","Moon Stage Vendors","Lafayette Vendors"];


const ALERT_COLORS={
  medical:   {bg:"rgba(190,24,93,0.15)",  border:"rgba(219,39,119,0.6)",  full:"rgba(157,23,77,0.97)",  full2:"rgba(190,24,93,0.95)",  label:"MEDICAL ALERT",     icon:"🩺"},
  walk_in:   {bg:"rgba(190,24,93,0.15)",  border:"rgba(219,39,119,0.6)",  full:"rgba(157,23,77,0.97)",  full2:"rgba(190,24,93,0.95)",  label:"WALK-IN PATIENT",   icon:"🚶"},
  fire:      {bg:"rgba(153,27,27,0.15)",  border:"rgba(220,38,38,0.6)",   full:"rgba(153,27,27,0.97)",  full2:"rgba(185,28,28,0.95)",  label:"FIRE / LIFE SAFETY",icon:"🔥"},
  security:  {bg:"rgba(29,78,216,0.15)",  border:"rgba(59,130,246,0.6)",  full:"rgba(29,78,216,0.97)",  full2:"rgba(37,99,235,0.95)",  label:"SECURITY ALERT",    icon:"🛡"},
  supplies:  {bg:"rgba(92,40,4,0.20)",    border:"rgba(146,64,14,0.6)",   full:"rgba(69,26,3,0.97)",    full2:"rgba(92,40,4,0.95)",    label:"SUPPLIES REQUEST",  icon:"📦"},
  maintenance:{bg:"rgba(20,83,45,0.20)",  border:"rgba(22,101,52,0.6)",   full:"rgba(20,83,45,0.97)",   full2:"rgba(21,128,61,0.95)",  label:"MAINTENANCE",       icon:"🔧"},
  lost_child:{bg:"rgba(202,138,4,0.15)",  border:"rgba(234,179,8,0.6)",   full:"rgba(202,138,4,0.90)",  full2:"rgba(234,179,8,0.95)",  label:"LOST CHILD",        icon:"🧒"},
};

const POSTPONE_REASONS=["Weather","Safety Concern","Unforeseen Circumstances","Other"];
const CANCEL_REASONS=["Weather","Safety Concern","Unforeseen Circumstances","Other"];

const BROADCAST_ALERTS=[
  {id:"weather_imminent",label:"⛈ Inclement Weather Imminent",color:"#dc2626",
   requiresWeatherType:true,
   defaultMsg:"ATTENTION ALL STAFF AND VENDORS: There is dangerous weather ([WEATHER_TYPE]) approaching festival grounds. Expected arrival: [TIME]. Please begin storm procedures and secure all items immediately. Food, beverage, and merchandise sales are postponed until further notice. Additional information will follow.\n\nREPLY YES TO CONFIRM YOU RECEIVED THIS MESSAGE.",
   fields:[]},
  {id:"event_delayed",label:"⏰ Event Delayed",color:"#f59e0b",
   defaultMsg:"Attention all staff and vendors — Fête de Marquette has been delayed. Expected resumption: [TIME]. Further information will be provided as it becomes available.\n\nREPLY YES TO CONFIRM YOU RECEIVED THIS MESSAGE.",
   fields:[{key:"duration",label:"Estimated Delay",ph:"e.g. 30 minutes"}]},
  {id:"event_postponed",label:"🔄 Event Postponed",color:"#f97316",
   requiresReason:true,reasonType:"postpone",
   defaultMsg:"Attention all staff and vendors — Fête de Marquette has been postponed due to [REASON]. Food, beverage, and merchandise sales should stop immediately and shutdown procedures should begin.\n\nREPLY YES TO CONFIRM YOU RECEIVED THIS MESSAGE.",
   fields:[]},
  {id:"event_resuming",label:"🔁 Event Resuming",color:"#10b981",
   defaultMsg:"Attention all staff — Fête de Marquette will be resuming shortly. Further information will be provided via the festival app and messaging.",
   fields:[]},
  {id:"event_cancelled_staff",label:"❌ Cancelled — Staff & Vendors",color:"#dc2626",
   requiresReason:true,reasonType:"cancel",
   defaultMsg:"Attention all staff and vendors — due to [REASON], Fête de Marquette has been cancelled for today. Food, beverage, and merchandise sales should stop immediately. Please proceed with shutdown procedures.\n\nREPLY YES TO CONFIRM YOU RECEIVED THIS MESSAGE.",
   fields:[]},

  {id:"all_clear",label:"☀ All Clear",color:"#059669",
   defaultMsg:"Attention all staff and vendors — all dangerous weather has passed and Fête de Marquette will be resuming shortly. Further information will be provided via the festival app and messaging.",
   fields:[]},
  {id:"custom",label:"✏ Custom Message",color:"#475569",fields:[
    {key:"channel",label:"Send To",type:"select",options:[{value:"all_staff",label:"All Staff"},{value:"vendors",label:"All Vendors"},{value:"stage_mgrs",label:"Managers Only"},{value:"all",label:"All Staff + Vendors"}]},
    {key:"message",label:"Message",ph:"Type your message..."}
  ]},
];

const EMS_STAGING=[
  {id:"1",label:"#1 — First Aid Tent · Ingersoll & Wilson"},
  {id:"2",label:"#2 — Main & Ingersoll"},
  {id:"3",label:"#3 — Brearly & Willy St"},
];

const RESOURCE_TYPES=[
  {id:"mpd",label:"MPD Officers",emoji:"👮",desc:"Request additional police presence"},
  {id:"mfd",label:"MFD / Fire",emoji:"🚒",desc:"Request fire department response — auto-triggers 911"},
  {id:"ems_festival",label:"Festival Medics",emoji:"🚑",desc:"Request additional festival medical units"},
  {id:"ems_mfd",label:"Madison Fire Medics",emoji:"🏥",desc:"Request Madison Fire Department medics"},
  {id:"maintenance",label:"Maintenance Crew",emoji:"🔧",desc:"Request maintenance personnel"},
  {id:"other",label:"Other Resource",emoji:"📋",desc:"Request any other resource"},
];

const RESTOCK_ITEMS=[
  {id:"ice",label:"Ice",emoji:"🧊"},
  {id:"beer_cups",label:"Beer Cup Sleeves",emoji:"🍺"},
  {id:"wine_cups",label:"Wine Cup Sleeves",emoji:"🍷"},
  {id:"paper_towels",label:"Paper Towels",emoji:"🧻"},
  {id:"bar_towels",label:"BAR TOWELS",emoji:""},
  {id:"water",label:"Bottled Water (24-pack)",emoji:"💧"},
  {id:"other",label:"Other",emoji:"➕"},
];

const QUANTITIES=["1","2","3","4","5","6","7","8","9","10+"];

function now(){return new Date().toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});}
function tShort(){return new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});}
function Bg(){return(<div style={{position:"fixed",inset:0,zIndex:0,background:"radial-gradient(ellipse at 20% 20%, #1a0a2e 0%, #0d0d1a 60%)",overflow:"hidden"}}><div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.012) 1px, transparent 1px)",backgroundSize:"32px 32px"}}/></div>);}
function BB({onClick,label="← Back"}){return(
  <button style={{background:"rgba(255,255,255,0.08)",border:"1.5px solid rgba(255,255,255,0.2)",color:"#f1f5f9",padding:"9px 16px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:800,flexShrink:0,whiteSpace:"nowrap"}} onClick={onClick}>{label}</button>
);
}
function Fld({label,value,onChange,ph,multi,required,large}){return(<div style={{display:"flex",flexDirection:"column",gap:6}}><label style={S.lbl}>{label}{required&&<span style={{color:"#ef4444",marginLeft:4}}>*</span>}</label>{multi?<textarea style={S.ta} rows={3} placeholder={ph} value={value} onChange={onChange}/>:<input style={{...S.inp,fontSize:large?18:14,padding:large?"14px":"10px 12px",fontWeight:large?700:400}} placeholder={ph} value={value} onChange={onChange}/>}</div>);}


const MPD_VOICE_SCRIPT=(location,situation)=>
  `Attention Madison Police Officers — you are requested to respond to ${location} for ${situation}. Please respond promptly. This call has been initiated by Fête de Marquette Operations. Thank you.`;

const MPD_STANDDOWN_VOICE=()=>
  `Per Fête de Marquette Operations — stand down. No response needed. Thank you!`;

const MPD_STANDDOWN_SMS=()=>
  `✅ STAND DOWN\nPer Fête de Marquette Operations — stand down. No response needed. Thank you!`;

const MPD_SMS=(location,situation,requestedBy,timestamp)=>
  `🚨 MPD RESPONSE REQUESTED\nFête de Marquette Operations\n\n📍 Location: ${location}\nSituation: ${situation}\nInitiated by: ${requestedBy} · ${timestamp}\n\nPlease respond promptly. Reply YES to acknowledge.\n— Fête de Marquette Operations`;



const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
let _actx = null;
const getCtx = () => { if(!_actx && AudioCtx) _actx = new AudioCtx(); return _actx; };

const playTone = (cfg) => {
  try {
    const ctx = getCtx(); if(!ctx) return;
    const { pattern=[[440,0.3]], vol=0.5, type="sine", delay=0 } = cfg;
    let t = ctx.currentTime + delay;
    pattern.forEach(([freq, dur, gap=0.05]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.setValueAtTime(vol, t + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t); osc.stop(t + dur);
      t += dur + gap;
    });
  } catch(e) {}
};

const SOUNDS = {
  // LOUD — Medical: rapid urgent beeping
  medical:     ()=>playTone({pattern:[[880,0.12],[880,0.12],[880,0.12],[880,0.12],[1100,0.3]],         vol:0.85, type:"square"}),
  walk_in:     ()=>playTone({pattern:[[880,0.12],[880,0.12],[1100,0.3]],                               vol:0.75, type:"square"}),
  // LOUD — Fire: two-tone alternating siren
  fire:        ()=>playTone({pattern:[[660,0.25],[880,0.25],[660,0.25],[880,0.25],[660,0.25],[880,0.35]], vol:0.9, type:"sawtooth"}),
  // LOUD — Security: heavy pulse
  security:    ()=>playTone({pattern:[[220,0.3,0.08],[220,0.3,0.08],[440,0.4]],                       vol:0.85, type:"square"}),
  // LOUD — Lost Child: urgent repeated chime
  lost_child:  ()=>playTone({pattern:[[523,0.15],[659,0.15],[784,0.15],[659,0.15],[784,0.3]],          vol:0.80, type:"sine"}),
  // TONE — Restock/Maintenance: single loud ding
  supplies:    ()=>playTone({pattern:[[440,0.08],[880,0.4]],                                           vol:0.65, type:"triangle"}),
  maintenance: ()=>playTone({pattern:[[330,0.08],[660,0.4]],                                           vol:0.65, type:"triangle"}),
  // SOFT — Ack / general
  ack:         ()=>playTone({pattern:[[523,0.1],[659,0.15]],                                           vol:0.35, type:"sine"}),
  clear:       ()=>playTone({pattern:[[659,0.1],[523,0.15]],                                           vol:0.3,  type:"sine"}),
  broadcast:   ()=>playTone({pattern:[[440,0.1],[550,0.1],[660,0.2]],                                  vol:0.5,  type:"sine"}),
};

const playAlert = (type) => { const fn = SOUNDS[type]; if(fn) fn(); };


const GROUPME_CHANNELS = {
  all_staff:"all_staff", admin:"admin", medical:"medical",
  bar_stage:"bar_stage", financial:"financial", restock:"restock", maintenance:"maintenance"
};

const sendGroupMe = async (message, channels) => {
  try {
    await fetch('/.netlify/functions/send-groupme', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message, channels })
    });
  } catch(e) { console.log('GroupMe error:', e.message); }
};



// ============================================================
// MED HOME COMPONENT
// ============================================================
function MedHome({role,calls,setCalls,completed,setCompleted,medSt,setMedSt,myActive,unassigned,set911,setView,resourceView,setResourceView,nineOneOne,triggerIncident,sendGroupMe,liveMode,openLostChild,setNewCallView,setNewCallType,setNewCallLocation,setNewCallProblem,staffList,setClearIncView,lfItems}){
  const [tab,setTab]=React.useState("mycalls");
  const [medChatMessages,setMedChatMessages]=React.useState([]);
  const [medChatInput,setMedChatInput]=React.useState("");
  const [medChatSending,setMedChatSending]=React.useState(false);
  const [chatExpanded,setChatExpanded]=React.useState(false);
  const [medChatOpen,setMedChatOpen]=React.useState(false);
  const [medChatChannel,setMedChatChannel]=React.useState("AdminMed");
  const [medDMThread,setMedDMThread]=React.useState(null);
  const [medDMList,setMedDMList]=React.useState([]);
  const [medChatTab,setMedChatTab]=React.useState("channels");
  const myStatus=medSt[role==="Med 1"?"med1":"med2"]||{status:"available"};
  const [reportDone,setReportDone]=React.useState(false);
  const myKey=role==="Med 1"?"med1":"med2";
  const otherRole=role==="Med 1"?"Med 2":"Med 1";

  const MED_CHANNELS=[
    {id:"AdminMed",label:"Admin & Med",emoji:"🏥"},
    {id:"AllStaff",label:"All Staff",emoji:"📢"},
    {id:"MoonBar",label:"Moon Bar",emoji:"🌙"},
    {id:"SunBarL",label:"Sun Bar L",emoji:"☀️"},
    {id:"SunBarR",label:"Sun Bar R",emoji:"☀️"},
    {id:"LafBar",label:"Lafayette Bar",emoji:"🎸"},
    {id:"LagBar",label:"Lagniappe Bar",emoji:"🎺"},
    {id:"FamilyBar",label:"Family Bar",emoji:"👨‍👩‍👧"},
    {id:"CabBar",label:"Cabaret Bar",emoji:"🎭"},
    {id:"EverythingBar",label:"EEC",emoji:"☕"},
    {id:"MoonST",label:"Moon Stage",emoji:"🌙"},
    {id:"SunST",label:"Sun Stage",emoji:"☀️"},
    {id:"LafST",label:"Laf Stage",emoji:"🎸"},
    {id:"LagST",label:"Lag Stage",emoji:"🎺"},
  ];

  React.useEffect(()=>{
    fetchMedChat();
    const iv=setInterval(fetchMedChat,8000);
    return()=>clearInterval(iv);
  },[medChatChannel,medDMThread]);

  async function fetchMedChat(){
    try{
      if(medDMThread){
        const res=await fetch(`/.netlify/functions/get-messages?dmThread=${encodeURIComponent(medDMThread.threadId)}`);
        const data=await res.json();
        if(data.messages) setMedChatMessages(data.messages);
      } else {
        const res=await fetch(`/.netlify/functions/get-messages?channel=${medChatChannel}&limit=50`);
        const data=await res.json();
        if(data.messages) setMedChatMessages(data.messages);
        if(data.dmThreads) setMedDMList(data.dmThreads);
      }
    }catch(e){}
  }

  async function sendMedChat(){
    if(!medChatInput.trim()||medChatSending) return;
    setMedChatSending(true);
    try{
      if(medDMThread){
        const target=staffList.find(s=>s.name===medDMThread.otherName);
        await fetch("/.netlify/functions/send-message",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({fromName:role,fromRole:role,channel:`DM_${[role,medDMThread.otherName].sort().join("_")}`,message:medChatInput.trim(),isDM:true,toName:medDMThread.otherName,toPhone:target?.phone||"",threadId:medDMThread.threadId})});
      } else {
        await fetch("/.netlify/functions/send-message",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({fromName:role,fromRole:role,channel:medChatChannel,message:medChatInput.trim()})});
      }
      setMedChatInput("");
      await fetchMedChat();
    }catch(e){}
    setMedChatSending(false);
  }

  function startMedDM(targetStaff){
    const threadId=`DM_${[role,targetStaff.name].sort().join("_")}`;
    setMedDMThread({otherName:targetStaff.name,threadId});
    setMedChatMessages([]);
  }

  function setMedStatus(status){
    setMedSt(p=>({...p,[myKey]:{status,since:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}}));
  }

  function ackCall(callId){
    setCalls(p=>p.map(c=>c.id===callId?{...c,acknowledged:true,unit:role,status:"pending"}:c));
    if(liveMode) fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:callId,status:"Pending",unit:role})}).catch(()=>{});
    setMedStatus("on_call");
  }

  function assignCall(callId, assignTo){
    setCalls(p=>p.map(c=>c.id===callId?{...c,acknowledged:true,unit:assignTo,status:"pending"}:c));
    if(liveMode) fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:callId,status:"Pending",unit:assignTo})}).catch(()=>{});
  }

  function clearCall(callId){
    const call=calls.find(c=>c.id===callId);
    if(call) setClearIncView(call);
    setCalls(p=>p.map(c=>c.id===callId?{...c,status:"cleared",clearedBy:role}:c));
    if(call) setCompleted(p=>[...p,{...call,clearedBy:role,clearedAt:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}]);
    setMedStatus("available");
  }

  function requestResource(type){
    const msgs={
      med:`🩺 RESOURCE REQUEST — ${role} requesting ${otherRole} assistance. Please respond on radio or report to staging.`,
      admin:`📢 RESOURCE REQUEST — ${role} requesting Admin support. Please respond.`,
      mpd:`🚔 MPD REQUESTED — ${role} requesting police assistance at festival grounds. Fête de Marquette, McPike Park, Madison WI.`,
    };
    const msg=msgs[type];
    sendGroupMe(msg,["admin","medical"]);
    fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:msg})}).catch(()=>{});
  }

  const CALL_COLORS={
    medical:{bg:"rgba(147,51,234,0.15)",border:"rgba(147,51,234,0.5)",text:"#d8b4fe",icon:"🏥",label:"Medical"},
    walk_in:{bg:"rgba(147,51,234,0.15)",border:"rgba(147,51,234,0.5)",text:"#d8b4fe",icon:"🏥",label:"Walk-In"},
    fire:{bg:"rgba(220,38,38,0.15)",border:"rgba(220,38,38,0.5)",text:"#fca5a5",icon:"🔥",label:"Fire/Safety"},
    security:{bg:"rgba(37,99,235,0.15)",border:"rgba(37,99,235,0.5)",text:"#93c5fd",icon:"🛡",label:"Security"},
    supplies:{bg:"rgba(120,53,15,0.2)",border:"rgba(180,83,9,0.5)",text:"#d97706",icon:"📦",label:"Supplies"},
    maintenance:{bg:"rgba(22,163,74,0.12)",border:"rgba(22,163,74,0.4)",text:"#86efac",icon:"🔧",label:"Maintenance"},
    lost_child:{bg:"rgba(234,179,8,0.15)",border:"rgba(234,179,8,0.5)",text:"#fcd34d",icon:"🧒",label:"Lost Child"},
  };

  const lastMsg=medChatMessages[medChatMessages.length-1];

      // Med chat inbox early return
    if(medChatOpen) return(
      <HubChatInbox
        myName={role}
        myRole={role}
        staffList={staffList||[]}
        onBack={()=>setMedChatOpen(false)}
      />
    );

    // ── FULL PAGE PRIORITY CALL (locked until cleared + report done) ──
    const activePriorityCall = myActive[0] || null;
    const [showMeetupModal,setShowMeetupModal]=React.useState(false);
    const [meetupLoc,setMeetupLoc]=React.useState('');
    const [isOnScene,setIsOnScene]=React.useState(false);
    const [nineOneOneActive,setNineOneOneActive]=React.useState(false);
    const [incidentDone,setIncidentDone]=React.useState(false);
    const [waitingReport,setWaitingReport]=React.useState(false);

    if(activePriorityCall&&!incidentDone){
      const pc=activePriorityCall;
      const cc=CALL_COLORS[pc.type]||CALL_COLORS.medical;
      function activate911(){
        const msg=`🚨 911 ACTIVATED — FDM 2026

Location: ${pc.location}
Call: ${pc.problem}
Activated by: ${role}
Meet EMS at: ${meetupLoc||"TBD"}
Time: ${new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"})}

Madison Fire/EMS INBOUND — McPike Park`;
        const voiceMsg=`911 has been activated at Fête de Marquette by ${role}. Location: ${pc.location}. Meet EMS at ${meetupLoc||"the main entrance"}. EMS is now inbound to McPike Park.`;
        const adminPhones=["+16082289692","+16082352925"];
        adminPhones.forEach(p=>{fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:p,message:msg})}).catch(()=>{});});
        fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phones:adminPhones,message:voiceMsg})}).catch(()=>{});
        const otherMedR=(role||"").toLowerCase().includes("1")?"m2":"m1";
        (staffList||[]).filter(s=>(s.role||"").toLowerCase()===otherMedR&&s.phone).forEach(s=>{
          const d=String(s.phone).replace(/[^0-9]/g,"");const fmt=d.length===10?`+1${d}`:`+${d}`;
          fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmt,message:msg})}).catch(()=>{});
          fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phones:[fmt],message:voiceMsg})}).catch(()=>{});
        });
        set911({active:true,by:role,at:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),callId:pc.id,info:{location:pc.location,nature:pc.problem}});
        setNineOneOneActive(true);
        setShowMeetupModal(false);
      }

      return(
        <div style={{position:"fixed",inset:0,background:"#050510",display:"flex",flexDirection:"column",zIndex:9999,overflowY:"auto"}}>
          {/* Header */}
          <div style={{padding:"16px",background:cc.bg,borderBottom:`2px solid ${cc.border}`,flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:900,color:cc.text,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{cc.icon} {cc.label} — PRIORITY CALL ACTIVE</div>
            <div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>📍 {pc.location}</div>
            {nineOneOneActive&&<div style={{marginTop:6,padding:"6px 10px",background:"rgba(239,68,68,0.2)",border:"1px solid rgba(239,68,68,0.5)",borderRadius:8,fontSize:12,fontWeight:800,color:"#fca5a5"}}>🚨 911 ACTIVATED — EMS INBOUND</div>}
          </div>

          {/* Call info */}
          <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12,flex:1}}>
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#64748b",marginBottom:8,textTransform:"uppercase"}}>Call Details</div>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",marginBottom:6}}>{pc.problem}</div>
              {pc.details&&<div style={{fontSize:13,color:"#94a3b8"}}>{pc.details}</div>}
              <div style={{fontSize:12,color:"#475569",marginTop:8}}>
                Called in: {pc.timestamp||"--"} · Assigned to: {role}
              </div>
              {nineOneOneActive&&meetupLoc&&(
                <div style={{marginTop:8,fontSize:13,fontWeight:700,color:"#fbbf24"}}>🚒 EMS Meetup: {meetupLoc}</div>
              )}
            </div>

            {/* Status */}
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:1,padding:"10px",borderRadius:10,background:isOnScene?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${isOnScene?"rgba(16,185,129,0.4)":"rgba(255,255,255,0.08)"}`,textAlign:"center"}}>
                <div style={{fontSize:11,color:"#64748b"}}>Status</div>
                <div style={{fontSize:14,fontWeight:800,color:isOnScene?"#4ade80":"#fbbf24"}}>{isOnScene?"On Scene":"En Route"}</div>
              </div>
              <div style={{flex:1,padding:"10px",borderRadius:10,background:nineOneOneActive?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${nineOneOneActive?"rgba(239,68,68,0.4)":"rgba(255,255,255,0.08)"}`,textAlign:"center"}}>
                <div style={{fontSize:11,color:"#64748b"}}>911</div>
                <div style={{fontSize:14,fontWeight:800,color:nineOneOneActive?"#fca5a5":"#475569"}}>{nineOneOneActive?"ACTIVATED":"Not Called"}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {!isOnScene&&(
                <button style={{width:"100%",padding:"16px",borderRadius:12,border:"2px solid rgba(16,185,129,0.6)",background:"rgba(16,185,129,0.12)",color:"#4ade80",fontSize:16,fontWeight:900,cursor:"pointer"}} onClick={()=>{
                  setIsOnScene(true);
                  setCalls(p=>p.map(c=>c.id===pc.id?{...c,status:"on_scene"}:c));
                  if(liveMode) fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:pc.id,status:"On Scene",unit:role})}).catch(()=>{});
                }}>✅ On Scene</button>
              )}
              {isOnScene&&<div style={{textAlign:"center",padding:"10px",color:"#4ade80",fontWeight:700,fontSize:14}}>✅ On Scene — You are at the location</div>}

              {!nineOneOneActive&&(
                <button style={{width:"100%",padding:"16px",borderRadius:12,border:"2px solid rgba(239,68,68,0.6)",background:"rgba(239,68,68,0.12)",color:"#fca5a5",fontSize:16,fontWeight:900,cursor:"pointer"}} onClick={()=>setShowMeetupModal(true)}>
                  🚨 Activate 911
                </button>
              )}

              <button style={{width:"100%",padding:"16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.06)",color:"#f1f5f9",fontSize:15,fontWeight:800,cursor:!isOnScene?"not-allowed":"pointer",opacity:!isOnScene?0.4:1}} disabled={!isOnScene} onClick={()=>{
                if(!isOnScene) return;
                setWaitingReport(true);
                setClearIncView(pc);
                triggerIncident(pc);
              }}>
                {!isOnScene?"Clear Call (must be On Scene first)":"Clear Call → Complete Report"}
              </button>
            </div>
          </div>

          {/* 911 meetup modal */}
          {showMeetupModal&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",zIndex:10000}}>
              <div style={{width:"100%",background:"#0d0d1a",borderRadius:"20px 20px 0 0",padding:"24px 20px",display:"flex",flexDirection:"column",gap:14}}>
                <div style={{fontSize:18,fontWeight:900,color:"#fca5a5"}}>🚨 Activate 911</div>
                <div style={{fontSize:14,color:"#94a3b8"}}>Specify where EMS should meet you</div>
                <input style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:10,padding:"14px",color:"#f1f5f9",fontSize:16,fontFamily:"inherit",outline:"none"}} placeholder="e.g. Main gate on Ingersoll, North parking lot..." value={meetupLoc} onChange={e=>setMeetupLoc(e.target.value)} autoFocus/>
                <div style={{display:"flex",gap:10}}>
                  <button style={{flex:1,padding:"14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={()=>setShowMeetupModal(false)}>Cancel</button>
                  <button style={{flex:2,padding:"14px",borderRadius:10,border:"none",background:meetupLoc.trim()?"linear-gradient(135deg,rgba(239,68,68,0.9),rgba(185,28,28,0.9))":"rgba(255,255,255,0.06)",color:meetupLoc.trim()?"#fff":"#475569",fontSize:14,fontWeight:900,cursor:meetupLoc.trim()?"pointer":"not-allowed"}} disabled={!meetupLoc.trim()} onClick={activate911}>🚨 CONFIRM — Activate 911</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return(
    <div style={{display:"flex",flexDirection:"column",flex:1,overflowY:"auto"}}>

      {/* STATUS BAR */}
      <div style={{padding:"8px 16px 6px",display:"flex",gap:6}}>
        {[["available","⚪ Available"],["on_call","🟣 On Call"],["cleared","🟢 Cleared"]].map(([s,l])=>{
          const locked=s==="available"&&waitingReport&&!reportDone;
          return <button key={s} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${myStatus.status===s?"rgba(245,158,11,0.6)":locked?"rgba(239,68,68,0.3)":"rgba(255,255,255,0.1)"}`,background:myStatus.status===s?"rgba(245,158,11,0.12)":locked?"rgba(239,68,68,0.06)":"rgba(255,255,255,0.03)",color:myStatus.status===s?"#fcd34d":locked?"#fca5a5":"#64748b",fontSize:11,fontWeight:700,cursor:locked?"not-allowed":"pointer"}} onClick={()=>{if(locked){alert("Complete the incident report first.");return;}setMedStatus(s);}}>{locked?"🔒 Report First":l}</button>;
        })}
      </div>

      {/* FESTIVAL CHAT — inbox button */}
      <div style={{margin:"6px 16px"}}>
        <button style={{width:"100%",padding:"16px 18px",borderRadius:12,border:"1px solid rgba(147,51,234,0.3)",background:"rgba(147,51,234,0.08)",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onClick={()=>setMedChatOpen(true)}>
          <div style={{width:46,height:46,borderRadius:12,background:"rgba(147,51,234,0.2)",border:"1px solid rgba(147,51,234,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>💬</div>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{fontSize:16,fontWeight:900,color:"#c4b5fd"}}>Festival Chat</div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Tap to open messages</div>
          </div>
          <div style={{color:"#c4b5fd",fontSize:18}}>→</div>
        </button>
      </div>

            {/* NEW CALL BUTTON */}
      <div style={{padding:"6px 16px 4px"}}>
        <button style={{width:"100%",padding:"16px",borderRadius:14,border:"2px solid rgba(147,51,234,0.7)",background:"linear-gradient(135deg,rgba(147,51,234,0.25),rgba(109,40,217,0.15))",cursor:"pointer",display:"flex",alignItems:"center",gap:14,boxShadow:"0 0 16px rgba(147,51,234,0.2)"}} onClick={()=>{setNewCallType("medical");setNewCallLocation("");setNewCallProblem("");setNewCallView(true);}}>
          <span style={{fontSize:26}}>🏥</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:16,fontWeight:900,color:"#d8b4fe"}}>NEW MEDICAL CALL</div>
            <div style={{fontSize:11,color:"#e2e8f0",marginTop:2}}>Submit call · alerts all units</div>
          </div>
        </button>
      </div>

      {/* LOST CHILD BUTTON */}
      <div style={{padding:"4px 16px 8px"}}>
        <button style={{width:"100%",padding:"16px",borderRadius:14,border:"2px solid #eab308",background:"linear-gradient(135deg,rgba(202,138,4,0.3),rgba(161,98,7,0.2))",cursor:"pointer",display:"flex",alignItems:"center",gap:14,boxShadow:"0 0 16px rgba(234,179,8,0.2)"}} onClick={openLostChild}>
          <span style={{fontSize:26}}>🧒</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:16,fontWeight:900,color:"#fcd34d"}}>REPORT LOST CHILD</div>
            <div style={{fontSize:11,color:"#e2e8f0",marginTop:2}}>Alerts all staff immediately</div>
          </div>
        </button>
      </div>

      {/* TABS */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.08)",margin:"0 16px"}}>
        {[["mycalls",`${role} Calls (${myActive.length})`],["unassigned",`Unassigned (${unassigned.length})`],["resources","Additional Resources"],["lf","L&F"]].map(([t,l])=>(
          <button key={t} style={{flex:1,padding:"10px 4px",background:"none",border:"none",borderBottom:`2px solid ${tab===t?"#a855f7":"transparent"}`,color:tab===t?"#d8b4fe":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.3}} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8,flex:1,overflowY:"auto"}}>

        {/* MY CALLS TAB */}
        {tab==="mycalls"&&(
          <>
            {myActive.length===0&&<div style={{textAlign:"center",color:"#374151",fontSize:13,padding:"24px 0"}}>No calls assigned to {role}</div>}
            {myActive.map(call=>{
              const c=CALL_COLORS[call.type]||CALL_COLORS.medical;
              return(
                <div key={call.id} style={{borderRadius:14,border:`2px solid ${c.border}`,background:c.bg,padding:"14px",display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:13,fontWeight:900,color:c.text,textTransform:"uppercase",letterSpacing:"0.06em"}}>{c.icon} {c.label}</div>
                    <div style={{fontSize:11,fontWeight:700,color:call.status==="on_scene"?"#10b981":"#f59e0b",background:call.status==="on_scene"?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.12)",borderRadius:20,padding:"2px 8px"}}>{call.status==="on_scene"?"On Scene":"Active"}</div>
                  </div>
                  <div style={{fontSize:18,fontWeight:900,color:"#f1f5f9"}}>📍 {call.location}</div>
                  <div style={{fontSize:14,color:"#e2e8f0"}}>{call.problem}</div>
                  {call.details&&<div style={{fontSize:12,color:"#e2e8f0"}}>{call.details}</div>}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {call.status!=="on_scene"&&(
                      <button style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid rgba(16,185,129,0.5)",background:"rgba(16,185,129,0.12)",color:"#6ee7b7",fontSize:12,fontWeight:800,cursor:"pointer"}} onClick={()=>{
                        setCalls(p=>p.map(c2=>c2.id===call.id?{...c2,status:"on_scene"}:c2));
                        if(liveMode) fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:call.id,status:"On Scene",unit:role})}).catch(()=>{});
                      }}>✅ On Scene</button>
                    )}
                    <button style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.08)",color:"#fca5a5",fontSize:12,fontWeight:800,cursor:"pointer"}} onClick={()=>set911({active:true,by:role,at:new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),callId:call.id,info:{location:call.location,nature:call.problem}})}>🚨 911</button>
                    <button style={{width:"100%",padding:"10px",borderRadius:8,border:"1px solid rgba(100,116,139,0.4)",background:"rgba(255,255,255,0.04)",color:"#e2e8f0",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>clearCall(call.id)}>Clear Call →</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* UNASSIGNED TAB */}
        {tab==="unassigned"&&(
          <>
            {unassigned.length===0&&<div style={{textAlign:"center",color:"#374151",fontSize:13,padding:"24px 0"}}>No unassigned calls</div>}
            {unassigned.map(call=>{
              const c=CALL_COLORS[call.type]||CALL_COLORS.medical;
              return(
                <div key={call.id} style={{borderRadius:12,border:`1px solid ${c.border}`,background:c.bg,padding:"12px",display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{fontSize:12,fontWeight:900,color:c.text,textTransform:"uppercase"}}>{c.icon} {c.label}</div>
                  <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>📍 {call.location}</div>
                  <div style={{fontSize:13,color:"#e2e8f0"}}>{call.problem}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{flex:1,padding:"10px",borderRadius:8,border:"none",background:`${c.border}`,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}} onClick={()=>ackCall(call.id)}>Take — Assign to {role}</button>
                    <button style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${c.border}`,background:"rgba(255,255,255,0.04)",color:c.text,fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>assignCall(call.id,otherRole)}>Assign to {otherRole}</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ADDITIONAL RESOURCES TAB */}
        {tab==="resources"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Request Additional Units</div>
            <button style={{padding:"18px 16px",borderRadius:14,border:"2px solid rgba(147,51,234,0.5)",background:"rgba(147,51,234,0.1)",cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"left"}} onClick={()=>requestResource("med")}>
              <span style={{fontSize:24}}>🩺</span>
              <div>
                <div style={{fontSize:14,fontWeight:900,color:"#d8b4fe"}}>Request {otherRole}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>GroupMe + SMS to Admin · Medical channel</div>
              </div>
            </button>
            <button style={{padding:"18px 16px",borderRadius:14,border:"2px solid rgba(245,158,11,0.5)",background:"rgba(245,158,11,0.08)",cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"left"}} onClick={()=>requestResource("admin")}>
              <span style={{fontSize:24}}>📢</span>
              <div>
                <div style={{fontSize:14,fontWeight:900,color:"#fcd34d"}}>Request Admin</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>GroupMe + SMS to Admin</div>
              </div>
            </button>
            <button style={{padding:"18px 16px",borderRadius:14,border:"2px solid rgba(37,99,235,0.5)",background:"rgba(37,99,235,0.08)",cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"left"}} onClick={()=>setMpdRequestView(true)}>
              <span style={{fontSize:24}}>🚔</span>
              <div>
                <div style={{fontSize:14,fontWeight:900,color:"#93c5fd"}}>Request MPD</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>SMS + Voice call to officers on duty</div>
              </div>
            </button>
          </div>
        )}

        {/* L&F TAB */}
        {tab==="lf"&&(
          <>
            <a href="https://fdm2026.netlify.app/lostfound?from=hub" target="_blank" style={{display:"flex",alignItems:"center",gap:10,padding:"12px",borderRadius:10,border:"1px solid rgba(139,92,246,0.3)",background:"rgba(139,92,246,0.06)",textDecoration:"none",marginBottom:4}}>
              <span style={{fontSize:18}}>🔍</span><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>L&F Lookup Page →</div>
            </a>
            {(lfItems||[]).filter(i=>i.status!=="Claimed").length===0&&<div style={{textAlign:"center",color:"#374151",fontSize:13,padding:"20px 0"}}>No active L&F items</div>}
            {(lfItems||[]).filter(i=>i.status!=="Claimed").slice(0,15).map(item=>(
              <div key={item.id} style={{borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.06)",padding:"10px 12px"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#c4b5fd",marginBottom:2}}>{item.itemNumber||"—"}</div>
                <div style={{fontSize:13,color:"#f1f5f9"}}>{item.description}</div>
                <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>📍 {item.location} · {item.status}</div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  );
}


// ============================================================
// SHARED INBOX CHAT COMPONENTS (hub version)
// ============================================================
const HUB_CHANNEL_LABELS={
  AllStaff:'All Staff',Hospitality:'Hospitality',
  Bars:'All Bars',MoonBar:'Moon Bar',SunBarL:'Sun Bar Left',SunBarR:'Sun Bar Right',
  LafBar:'Lafayette Bar',LagBar:'Lagniappe Bar',FamilyBar:'Family Bar',
  CabBar:'Cabaret Bar',EverythingBar:'EEC',
  MoonST:'Moon Stage',SunST:'Sun Stage',LafST:'Lafayette Stage',
  LagST:'Lagniappe Stage',FamST:'Family Fete Stage',CabST:'Cabaret Stage',
  Admin:'Admin',AdminMed:'Medical',
};
const HUB_CHANNEL_GROUPS=[
  {label:'General',channels:[{id:'AllStaff',label:'All Staff'},{id:'Hospitality',label:'Hospitality'}]},
  {label:'Bars',channels:[{id:'Bars',label:'All Bars'},{id:'MoonBar',label:'Moon Bar'},{id:'SunBarL',label:'Sun Bar L'},{id:'SunBarR',label:'Sun Bar R'},{id:'LafBar',label:'Lafayette Bar'},{id:'LagBar',label:'Lagniappe Bar'},{id:'FamilyBar',label:'Family Bar'},{id:'CabBar',label:'Cabaret Bar'},{id:'EverythingBar',label:'EEC'}]},
  {label:'Stages',channels:[{id:'MoonST',label:'Moon Stage'},{id:'SunST',label:'Sun Stage'},{id:'LafST',label:'Lafayette Stage'},{id:'LagST',label:'Lagniappe Stage'},{id:'FamST',label:'Family Fete Stage'},{id:'CabST',label:'Cabaret Stage'}]},
  {label:'Admin & Med',channels:[{id:'Admin',label:'Admin'},{id:'AdminMed',label:'Medical'}]},
];

function HubConversationView({myName,myRole,convo,onBack}){
  const [messages,setMessages]=React.useState([]);
  const [input,setInput]=React.useState('');
  const [sending,setSending]=React.useState(false);
  const msgEnd=React.useRef(null);
  const label=convo.isDM?(convo.otherName||'Direct Message'):(HUB_CHANNEL_LABELS[convo.channel]||convo.channel);

  React.useEffect(()=>{
    fetchMsgs();
    const iv=setInterval(fetchMsgs,6000);
    return()=>clearInterval(iv);
  },[convo.id]);

  async function fetchMsgs(){
    try{
      const url=convo.isDM
        ?`/.netlify/functions/get-messages?dmThread=${encodeURIComponent(convo.id)}`
        :`/.netlify/functions/get-messages?channel=${convo.channel}&limit=80`;
      const res=await fetch(url);
      const data=await res.json();
      if(data.messages) setMessages(data.messages);
      setTimeout(()=>msgEnd.current?.scrollIntoView({behavior:'smooth'}),100);
    }catch(e){}
  }

  async function send(){
    if(!input.trim()||sending) return;
    setSending(true);
    try{
      const body=convo.isDM
        ?{fromName:myName,fromRole:myRole,channel:`DM_${[myName,convo.otherName].sort().join('_')}`,message:input.trim(),isDM:true,toName:convo.otherName,threadId:convo.id}
        :{fromName:myName,fromRole:myRole,channel:convo.channel,message:input.trim()};
      await fetch('/.netlify/functions/send-message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      setInput('');
      await fetchMsgs();
    }catch(e){}
    setSending(false);
  }

  return(
    <div style={{...S.root,display:"flex",flexDirection:"column",height:"100vh",maxHeight:"100vh"}}>
      <div style={S.panel}>
        <div style={S.panelHd}>
          <BB onClick={onBack}/>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"#f1f5f9"}}>{label}</div>
            {!convo.isDM&&<div style={{fontSize:11,color:"#94a3b8"}}>Group channel</div>}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
          {messages.length===0&&<div style={{textAlign:"center",color:"#374151",fontSize:13,padding:"24px 0"}}>No messages yet</div>}
          {messages.map(msg=>{
            const isMe=msg.fromName===myName||msg.fromRole===myRole;
            const isAlert=msg.isAlert;
            const time=msg.sentAt?new Date(msg.sentAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"}):"";
            if(isAlert) return(
              <div key={msg.id} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"8px 12px"}}>
                <div style={{fontSize:10,fontWeight:800,color:"#fca5a5",marginBottom:2}}>🚨 ALERT · {time}</div>
                <div style={{fontSize:13,color:"#fecaca"}}>{msg.message}</div>
              </div>
            );
            return(
              <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2}}>
                {!isMe&&<div style={{fontSize:10,color:"#94a3b8",marginLeft:4}}>{hubDisplayRole(msg.fromRole)||msg.fromName} · {time}</div>}
                <div style={{maxWidth:"82%",background:isMe?"rgba(14,165,233,0.25)":"rgba(255,255,255,0.07)",border:`1px solid ${isMe?"rgba(14,165,233,0.5)":"rgba(255,255,255,0.1)"}`,borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"9px 13px"}}>
                  <div style={{fontSize:14,color:"#f1f5f9",lineHeight:1.5}}>{msg.message}</div>
                </div>
                {isMe&&<div style={{fontSize:10,color:"#374151",marginRight:4}}>{time}</div>}
              </div>
            );
          })}
          <div ref={msgEnd}/>
        </div>
        <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:8,background:"rgba(10,10,20,0.95)"}}>
          <input style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"11px 14px",color:"#f1f5f9",fontSize:15,fontFamily:"inherit",outline:"none"}} placeholder={`Message ${label}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
          <button style={{padding:"11px 18px",borderRadius:10,border:"none",background:input.trim()?"linear-gradient(135deg,#0ea5e9,#0284c7)":"rgba(255,255,255,0.06)",color:input.trim()?"#fff":"#475569",fontSize:14,fontWeight:800,cursor:input.trim()?"pointer":"not-allowed",flexShrink:0}} onClick={send} disabled={!input.trim()||sending}>{sending?"...":"Send"}</button>
        </div>
      </div>
    </div>
  );
}

function HubNewMessageView({myName,myRole,staffList,onBack,onOpen}){
  const [search,setSearch]=React.useState('');
  const filtered=search.length>=2?staffList.filter(s=>s.name!==myName&&((s.name||'').toLowerCase().includes(search.toLowerCase())||(s.role||'').toLowerCase().includes(search.toLowerCase()))):staffList.filter(s=>s.name!==myName);

  function openCh(ch){onOpen({id:ch,isDM:false,channel:ch,lastMessage:'',lastFrom:'',lastAt:'',recipients:ch});}
  function openDM(s){const tid=`DM_${[myName,s.name].sort().join('_')}`;onOpen({id:tid,isDM:true,channel:`DM_${[myName,s.name].sort().join('_')}`,otherName:s.name,lastMessage:'',lastFrom:'',lastAt:'',recipients:''});}

  return(
    <div style={{...S.root,display:"flex",flexDirection:"column",height:"100vh"}}>
      <div style={S.panel}>
        <div style={S.panelHd}>
          <BB onClick={onBack}/>
          <span style={S.panelTitle}>New Message</span>
        </div>
        <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <input style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"11px 14px",color:"#f1f5f9",fontSize:16,fontFamily:"inherit",outline:"none"}} placeholder="Search by name or role..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {!search&&<>
            <div style={{padding:"8px 16px 4px",fontSize:11,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>Channels</div>
            {HUB_CHANNEL_GROUPS.flatMap(g=>g.channels).map(ch=>(
              <button key={ch.id} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}} onClick={()=>openCh(ch.id)}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#94a3b8",flexShrink:0}}>#</div>
                <div style={{fontSize:14,color:"#f1f5f9"}}>{ch.label}</div>
              </button>
            ))}
            <div style={{padding:"8px 16px 4px",fontSize:11,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>Direct Messages</div>
          </>}
          {filtered.map(s=>(
            <button key={s.id} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}} onClick={()=>openDM(s)}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#a5b4fc",flexShrink:0}}>{(s.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{s.name}</div>
                {s.location&&<div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{s.location}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HubChatInbox({myName,myRole,staffList,onBack}){
  const [convos,setConvos]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [openConvo,setOpenConvo]=React.useState(null);
  const [newMsg,setNewMsg]=React.useState(false);

  React.useEffect(()=>{
    fetchConvos();
    const iv=setInterval(fetchConvos,10000);
    return()=>clearInterval(iv);
  },[]);

  async function fetchConvos(){
    try{
      const res=await fetch(`/.netlify/functions/get-conversations?myName=${encodeURIComponent(myName)}&myRole=${encodeURIComponent(myRole||'')}`);
      const data=await res.json();
      setConvos(data.conversations||[]);
    }catch(e){}
    setLoading(false);
  }

  if(openConvo) return <HubConversationView myName={myName} myRole={myRole} convo={openConvo} onBack={()=>{setOpenConvo(null);fetchConvos();}}/>;
  if(newMsg) return <HubNewMessageView myName={myName} myRole={myRole} staffList={staffList} onBack={()=>setNewMsg(false)} onOpen={c=>{setNewMsg(false);setOpenConvo(c);}}/>;

  function timeAgo(ts){
    if(!ts) return '';
    const d=new Date(ts),now=new Date(),diff=(now-d)/1000;
    if(diff<60) return 'now';
    if(diff<3600) return Math.floor(diff/60)+'m';
    if(diff<86400) return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"});
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  }

  return(
    <div style={{...S.root,display:"flex",flexDirection:"column",height:"100vh"}}>
      <div style={S.panel}>
        <div style={S.panelHd}>
          <BB onClick={onBack}/>
          <span style={{...S.panelTitle,flex:1}}>💬 Messages</span>
          <button style={{padding:"7px 14px",borderRadius:10,border:"1px solid rgba(14,165,233,0.3)",background:"rgba(14,165,233,0.08)",color:"#38bdf8",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>setNewMsg(true)}>✏️ New</button>
        </div>
        {loading&&<div style={{textAlign:"center",color:"#475569",padding:32}}>Loading...</div>}
        <div style={{flex:1,overflowY:"auto"}}>
          {!loading&&convos.length===0&&(
            <div style={{textAlign:"center",padding:40}}>
              <div style={{fontSize:32,marginBottom:12}}>💬</div>
              <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",marginBottom:4}}>No messages yet</div>
              <button style={{marginTop:12,padding:"12px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#0ea5e9,#0284c7)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={()=>setNewMsg(true)}>Start a Conversation</button>
            </div>
          )}
          {convos.map(c=>{
            const label=c.isDM?(c.otherName||'DM'):(HUB_CHANNEL_LABELS[c.channel]||c.channel);
            return(
              <button key={c.id} style={{width:"100%",padding:"14px 16px",background:"none",border:"none",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",textAlign:"left",display:"flex",gap:12,alignItems:"center"}} onClick={()=>setOpenConvo(c)}>
                <div style={{width:46,height:46,borderRadius:"50%",background:c.isDM?"rgba(99,102,241,0.2)":"rgba(14,165,233,0.15)",border:`1px solid ${c.isDM?"rgba(99,102,241,0.4)":"rgba(14,165,233,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:c.isDM?14:18,flexShrink:0,color:c.isDM?"#a5b4fc":"#38bdf8",fontWeight:800}}>
                  {c.isDM?(c.otherName||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase():'#'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap",maxWidth:"70%"}}>{label}</div>
                    <div style={{fontSize:11,color:"#475569",flexShrink:0,marginLeft:8}}>{timeAgo(c.lastAt)}</div>
                  </div>
                  <div style={{fontSize:13,color:"#94a3b8",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>
                    {c.lastFrom&&c.lastFrom!==myRole&&c.lastFrom!==myName?`${hubDisplayRole(c.lastFrom)||c.lastFrom}: `:""}{c.lastMessage}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


const HUB_ROLE_DISPLAY={
  mb1:'Moon Bar Manager', lagb:'Lagniappe Bar Manager', lafb:'Lafayette Bar Manager',
  slb:'Sun Bar Left Manager', srb:'Sun Bar Right Manager', cb:'Cabaret Bar Manager',
  ffb:'Family Fete Bar Manager', etb:'Everything Else Cafe Manager',
  ms:'Moon Stage Manager', lags:'Lagniappe Stage Manager', lafs:'Lafayette Stage Manager',
  sst:'Sun Stage Manager', cst:'Cabaret Stage Manager', ffs:'Family Fete Stage Manager',
  a1:'Admin', a2:'Admin', a3:'Admin Marketing',
  m1:'Med Unit 1', m2:'Med Unit 2',
  hos:'Hospitality', mt:'Merch Tent', ovn:'Overnight Crew',
  misc:'Miscellaneous', gil:'Greeter — Ingersoll Left', gir:'Greeter — Ingersoll Right', gf:'Greeter — Few St',
  // old codes
  msb1:'Moon Bar Manager', msb2:'Moon Bar Manager',
  ssbl:'Sun Bar Left Manager', ssbr:'Sun Bar Right Manager',
  etecm:'Everything Else Cafe Manager', mtm:'Everything Else Cafe Manager',
  msm:'Moon Stage Manager', ssm:'Sun Stage Manager', lafm:'Lafayette Stage Manager', lagm:'Lagniappe Stage Manager',
};
function hubDisplayRole(r){return HUB_ROLE_DISPLAY[(r||'').toLowerCase()]||r||'';}

function HubApp({onBack}){
  const [role,setRole]=useState(()=>{
    if(typeof window!=="undefined"){
      const p=new URLSearchParams(window.location.search);
      const r=p.get("role");
      if(r==="med1") return "Med 1";
      if(r==="med2") return "Med 2";
    }
    return null;
  });
  const [view,setView]=useState("home");
  const [holdTexts,setHoldTexts]=useState(false);
  const [mpdRequestView,setMpdRequestView]=useState(false);
  const [mpdLocation,setMpdLocation]=useState("");
  const [mpdSituation,setMpdSituation]=useState("");
  const [mpdSending,setMpdSending]=useState(false);
  const [tick,setTick]=useState(0);
  const [lostChildBlink,setLostChildBlink]=useState(false);
  const [newCallView,setNewCallView]=useState(false);
  const [newCallType,setNewCallType]=useState("");
  const [newCallLocation,setNewCallLocation]=useState("");
  const [newCallProblem,setNewCallProblem]=useState("");
  const [lcFields,setLcFields]=useState({});
  const blinkRef=useRef(null);
  const [escalated,setEscalated]=useState({});
  const ESCALATION_MS={medical:30000,walk_in:30000,fire:30000,security:30000,supplies:60000,maintenance:60000};

  const [calls,setCalls]=useState([]);
  const [completed,setCompleted]=useState([]);
  const [medSt,setMedSt]=useState({med1:{status:"available",since:null},med2:{status:"available",since:null}});
  const [broadcastAlerts,setBroadcastAlerts]=useState([
    {id:10,label:"⛈ Inclement Weather Imminent",msg:"⛈ INCLEMENT WEATHER IMMINENT\nEstimated Arrival: 45 min\nShutdown: 7:45 PM",requiresAck:true,firedAt:Date.now()-120000,date:now(),acks:{"Moon Stage 1":"4:33 PM","Med 1":"4:33 PM","Med 2":"4:33 PM"},escalated:false},
  ]);
  const [nineOneOne,set911]=useState({active:false,info:{},by:null,at:null});
  const [nineOneOneHistory,setNineOneOneHistory]=useState([]);
  const [emsForm,setEmsForm]=useState({staging:"",eta:"",nature:"",notes:"",activatedBy:""});
  const [emsDispatched,setEmsDispatched]=useState(false);
  // END OF NIGHT
  const [endOfNightNotes,setEndOfNightNotes]=useState("");
  const [endOfNightSent,setEndOfNightSent]=useState(false);

  // ADMIN REQUEST FORM
  const [adminReqView,setAdminReqView]=useState(false);
  // NOTIFICATION ROSTER — Admin 2 hardcoded, others from Airtable
  const ADMIN2_PHONE = "+16082289692";
  const getNotifyList = (type) => {
    // Get phones from staffList by role
    const safeList = staffList || [];
    const byRole = (roles) => safeList
      .filter(s => roles.some(r => (s.role||"").toLowerCase().includes(r.toLowerCase())))
      .map(s => s.phone).filter(Boolean);
    
    if(type==="lost_child"||type==="broadcast"){
      return [...new Set([ADMIN2_PHONE, ...safeList.map(s=>s.phone).filter(Boolean)])];
    }
    if(type==="vendors_sms"){
      // Combine staff vendors + checked-in food vendors from VendorCheckins
      const staffVendors = safeList.filter(s=>(s.role||"").toLowerCase().includes("vendor")).map(s=>s.phone).filter(Boolean);
      return [...new Set([...staffVendors,...vendorPhonesList])];
    }
    if(type==="medical"||type==="fire"){
      return [...new Set([ADMIN2_PHONE, ...byRole(["admin","a1","a2","med unit 1","med 1","m1","med unit 2","med 2","m2"])])];
    }
    if(type==="security"){
      const mpdPhones=mpdOfficers.filter(o=>o.phone).map(o=>o.phone);
      return [...new Set([ADMIN2_PHONE, ...byRole(["admin","a1","a2"]), ...mpdPhones])];
    }
    if(type==="supplies"){
      return [...new Set([ADMIN2_PHONE, ...byRole(["admin","a1","a2"])])];
    }
    if(type==="maintenance"){
      return [...new Set([ADMIN2_PHONE, ...byRole(["admin","a1","a2","oc1","oc2","oc3","oc4"])])];
    }
    return [ADMIN2_PHONE];
  };
  const sendVoice = (phones, message) => {
    phones.forEach(phone => {
      fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:phone,message})}).catch(e=>console.log(e));
    });
  };
  const fmtPhone = (p) => {
    if(!p) return null;
    const d = p.replace(/\D/g,"");
    if(d.length===10) return `+1${d}`;
    if(d.length===11&&d.startsWith("1")) return `+${d}`;
    if(p.startsWith("+")) return p;
    return null;
  };
  const sendSMSList = (phones, message) => {
    phones.forEach(phone => {
      const formatted = fmtPhone(phone);
      if(!formatted) return;
      fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:formatted,message})}).catch(e=>console.log(e));
    });
  };
  const [serialNums,setSerialNums]=useState(()=>{try{return JSON.parse(localStorage.getItem("fdm-serials")||"{}");}catch{return {};}});
  const [showSerials,setShowSerials]=useState(false);
  const [showStaffMgmt,setShowStaffMgmt]=useState(false);

  const [scheduledMsgs,setScheduledMsgs]=useState([]);
  const [showScheduler,setShowScheduler]=useState(false);
  const [broadcastSending,setBroadcastSending]=useState(false);
  const [gmRoster,setGmRoster]=useState(()=>{try{return JSON.parse(localStorage.getItem('fdm-gm-roster')||'[]');}catch{return [];}});
  const [gmNewName,setGmNewName]=useState("");
  const [gmNewUsername,setGmNewUsername]=useState("");
  const [gmNewChannels,setGmNewChannels]=useState([]);
  const [gmEditId,setGmEditId]=useState(null);
  const [broadcastSuccess,setBroadcastSuccess]=useState(null); // {label, channels}
  const [staffList,setStaffList]=useState([]);
  const [vendorPhonesList,setVendorPhonesList]=useState([]);
  const [vendorCheckins,setVendorCheckins]=useState([]);
  const [vendorToasts,setVendorToasts]=useState([]);
  const [vendorSeenIds,setVendorSeenIds]=useState(()=>{try{return JSON.parse(localStorage.getItem('fdm-vendor-seen')||'[]');}catch{return [];}});
  const [vendorPlots,setVendorPlots]=useState(()=>{try{return JSON.parse(localStorage.getItem('fdm-hub-vendor-plots')||'null')||Array.from({length:10},(_,i)=>({id:i+1,checkedIn:null,preAssigned:null}));}catch{return Array.from({length:10},(_,i)=>({id:i+1,checkedIn:null,preAssigned:null}));}});
  const [lawnAccess,setLawnAccess]=useState(()=>{try{return localStorage.getItem('fdm-lawn-access')||'lawn';}catch{return 'lawn';}});
  const [vendorView,setVendorView]=useState(false);
  const [manualBiz,setManualBiz]=useState("");
  const [manualContact,setManualContact]=useState("");
  const [manualPhone,setManualPhone]=useState("");
  const [schedMsg,setSchedMsg]=useState("");
  const [schedLabel,setSchedLabel]=useState("");
  const [schedTime,setSchedTime]=useState("");
  const [schedChannels,setSchedChannels]=useState(["all_staff"]);
  const [schedPhones,setSchedPhones]=useState(["+16082289692"]);
  const [schedSaving,setSchedSaving]=useState(false);
  const [staffMgmtSearch,setStaffMgmtSearch]=useState("");
  const [staffMgmtTab,setStaffMgmtTab]=useState("staff"); // staff | mpd
  const [deletingId,setDeletingId]=useState(null);
  const saveSerial=(id,val)=>{const n={...serialNums,[id]:val};setSerialNums(n);try{localStorage.setItem("fdm-serials",JSON.stringify(n));}catch{}};
  const [adminReqType,setAdminReqType]=useState("");
  const [adminReqLoc,setAdminReqLoc]=useState("");
  const [adminReqProblem,setAdminReqProblem]=useState("");
  const [adminReqDetails,setAdminReqDetails]=useState("");
  const [adminSupplyItem,setAdminSupplyItem]=useState("");
  const [adminSupplyQty,setAdminSupplyQty]=useState("");
  const [adminMaintProblem,setAdminMaintProblem]=useState("");
  const [adminMaintLoc,setAdminMaintLoc]=useState("");

  // INCIDENT REPORT
  const [incidentView,setIncidentView]=useState(null); // holds call data for report form
  const [incFields,setIncFields]=useState({});
  const [clearIncView,setClearIncView]=useState(null);
  const [medActiveCall,setMedActiveCall]=useState(null); // call detail view for Med
  const [lcFoundForm,setLcFoundForm]=useState(null); // {id} when marking child found
  const [maintNarrativeForm,setMaintNarrativeForm]=useState(null); // {call} for maintenance clear narrative
  const [stagingLocation,setStagingLocation]=useState("Staging #1 — Ingersoll & Wilson"); // EMS staging pre-select
  const [activeBroadcastId,setActiveBroadcastId]=useState(null);
  const [vendorRoster,setVendorRoster]=useState([]);
  const [vendorRosterLoaded,setVendorRosterLoaded]=useState(false);
  const [showVendorRoster,setShowVendorRoster]=useState(false); // current tracked broadcast ID for stop button
  const [adminCallDetail,setAdminCallDetail]=useState(null); // full call detail/override view for admin

  // LOST & FOUND
  const [lfAddMode,setLfAddMode]=useState(false);
  const [lfNewDesc,setLfNewDesc]=useState("");
  const [lfNewLoc,setLfNewLoc]=useState("");
  const [lfNewNarrative,setLfNewNarrative]=useState("");
  const [lfPhotoCapturing,setLfPhotoCapturing]=useState(false);
  const [lfPhotoPreview,setLfPhotoPreview]=useState(null);
  const [chatMessages,setChatMessages]=useState([]);
  const [chatChannel,setChatChannel]=useState('all');
  const [chatInput,setChatInput]=useState('');
  const [chatSending,setChatSending]=useState(false);
  const [chatUnread,setChatUnread]=useState(0);
  const [chatLastId,setChatLastId]=useState(null);
  const [chatAlert,setChatAlert]=useState(null);
  const [lfSubmitting,setLfSubmitting]=useState(false);
  const [lfItems,setLfItems]=useState([]);
  const [lfLoading,setLfLoading]=useState(false);
  const [lfClaimView,setLfClaimView]=useState(null);
  const [lfNewItem,setLfNewItem]=useState(false);
  const [lfNewFields,setLfNewFields]=useState({});
  const [lfClaimBy,setLfClaimBy]=useState("");
  const [lfClaimID,setLfClaimID]=useState("");
  const [lfClaimPhone,setLfClaimPhone]=useState("");

  // Hub camera capture for L&F
  const captureHubPhoto=async()=>{
    return new Promise(resolve=>{
      const input=document.createElement('input');
      input.type='file';input.accept='image/*';input.capture='environment';
      input.onchange=async(e)=>{
        const file=e.target.files[0];
        if(!file){resolve(null);return;}
        setLfPhotoCapturing(true);
        try{
          const base64=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.readAsDataURL(file);});
          setLfPhotoPreview('data:'+file.type+';base64,'+base64);
          const resp=await fetch('/.netlify/functions/analyze-photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageData:base64,mediaType:file.type||'image/jpeg',mode:'lost_found'})});
          const data=await resp.json();
          if(data.description) setLfNewDesc(data.description);
          resolve(data.description||null);
        }catch(e){console.log('Hub photo error:',e.message);resolve(null);}
        finally{setLfPhotoCapturing(false);}
      };
      input.click();
    });
  };

  // HUB CHAT FUNCTIONS
  const fetchHubChat=async(channel)=>{
    try{
      const ch=channel||chatChannel;
      const url=ch==='all'?'/.netlify/functions/get-messages?limit=100':`/.netlify/functions/get-messages?channel=${ch}&limit=100`;
      const res=await fetch(url);
      const data=await res.json();
      if(data.messages){
        setChatMessages(data.messages);
        // Count unread (messages since last check)
        if(chatLastId){
          const lastIdx=data.messages.findIndex(m=>m.id===chatLastId);
          const newCount=lastIdx>=0?data.messages.length-lastIdx-1:0;
          if(newCount>0&&view!=='chat'){
            setChatUnread(n=>n+newCount);
            const latest=data.messages[data.messages.length-1];
            setChatAlert(`💬 ${latest.fromName}: ${latest.message.slice(0,50)}${latest.message.length>50?'...':''}`);
            setTimeout(()=>setChatAlert(null),5000);
          }
        }
        if(data.messages.length>0) setChatLastId(data.messages[data.messages.length-1].id);
      }
    }catch(e){console.log('Hub chat fetch:',e.message);}
  };

  const sendHubMessage=async()=>{
    if(!chatInput.trim()||chatSending) return;
    setChatSending(true);
    const targetChannel=chatChannel==='all'?'AllStaff':chatChannel;
    try{
      await fetch('/.netlify/functions/send-message',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fromName:'Admin',fromRole:'Admin',channel:targetChannel,message:chatInput.trim()})
      });
      setChatInput('');
      await fetchHubChat(chatChannel);
    }catch(e){console.log('Hub send error:',e.message);}
    setChatSending(false);
  };

  const fetchLostFound=async()=>{
    setLfLoading(true);
    try{
      const r=await fetch("/.netlify/functions/get-lost-found");
      const d=await r.json();
      if(d.success) setLfItems(d.items||[]);
    }catch(e){console.log(e);}
    setLfLoading(false);
  };

  // DEMO/LIVE MODE
  const [liveMode,setLiveMode]=useState(false);
  const [liveCalls,setLiveCalls]=useState([]);

  // Poll Airtable every 5 seconds in Live Mode
  useEffect(()=>{
    if(!liveMode) return;
    const poll=async()=>{
      try{
        const r=await fetch("/.netlify/functions/get-calls");
        const d=await r.json();
        if(d.success){
          // Convert Airtable records to Hub call format
          const converted=(d.calls||[]).map(c=>({
            id:c.id,
            type:c.type,
            location:c.location,
            problem:c.problem,
            details:c.details,
            requestedBy:c.requestedBy,
            phone:c.phone,
            acknowledged:c.status==="Acknowledged"||c.status==="Cleared",
            status:c.status.toLowerCase(),
            unit:c.unit,
            history:[{status:"new",ts:new Date(c.timestamp).toLocaleTimeString()}],
            nineOneOne:c.nineOneOne,
          }));
          setLiveCalls(converted);
          // Check for 911 from med unit
          const nineOneOneCalls=converted.filter(c=>c.nineOneOne&&c.status==="pending");
          if(nineOneOneCalls.length>0&&!nineOneOne?.active){
            const c=nineOneOneCalls[0];
            set911({active:true,by:c.requestedBy,at:new Date(c.history[0]?.ts).toLocaleTimeString(),info:{location:c.location,nature:c.problem}});
            playAlert("fire");
          }
        }
      } catch(e){ console.log("poll error:",e); }
    };
    poll();
    const interval=setInterval(poll,5000);
    return()=>clearInterval(interval);
  },[liveMode]);
  // AUTO-LOGIN FROM URL PARAM (med1/med2 from field app)
  // Auto-load staff list on hub mount so notifications work immediately
  useEffect(()=>{
    fetch("/.netlify/functions/get-staff-list")
      .then(r=>r.json())
      .then(d=>setStaffList(d.staff||d.members||[]))
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const urlRole=params.get("role");
    if(urlRole==="med1"){setRole("Med 1");setLiveMode(true);}
    else if(urlRole==="med2"){setRole("Med 2");setLiveMode(true);}
  },[]);

  // NWS Weather Alert System
  const [nwsAlerts,setNwsAlerts]=useState([]);
  const sentAlertIds=React.useRef(new Set()); // track which alerts we've already SMS'd
  const [weatherAlertBanner,setWeatherAlertBanner]=useState(null);
  const [weatherDismissed,setWeatherDismissed]=useState([]);
  const [currentWeather,setCurrentWeather]=useState(null);
  const [radarVisible,setRadarVisible]=useState(false);

  // NWS Alert fetch — Dane County WI zone WIZ064
  const SEVERE_TRIGGER=["Tornado Warning","Tornado Watch","Severe Thunderstorm Warning","Severe Thunderstorm Watch"];
  const APPROACH_TRIGGER=["Thunderstorm","Special Weather Statement"];

  const fetchNWSAlerts=async()=>{
    try{
      const r=await fetch('https://api.weather.gov/alerts/active?zone=WIZ064');
      const d=await r.json();
      const features=d.features||[];

      const severe=features.filter(f=>{
        const ev=f.properties?.event||"";
        return ["Tornado Warning","Tornado Watch","Severe Thunderstorm Warning","Severe Thunderstorm Watch",
          "Flash Flood Warning","Flash Flood Watch","Special Weather Statement","Winter Storm Warning",
          "Blizzard Warning","High Wind Warning","Wind Advisory"].some(x=>ev.includes(x));
      });
      setNwsAlerts(severe);

      // Show banner for new alerts not yet dismissed
      if(severe.length>0){
        const top=severe[0];
        const id=top.properties?.id;
        if(!weatherDismissed.includes(id)){
          setWeatherAlertBanner({
            id,
            event:top.properties?.event,
            headline:top.properties?.headline,
            description:top.properties?.description?.slice(0,300),
            expires:top.properties?.expires,
          });
        }
      } else {
        setWeatherAlertBanner(null);
      }

      // ── ADMIN SMS + VOICE FOR SEVERE ALERTS ────────────────────
      for(const f of features){
        const ev=f.properties?.event||"";
        const alertId=f.properties?.id||ev;
        if(sentAlertIds.current.has(alertId)) continue;

        const isSevere=SEVERE_TRIGGER.some(x=>ev.toLowerCase().includes(x.toLowerCase()));
        const isApproach=!isSevere&&APPROACH_TRIGGER.some(x=>ev.toLowerCase().includes(x.toLowerCase()));

        if(isSevere||isApproach){
          sentAlertIds.current.add(alertId);
          const headline=f.properties?.headline||ev;
          const smsMsg=isSevere
            ?`🚨 WEATHER ALERT — FDM 2026\n\n${ev}\n${headline}\n\nMcPike Park, Madison WI\nUse Broadcast to notify staff if needed.`
            :`⛈️ WEATHER ADVISORY — FDM 2026\n\n${ev}\n${headline}\n\nMonitor conditions at McPike Park.`;

          // SMS to Devin + Gary
          const ADMIN_PHONES=["+16082289692","+16082352925"];
          for(const ph of ADMIN_PHONES){
            fetch("/.netlify/functions/send-sms",{
              method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({to:ph,message:smsMsg})
            }).catch(()=>{});
          }

          // Voice call for severe (Tornado/Thunderstorm Warning/Watch) only
          if(isSevere){
            const voiceMsg=`Urgent weather alert for Fête de Marquette. A ${ev} has been issued for Dane County, Wisconsin. McPike Park may be affected. Please take immediate action for the safety of all festival attendees and staff. Use the broadcast system to notify all workers immediately.`;
            fetch("/.netlify/functions/send-voice",{
              method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({phones:ADMIN_PHONES,message:voiceMsg})
            }).catch(()=>{});
          }
        }
      }
    } catch(e){ console.log('NWS fetch error:',e.message); }
  };

  // Current conditions — Madison WI (NWS station KMSN)
  const fetchWeather=async()=>{
    try{
      const r=await fetch('https://api.weather.gov/stations/KMSN/observations/latest');
      const d=await r.json();
      const p=d.properties;
      setCurrentWeather({
        temp:p.temperature?.value!=null?Math.round(p.temperature.value*9/5+32):null,
        desc:p.textDescription,
        wind:p.windSpeed?.value!=null?Math.round(p.windSpeed.value*0.621371):null,
        windDir:p.windDirection?.value!=null?Math.round(p.windDirection.value):null,
        humidity:p.relativeHumidity?.value!=null?Math.round(p.relativeHumidity.value):null,
      });
    } catch(e){ console.log('Weather fetch error:',e.message); }
  };

  useEffect(()=>{
    fetchNWSAlerts();
    fetchWeather();
    fetchLostFound();
    // Auto-clear staff whose shift has ended
    fetch("/.netlify/functions/auto-clear-staff").catch(()=>{});
    const alertInterval=setInterval(fetchNWSAlerts,30*1000); // every 30 seconds
    const weatherInterval=setInterval(fetchWeather,10*60*1000);
    const clearInterval2=setInterval(()=>fetch("/.netlify/functions/auto-clear-staff").catch(()=>{}),30*60*1000);
    return()=>{clearInterval(alertInterval);clearInterval(weatherInterval);clearInterval(clearInterval2);};
  },[]);
  const [emsAcked,setEmsAcked]=useState(false);
  const [emsAlertDismissed,setEmsAlertDismissed]=useState(false);
  // Track acknowledged calls to show persistent banner — keyed by call id
  const [ackedBanners,setAckedBanners]=useState({});
  const addAckedBanner=(call)=>setAckedBanners(p=>({...p,[call.id]:{...call,ackedAt:tShort()}}));
  const removeAckedBanner=(id)=>setAckedBanners(p=>{const n={...p};delete n[id];return n;});
  const [alertView,setAlertView]=useState(null);
  const [alertFields,setAlertFields]=useState({});
  const [editedMsg,setEditedMsg]=useState("");
  const [callFilter,setCallFilter]=useState(null);
  const [callFilterTitle,setCallFilterTitle]=useState("");
  const [callTab,setCallTab]=useState("active");
  const [resourceView,setResourceView]=useState(false);
  const [expandedLog,setExpandedLog]=useState(null);

  // Sound on new incoming calls
  const _lastSoundId = React.useRef(null);
  useEffect(()=>{
    const unacked = activeCalls.filter(c=>!c.acknowledged&&c.status==="new_call");
    if(unacked.length===0)return;
    if(!liveMode)return; // No auto-alerts in demo mode
    const newest = unacked.reduce((a,b)=>b.firedAt>a.firedAt?b:a);
    if(newest.id!==_lastSoundId.current){
      _lastSoundId.current=newest.id;
      playAlert(newest.type);
    }
  },[calls,liveMode]);
  const [mpdOfficers,setMpdOfficers]=useState([]);
  // Fetch MPD officers from Airtable
  useEffect(()=>{
    fetch("/.netlify/functions/get-mpd-officers")
      .then(r=>r.json())
      .then(d=>{ if(d.officers?.length) setMpdOfficers(d.officers); })
      .catch(()=>{});
  },[]);
  const [assignPanel,setAssignPanel]=useState(null); // callId being assigned
  const [lcForm,setLcForm]=useState({name:"",age:"",description:"",lastSeen:"",assemblyPoint:"First Aid",parentName:"",parentPhone:""});
  const [lcView,setLcView]=useState(false);
  // Per-call officer notifications: {callId: {officerId: {notified, acked, cancelled}}}
  const [officerNotifs,setOfficerNotifs]=useState({});
  const [resourceType,setResourceType]=useState(null);
  const [resourceFields,setResourceFields]=useState({});
  const [activityLog,setActivityLog]=useState([
    {id:1,ts:"4:35 PM",date:now(),type:"medical",label:"Medical Request — Lagniappe Bar",msg:"Person down, heat exhaustion"},
    {id:2,ts:"4:28 PM",date:now(),type:"security",label:"Security Request — Lafayette Bar",msg:"Altercation, two patrons"},
    {id:3,ts:"4:20 PM",date:now(),type:"fire",label:"Fire/Life Safety — Sun Stage Vendors",msg:"Cooking flame near tent"},
  ]);

  const isAdmin=role==="Admin"||role==="ADMIN", isMed=["Med 1","Med 2"].includes(role);
  const NAV_TABS=isAdmin?[{id:"home",label:"Home",icon:"🏠"},{id:"callqueue",label:"Calls",icon:"📋"},{id:"lostfound",label:"L&F",icon:"📦"},{id:"activity",label:"Log",icon:"📝"}]:[{id:"home",label:"Home",icon:"🏠"},{id:"lostfound",label:"L&F",icon:"📦"}];
  const activeCalls=liveMode?liveCalls:calls;
  const medCalls=activeCalls.filter(c=>c.type==="medical"||c.type==="walk_in");
  const fireCalls=activeCalls.filter(c=>c.type==="fire");
  const secCalls=activeCalls.filter(c=>c.type==="security");
  const suppCalls=activeCalls.filter(c=>c.type==="supplies");
  const maintCalls=activeCalls.filter(c=>c.type==="maintenance");
  const lostChildCalls=activeCalls.filter(c=>c.type==="lost_child");
  const myActive=isMed?activeCalls.filter(c=>c.unit===role):[];
  const unassigned=isMed?activeCalls.filter(c=>(c.type==="medical"||c.type==="walk_in"||c.type==="fire"||c.type==="security")&&!c.unit&&(c.status==="new_call"||c.status==="pending")):[];

  // Tick for countdown
  useEffect(()=>{const id=setInterval(()=>setTick(p=>p+1),1000);return()=>clearInterval(id);},[]);



  // Lost child blink
  useEffect(()=>{
    const hasLC=lostChildCalls.some(c=>!c.acknowledged);
    if(hasLC){blinkRef.current=setInterval(()=>setLostChildBlink(p=>!p),800);}
    else{clearInterval(blinkRef.current);setLostChildBlink(false);}
    return()=>clearInterval(blinkRef.current);
  },[lostChildCalls.length]);

  const ackCall=(id,by)=>{ playAlert("ack");
    if(liveMode){ 
      fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"Acknowledged",unit:by})}).catch(e=>console.log(e));
      // Immediately update liveCalls so Med unit sees the call right away
      setLiveCalls(p=>p.map(c=>c.id!==id?c:{...c,acknowledged:true,status:"acknowledged",unit:by}));
    }
    const call=activeCalls.find(c=>c.id===id)||calls.find(c=>c.id===id);
    if(call) addAckedBanner({...call,unit:by});
    // If Med unit is acknowledging, go straight to call detail view
    if(isMed && call) setMedActiveCall({...call,unit:by,acknowledgedAt:tShort()});
    // Send GroupMe notification to relevant channel
    if(call){
      const channelMap={medical:"medical",walk_in:"medical",fire:"medical",security:"admin",supplies:"restock",maintenance:"maintenance",lost_child:"admin"};
      const ch=channelMap[call.type]||"admin";
      const ts=`${new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · ${tShort()}`;
      let msg="";
      if(call.type==="medical"||call.type==="walk_in"){
        msg=[
          `🩺 MEDICAL ALERT 🩺`,
          ``,
          `LOCATION: ${call.location}`,
          `WHAT'S THE PROBLEM: ${call.problem||""}`,
          call.details?`DESCRIPTION: ${call.details}`:"",
          `REPORTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
        // SMS + Voice to Admin + Med roster (async so UI doesn't freeze)
        setTimeout(()=>{
          const medPhones=getNotifyList("medical");
          const medPhonesFinal=[...new Set([ADMIN2_PHONE,...medPhones])];
          sendSMSList(medPhonesFinal,msg);
          sendVoice(medPhonesFinal,`Medical alert at Fete de Marquette. ${call.problem||""}. Location: ${call.location}. Please respond immediately.`);
        },100);
      } else if(call.type==="fire"){
        msg=[
          `🔥 LIFE SAFETY ALERT 🔥`,
          ``,
          `LOCATION: ${call.location}`,
          `WHAT'S THE PROBLEM: ${call.problem||""}`,
          call.details?`DESCRIPTION: ${call.details}`:"",
          `REPORTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
        // SMS + Voice to Admin + Med roster for fire (async)
        setTimeout(()=>{
          const firePhones=getNotifyList("fire");
          const firePhonesFinal=[...new Set([ADMIN2_PHONE,...firePhones])];
          sendSMSList(firePhonesFinal,msg);
          sendVoice(firePhonesFinal,`Life safety alert at Fete de Marquette. ${call.problem||""}. Location: ${call.location}. Please respond immediately.`);
        },100);
      } else if(call.type==="security"){
        msg=[
          `👮 SECURITY 👮`,
          ``,
          `LOCATION: ${call.location}`,
          `WHAT'S THE PROBLEM: ${call.problem||""}`,
          call.details?`DESCRIPTION: ${call.details}`:"",
          `REPORTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
        // SMS + Voice to Admin + Security roster (async)
        setTimeout(()=>{
          const secPhones=getNotifyList("security");
          const secPhonesFinal=[...new Set([ADMIN2_PHONE,...secPhones])];
          sendSMSList(secPhonesFinal,msg);
          sendVoice(secPhonesFinal,`Security alert at Fete de Marquette. ${call.problem||""}. Location: ${call.location}. Please respond.`);
        },100);
      } else if(call.type==="supplies"){
        msg=[
          `📦 RESTOCK REQUEST 📦`,
          ``,
          `LOCATION: ${call.location}`,
          `WHAT'S NEEDED: ${call.problem||""}`,
          call.details?`AMOUNT: ${call.details}`:"",
          `REQUESTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
        const suppliesGmMsg="SUPPLY ALERT 📦\n"+msg;
        sendGroupMe(suppliesGmMsg,["admin","restock"]);
        setTimeout(()=>{
          const phones=getNotifyList("supplies");
          sendSMSList(phones,msg);
          // No voice for supplies
        },100);
        msg=null;
      } else if(call.type==="maintenance"){
        msg=[
          `🔧 MAINTENANCE 🔧`,
          ``,
          `LOCATION: ${call.location}`,
          `WHAT'S THE PROBLEM: ${call.problem||""}`,
          `REQUESTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
        setTimeout(()=>{
          const phones=getNotifyList("maintenance");
          sendSMSList(phones,msg);
          // No voice for maintenance
        },100);
      } else if(call.type==="lost_child"){
        msg=[
          `🧒 LOST CHILD 🧒`,
          ``,
          `LOCATION: ${call.location}`,
          `DESCRIPTION: ${call.problem||""}`,
          call.details?`${call.details}`:"",
          `REPORTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
        // Lost child — SMS + voice to ALL staff
        setTimeout(()=>{
          const lcPhones=getNotifyList("lost_child");
          const lcPhonesFinal=lcPhones.length>0?lcPhones:[ADMIN2_PHONE];
          sendSMSList(lcPhonesFinal,msg);
          sendVoice(lcPhonesFinal,`Urgent. Lost child at Fete de Marquette. ${(call.problem||"").replace(/\n/g," ")}. Location: ${call.location}. All staff please be on alert immediately.`);
        },100);
        fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({type:"lost_child",officers:mpdOfficers,location:call.location,situation:msg})
        }).catch(e=>console.log(e));
      } else {
        msg=`🚨 FDM ALERT\nLOCATION: ${call.location}\n${call.problem||""}\nDATE/TIME: ${ts}`;
      }
      if(msg) sendGroupMe(msg, [ch,"admin"]);
    }
    setCalls(p=>p.map(c=>c.id!==id?c:{...c,acknowledged:true,status:"acknowledged",history:[...c.history,{status:"acknowledged",ts:tShort(),unit:by}]}));
    setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"ack",label:`Acknowledged by ${by}`,msg:activeCalls.find(c=>c.id===id)?.problem||""},...p]);
    // Notify requester their call was acknowledged
    const ackedCall=activeCalls.find(c=>c.id===id)||calls.find(c=>c.id===id);
    if(ackedCall?.phone){
      const fmtP=(p)=>{const d=String(p).replace(/\D/g,"");return d.length===10?`+1${d}`:d.length===11&&d[0]==="1"?`+${d}`:p;};
      const ackMsg=`✅ FDM 2026 — Your ${(ackedCall.type||"").replace(/_/g," ").toUpperCase()} request at ${ackedCall.location} has been acknowledged by ${by}. Help is on the way.`;
      fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmtP(ackedCall.phone),message:ackMsg})}).catch(()=>{});
    }
  };
  const updCall=(id,status,unit=null)=>setCalls(p=>p.map(c=>c.id!==id?c:{...c,status,unit:unit||c.unit,history:[...c.history,{status,ts:tShort(),unit}]}));
  const submitAndClearCall=(c,by,incidentData)=>{
    playAlert("clear"); removeAckedBanner(c.id);
    if(liveMode){ fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:c.id,status:"Cleared",unit:by})}).catch(()=>{}); }
    // Send incident report with provided data
    if(["medical","walk_in","fire","security"].includes(c.type)){
      const incNum=`FDM-${new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit"}).replace("/","")}${c.id.toString().slice(-4)}`;
      fetch("/.netlify/functions/send-incident-report",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          incidentNumber:incNum,
          type:c.type,
          location:incidentData?.location||c.location||"",
          problem:incidentData?.problem||c.problem||"",
          requestedBy:c.requestedBy||"Staff",
          respondingUnit:incidentData?.respondingUnit||by,
          disposition:incidentData?.disposition||`Cleared by ${by} at ${tShort()}`,
          narrative:incidentData?.narrative||`${c.type} call at ${c.location}. ${c.problem}. Cleared by ${by} at ${tShort()}.`,
          individualDescription:incidentData?.individualDescription||"",
          interventions:incidentData?.interventions||"",
          notes:incidentData?.notes||"",
          openedAt:c.firedAt?new Date(c.firedAt).toISOString():new Date().toISOString(),
        })
      }).catch(()=>{});
    }
    setCompleted(p=>[{...c,status:"cleared",clearedBy:by,clearedAt:tShort()},...p]);
    setCalls(p=>p.filter(x=>x.id!==c.id));
    setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"clear",label:`Cleared by ${by}`,msg:c.problem||""},...p]);
    setClearIncView(null);
    setView("home");
  };

  const clearCall=(id,by)=>{
    const c=activeCalls.find(x=>x.id===id)||calls.find(x=>x.id===id);if(!c)return;
    if(["medical","walk_in","fire","security"].includes(c.type)){
      // Show quick incident form before clearing
      setClearIncView({call:c,by});
    } else if(c.type==="maintenance"){
      // Show small narrative form for maintenance
      setMaintNarrativeForm({call:c,by});
    } else {
      // Non-medical/security — just clear immediately
      playAlert("clear"); removeAckedBanner(id);
      if(liveMode){ fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"Cleared",unit:by})}).catch(()=>{}); }
      setCompleted(p=>[{...c,status:"cleared",clearedBy:by,clearedAt:tShort()},...p]);
      setCalls(p=>p.filter(x=>x.id!==id));
      setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"clear",label:`Cleared by ${by}`,msg:c.problem||""},...p]);
      setView("home");
    }
  };

  // FULL SCREEN ALERT
  if(view==="home"){
    const PRIORITY=["lost_child","medical","walk_in","fire","security","supplies","maintenance"];
    let alertCall=null;
    for(const t of PRIORITY){alertCall=activeCalls.find(c=>c.type===t&&!c.acknowledged);if(alertCall)break;}
    if(alertCall&&(isAdmin||isMed||alertCall.type==="lost_child")){
      const ac=ALERT_COLORS[alertCall.type]||ALERT_COLORS.medical;
      const bg=lostChildBlink?ac.full2:ac.full;
      const isLC=alertCall.type==="lost_child";
      const limit=ESCALATION_MS[alertCall.type]||60000;
      const elapsed=Math.min(Date.now()-alertCall.firedAt,limit);
      const pct=Math.round((elapsed/limit)*100);
      const remaining=Math.max(0,Math.round((limit-elapsed)/1000));
      return(<div style={{...S.root,background:bg,transition:"background 0.4s"}}>
        <div style={S.persistAlert}>
          <div style={{fontSize:72}}>{ac.icon}</div>
          <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"0.06em",textAlign:"center"}}>{ac.label}</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>📍 {alertCall.location}</div>
          <div style={{fontSize:15,color:"rgba(255,255,255,0.88)",background:"rgba(0,0,0,0.25)",borderRadius:12,padding:"14px 16px",width:"100%",boxSizing:"border-box",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{alertCall.problem}{alertCall.details?`\n${alertCall.details}`:""}</div>
          <div style={{fontSize:16,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>From: {alertCall.requestedBy} · {alertCall.history[0]?.ts}</div>
          <div style={{width:"100%"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>
              <span>Auto-escalate in</span><span style={{color:remaining<10?"#fca5a5":"rgba(255,255,255,0.8)",fontWeight:700}}>{escalated[alertCall.id]?"⚠ RESENT":remaining>0?`${remaining}s`:"⚠ RESENT"}</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,0.2)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:pct>66?"#ef4444":pct>33?"#f97316":"#10b981",borderRadius:2,width:`${pct}%`,transition:"width 1s"}}/></div>
          </div>
          {activeCalls.filter(c=>!c.acknowledged).length>1&&<div style={{fontSize:13,color:"rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"6px 14px"}}>+{activeCalls.filter(c=>!c.acknowledged).length-1} more pending</div>}
          {(alertCall.type==="medical"||alertCall.type==="walk_in"||alertCall.type==="fire"||alertCall.type==="security")&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.06em"}}>Acknowledge</div>
              <div style={{display:"flex",gap:6}}>
                <button style={{flex:1,border:"2px solid rgba(255,255,255,0.5)",borderRadius:10,padding:"12px 6px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",background:"rgba(190,24,93,0.5)"}} onClick={()=>ackCall(alertCall.id,"Med 1")}>🩺 Med 1</button>
                <button style={{flex:1,border:"2px solid rgba(255,255,255,0.5)",borderRadius:10,padding:"12px 6px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",background:"rgba(190,24,93,0.5)"}} onClick={()=>ackCall(alertCall.id,"Med 2")}>🩺 Med 2</button>
                <button style={{flex:1,border:"2px solid rgba(255,255,255,0.5)",borderRadius:10,padding:"12px 6px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",background:"rgba(245,158,11,0.4)"}} onClick={()=>ackCall(alertCall.id,"Both")}>✅ Both</button>
                {isAdmin&&<button style={{flex:1,border:"2px solid rgba(255,255,255,0.5)",borderRadius:10,padding:"12px 6px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",background:"rgba(99,102,241,0.4)"}} onClick={()=>ackCall(alertCall.id,role)}>⚡ Admin</button>}
              </div>
              {!nineOneOne.active&&<button style={{width:"100%",border:"2px solid rgba(220,38,38,0.7)",borderRadius:12,padding:"14px",color:"#fca5a5",fontSize:14,fontWeight:900,cursor:"pointer",background:"rgba(180,0,0,0.2)"}}
                onClick={()=>{
                  const msg911=`🚨 911 ACTIVATED — FDM 2026\n\nLocation: ${alertCall.location}\nCall: ${alertCall.problem}\nActivated by: ${role}\nTime: ${tShort()}\n\nMadison Fire / EMS INBOUND — McPike Park`;
                  set911({active:true,by:role,at:now(),callId:alertCall.id,info:{location:alertCall.location,nature:alertCall.problem}});
                  setPopup911Data({location:alertCall.location,problem:alertCall.problem,by:role,at:tShort()});
                  setShow911Popup(true);
                  // SMS + Voice to Devin + Gary (admin)
                  const adminPhones=["+16082289692","+16082352925"];
                  adminPhones.forEach(p=>{
                    fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:p,message:msg911})}).catch(()=>{});
                  });
                  fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phones:adminPhones,message:`911 has been activated at Fête de Marquette by ${role}. Location: ${alertCall.location}. Madison Fire and EMS are inbound to McPike Park. Please clear the path and meet EMS at the agreed location.`})}).catch(()=>{});
                  // SMS + Voice to OTHER med unit (not the one activating 911)
                  const otherMedRole=(role||"").toLowerCase()==="med 1"||role==="M1"?"m2":"m1";
                  const otherMed=(staffList||[]).filter(s=>(s.role||"").toLowerCase()===otherMedRole&&s.phone);
                  otherMed.forEach(s=>{
                    const d=String(s.phone).replace(/[^0-9]/g,"");const fmt=d.length===10?`+1${d}`:`+${d}`;
                    fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmt,message:msg911})}).catch(()=>{});
                    fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phones:[fmt],message:`911 has been activated at Fête de Marquette. Location: ${alertCall.location}. EMS is inbound. Please stand by for coordination.`})}).catch(()=>{});
                  });
                }}>🚨 Activate 911 from This Call</button>}
              {nineOneOne.active&&<div style={{textAlign:"center",color:"#fca5a5",fontWeight:900,padding:"10px",background:"rgba(180,0,0,0.2)",borderRadius:10}}>🚨 911 ACTIVE</div>}
            </div>
          )}
          {isLC?(
            <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:380}}>
              <button style={{...S.bigAckBtn,background:"linear-gradient(135deg,rgba(245,158,11,0.5),rgba(202,138,4,0.5))",border:"2px solid rgba(245,158,11,0.8)",fontSize:16}} onClick={()=>{
                ackCall(alertCall.id,role||"Admin");
                // Force navigate away so alert screen dismisses
                setTimeout(()=>setView("home"),100);
              }}>✅ ACKNOWLEDGED — SEARCHING</button>
              <button style={{...S.bigAckBtn,background:"linear-gradient(135deg,rgba(16,185,129,0.6),rgba(5,150,105,0.6))",border:"2px solid rgba(16,185,129,0.9)",fontSize:16}} onClick={()=>clearCall(alertCall.id,role||"Admin")}>🧒 CHILD LOCATED — Close</button>
            </div>
          ):(
            <button style={S.bigAckBtn} onClick={()=>ackCall(alertCall.id,role||"Admin")}>✅ ACKNOWLEDGE</button>
          )}
        </div>
      </div>);
    }
  }

  if(!role) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={{textAlign:"center",padding:"28px 16px 12px"}}>
        <div style={{fontSize:48}}>⚡</div>
        <div style={{fontSize:18,fontWeight:900,color:"#fff",marginTop:4}}>Operations Hub</div>
        <div style={{fontSize:11,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>Fête de Marquette 2026</div>
      </div>
      <div style={{padding:"0 16px 6px",fontSize:12,color:"#94a3b8",fontWeight:600}}>Select your role:</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 16px 20px"}}>
        {[["ADMIN","⚡","Command / Admin · Full access","rgba(245,158,11,0.1)","#f59e0b"],["Med 1","🩺","Medical Unit 1","rgba(126,34,206,0.1)","rgba(147,51,234,0.5)"],["Med 2","🩺","Medical Unit 2","rgba(126,34,206,0.1)","rgba(147,51,234,0.5)"]].map(([r,em,tp,bg,bc])=>(
          <button key={r} style={{display:"flex",alignItems:"center",gap:12,padding:"16px",borderRadius:12,border:`2px solid ${bc}`,background:bg,cursor:"pointer",textAlign:"left"}} onClick={()=>{setRole(r);if(r==="Med 1"||r==="Med 2")setLiveMode(true);}}>
            <span style={{fontSize:24,minWidth:32}}>{em}</span><div><div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{r}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{tp}</div></div>
          </button>
        ))}
      </div>
      <div style={{margin:"0 16px",borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:16}}>
        <div style={{fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Demo: default PIN is 0000</div>
        <div style={{fontSize:11,color:"#334155",lineHeight:1.7}}>
          Admin → full hub · Med 1/2 → medical unit view
        </div>
      </div>
      <div style={{padding:"16px",marginTop:"auto"}}>
        <button style={{...S.backBtn,width:"100%",textAlign:"center",padding:"10px",fontSize:13}} onClick={onBack}>← Back to Launcher</button>
      </div>
    </div></div>
  );

  // RESOURCE REQUEST VIEW
  if(resourceView) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><BB onClick={()=>{setResourceView(false);setResourceType(null);setResourceFields({});}}/><span style={S.panelTitle}>Request Resources</span></div>
      <div style={S.cWrap}>
        {!resourceType?(<>
          <label style={S.lbl}>What resource do you need?</label>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {RESOURCE_TYPES.map(t=>(
              <button key={t.id} style={{display:"flex",alignItems:"center",gap:14,padding:"16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left"}} onClick={()=>setResourceType(t.id)}>
                <span style={{fontSize:26,minWidth:34}}>{t.emoji}</span>
                <div><div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{t.label}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{t.desc}</div></div>
              </button>
            ))}
          </div>
        </>):(<>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>{RESOURCE_TYPES.find(t=>t.id===resourceType)?.emoji}</span>
            <span style={{fontSize:16,fontWeight:700,color:"#f1f5f9"}}>{RESOURCE_TYPES.find(t=>t.id===resourceType)?.label}</span>
            <button style={{marginLeft:"auto",background:"none",border:"none",color:"#94a3b8",fontSize:12,cursor:"pointer"}} onClick={()=>setResourceType(null)}>Change</button>
          </div>
          {/* SUPPLIES — worker app style */}
          {resourceType==="supplies"&&<>
            <div style={{fontSize:12,color:"#e2e8f0",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>What do you need?</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[{id:"ice",label:"Ice",emoji:"🧊"},{id:"beer_cups",label:"Beer Cup Sleeves",emoji:"🍺"},{id:"wine_cups",label:"Wine Cup Sleeves",emoji:"🍷"},{id:"paper_towels",label:"Paper Towels",emoji:"🧻"},{id:"bar_towels",label:"Bar Towels",emoji:"🧼"},{id:"water",label:"Bottled Water (24-pack)",emoji:"💧"},{id:"other",label:"Other",emoji:"➕"}].map(item=>(
                <button key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px",borderRadius:12,border:`2px solid ${adminSupplyItem===item.id?"rgba(245,158,11,0.7)":"rgba(255,255,255,0.08)"}`,background:adminSupplyItem===item.id?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.03)",cursor:"pointer",textAlign:"left",width:"100%"}} onClick={()=>{setAdminSupplyItem(item.id);setAdminSupplyQty("");}}>
                  <span style={{fontSize:22,width:28}}>{item.emoji}</span>
                  <span style={{fontSize:15,fontWeight:adminSupplyItem===item.id?800:500,color:adminSupplyItem===item.id?"#fcd34d":"#f1f5f9"}}>{item.label}</span>
                  {adminSupplyItem===item.id&&<span style={{marginLeft:"auto",color:"#fcd34d",fontSize:18}}>✓</span>}
                </button>
              ))}
            </div>
            {adminSupplyItem&&adminSupplyItem!=="other"&&<>
              <div style={{fontSize:12,color:"#e2e8f0",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Quantity?</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                {["1","2","3","4","5","6","7","8","9","10+"].map(q=>(
                  <button key={q} style={{padding:"14px 0",borderRadius:10,border:`2px solid ${adminSupplyQty===q?"rgba(245,158,11,0.7)":"rgba(255,255,255,0.08)"}`,background:adminSupplyQty===q?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.03)",cursor:"pointer",fontSize:16,fontWeight:adminSupplyQty===q?900:400,color:adminSupplyQty===q?"#fcd34d":"#f1f5f9",textAlign:"center"}} onClick={()=>setAdminSupplyQty(q)}>{q}</button>
                ))}
              </div>
            </>}
            {adminSupplyItem==="other"&&<input style={{...S.inp}} placeholder="What do you need?" value={adminReqProblem} onChange={e=>setAdminReqProblem(e.target.value)}/>}
            <input style={{...S.inp}} placeholder="Location / Station *" value={adminReqLoc} onChange={e=>setAdminReqLoc(e.target.value)}/>
            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#0a0f1e",opacity:(!adminReqLoc||!adminSupplyItem||(adminSupplyItem!=="other"&&!adminSupplyQty))?0.5:1}} disabled={!adminReqLoc||!adminSupplyItem||(adminSupplyItem!=="other"&&!adminSupplyQty)} onClick={()=>{
              const item=adminSupplyItem==="other"?adminReqProblem:adminSupplyItem.replace(/_/g," ");
              const prob=`Restock: ${item}${adminSupplyQty?" x"+adminSupplyQty:""}`;
              const msg=`📦 RESTOCK REQUEST — Admin
LOCATION: ${adminReqLoc}
WHAT'S NEEDED: ${prob}
DATE/TIME: ${now()}`;
              const call={id:Date.now(),type:"supplies",location:adminReqLoc,problem:prob,requestedBy:"Admin",status:"acknowledged",acknowledged:true,history:[{status:"new_call",ts:tShort()},{status:"acknowledged",ts:tShort(),unit:"Admin"}],unit:"Admin",firedAt:Date.now()};
              setCalls(p=>[call,...p]);
              sendGroupMe(msg,["admin","restock"]);
              setTimeout(()=>{const phones=getNotifyList("supplies");sendSMSList(phones,msg);},100);
              setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"supplies",label:`Supplies: ${prob}`,msg:adminReqLoc},...p]);
              setAdminSupplyItem("");setAdminSupplyQty("");setAdminReqLoc("");setAdminReqProblem("");
              setResourceView(false);setResourceType(null);setResourceFields({});
            }}>📦 Send Supplies Request</button>
          </>}

          {/* MAINTENANCE — nice form */}
          {resourceType==="maintenance"&&<>
            <div style={{fontSize:12,color:"#e2e8f0",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>What's the issue?</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {["Generator / Power","Sound / PA System","Lighting","Tent / Structure","Plumbing / Water","Trash / Cleanup","Equipment Breakdown","Other"].map(item=>(
                <button key={item} style={{display:"flex",alignItems:"center",gap:12,padding:"14px",borderRadius:12,border:`2px solid ${adminMaintProblem===item?"rgba(16,185,129,0.7)":"rgba(255,255,255,0.08)"}`,background:adminMaintProblem===item?"rgba(16,185,129,0.15)":"rgba(255,255,255,0.03)",cursor:"pointer",textAlign:"left",width:"100%"}} onClick={()=>setAdminMaintProblem(item)}>
                  <span style={{fontSize:14,fontWeight:adminMaintProblem===item?800:500,color:adminMaintProblem===item?"#6ee7b7":"#f1f5f9"}}>{item}</span>
                  {adminMaintProblem===item&&<span style={{marginLeft:"auto",color:"#6ee7b7",fontSize:18}}>✓</span>}
                </button>
              ))}
            </div>
            {adminMaintProblem==="Other"&&<input style={{...S.inp}} placeholder="Describe the issue..." value={adminReqProblem} onChange={e=>setAdminReqProblem(e.target.value)}/>}
            <input style={{...S.inp}} placeholder="Location *" value={adminMaintLoc} onChange={e=>setAdminMaintLoc(e.target.value)}/>
            <input style={{...S.inp}} placeholder="Additional details (optional)" value={adminReqDetails} onChange={e=>setAdminReqDetails(e.target.value)}/>
            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)",opacity:(!adminMaintLoc||!adminMaintProblem)?0.5:1}} disabled={!adminMaintLoc||!adminMaintProblem} onClick={()=>{
              const prob=adminMaintProblem==="Other"?adminReqProblem:adminMaintProblem;
              const msg=`🔧 MAINTENANCE REQUEST — Admin
LOCATION: ${adminMaintLoc}
ISSUE: ${prob}${adminReqDetails?"\n"+adminReqDetails:""}
DATE/TIME: ${now()}`;
              const call={id:Date.now(),type:"maintenance",location:adminMaintLoc,problem:prob,requestedBy:"Admin",status:"acknowledged",acknowledged:true,history:[{status:"new_call",ts:tShort()},{status:"acknowledged",ts:tShort(),unit:"Admin"}],unit:"Admin",firedAt:Date.now()};
              setCalls(p=>[call,...p]);
              sendGroupMe("MAINTENANCE CONCERN 🔧\n"+msg,["admin","maintenance"]);
              setTimeout(()=>{const phones=getNotifyList("maintenance");sendSMSList(phones,msg);},100);
              setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"maintenance",label:`Maintenance: ${prob}`,msg:adminMaintLoc},...p]);
              setAdminMaintProblem("");setAdminMaintLoc("");setAdminReqDetails("");setAdminReqProblem("");
              setResourceView(false);setResourceType(null);setResourceFields({});
            }}>🔧 Send Maintenance Request</button>
          </>}

          {/* ALL OTHER TYPES — generic form */}
          {resourceType!=="supplies"&&resourceType!=="maintenance"&&<>
          <Fld label="Location / Where needed" value={resourceFields.location||""} onChange={e=>setResourceFields(p=>({...p,location:e.target.value}))} ph="e.g. Moon Stage 1 area" required/>
          <Fld label="What's needed" value={resourceFields.reason||""} onChange={e=>setResourceFields(p=>({...p,reason:e.target.value}))} ph="e.g. 2 additional officers for crowd control" required/>
          <Fld label="Additional Info" value={resourceFields.notes||""} onChange={e=>setResourceFields(p=>({...p,notes:e.target.value}))} ph="Optional" multi/>
          <button style={{...S.sendBtn,opacity:(!resourceFields.location||!resourceFields.reason)?0.5:1}} disabled={!resourceFields.location||!resourceFields.reason} onClick={()=>{
            setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"resource",label:`Resource Request: ${RESOURCE_TYPES.find(t=>t.id===resourceType)?.label}`,msg:`${resourceFields.reason} — ${resourceFields.location}`},...p]);
            if(resourceType==="mfd"||resourceType==="ems_mfd"){
              set911({active:true,info:{location:resourceFields.location,nature:resourceFields.reason},by:"Resource Request",at:tShort()});
              playAlert("fire");
            }
            setResourceView(false);setResourceType(null);setResourceFields({});
            if(resourceType==="mfd"||resourceType==="ems_mfd") setView("911");
          }}>📋 SUBMIT RESOURCE REQUEST</button>
          </>}
        </>)}
      </div>
    </div></div>
  );

  // BROADCAST VIEW
  if(view==="alert") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Broadcast Alert</span><BB onClick={()=>{setView("home");setAlertView(null);setAlertFields({});setEditedMsg("");}}/></div>
      {!alertView?(
        <div style={S.cWrap}>
          {BROADCAST_ALERTS.map(t=>(
            <button key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px",borderRadius:12,border:`2px solid ${t.color}44`,background:`${t.color}11`,cursor:"pointer",textAlign:"left"}} onClick={()=>{setAlertView(t.id);setAlertFields({});}}>
              <span style={{fontSize:14,fontWeight:600,color:"#f1f5f9",flex:1}}>{t.label}</span>
              <span style={{fontSize:11,color:"#a855f7"}}>📞 Voice + SMS</span>
            </button>
          ))}
        </div>
      ):(()=>{
        const t=BROADCAST_ALERTS.find(x=>x.id===alertView);
        const selectedReason=alertFields._reason||"";
        const msgBase=(t?.defaultMsg||"").replace("[REASON]",selectedReason||"[select reason above]").replace("[WEATHER_TYPE]",(alertFields._weatherTypes||[]).length>0?(alertFields._weatherTypes||[]).map(w=>w==="Custom..."?alertFields._customWeather||"Custom":w).join(", "):"[select weather type above]").replace("[TIME]",alertFields.eta||"time TBD");
        const preview=editedMsg||msgBase;
        return(<><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px 8px",position:"sticky",top:0,zIndex:20,background:"rgba(13,13,26,0.95)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"inline-flex",padding:"4px 12px",borderRadius:20,fontSize:13,fontWeight:600,color:"#fff",background:t?.color}}>{t?.label}</div>
            <BB onClick={()=>setAlertView(null)}/>
          </div>
          <div style={S.cWrap}>
          <div style={{fontSize:12,color:"#a855f7",background:"rgba(168,85,247,0.08)",borderRadius:8,padding:"8px 12px",border:"1px solid rgba(168,85,247,0.2)",fontWeight:600}}>📞 Voice call + SMS fires to all teams</div>
          {t?.fields?.map(f=>f.type==="select"?(
            <div key={f.key} style={{display:"flex",flexDirection:"column",gap:6}}><label style={S.lbl}>{f.label}</label>
            <select style={S.sel} value={alertFields[f.key]||""} onChange={e=>setAlertFields(p=>({...p,[f.key]:e.target.value}))}>
              {(f.options||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select></div>
          ):(
            <Fld key={f.key} label={f.label} value={alertFields[f.key]||""} onChange={e=>setAlertFields(p=>({...p,[f.key]:e.target.value}))} ph={f.ph} multi={f.key==="notes"||f.key==="message"}/>
          ))}
          <label style={S.lbl}>Message — Edit as needed</label>
          {/* DATE/TIME OF BROADCAST */}
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 14px",marginBottom:4}}>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Date & Time of Broadcast</div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>{new Date().toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
          </div>

          {/* GROUPME CHANNEL SELECTOR */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Send to GroupMe Channels</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {[
                {id:"all_staff",label:"All Staff"},
                {id:"admin",label:"Admin"},
                {id:"medical",label:"Medical"},
                {id:"bar_stage",label:"Bar/Stage"},
                {id:"financial",label:"Financial"},
                {id:"restock",label:"Restock"},
                {id:"maintenance",label:"Maintenance"},
              ].map(ch=>{
                const sel=(alertFields._gmChannels||["all_staff","admin"]).includes(ch.id);
                return(
                  <button key={ch.id} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${sel?"rgba(99,102,241,0.6)":"rgba(255,255,255,0.1)"}`,background:sel?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",color:sel?"#a78bfa":"#64748b",fontSize:13,fontWeight:sel?700:400,cursor:"pointer"}}
                    onClick={()=>{
                      const cur=alertFields._gmChannels||["all_staff","admin"];
                      const next=sel?cur.filter(x=>x!==ch.id):[...cur,ch.id];
                      setAlertFields(p=>({...p,_gmChannels:next}));
                    }}>
                    {sel?"✓ ":""}{ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEND VIA SMS / VOICE */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>SMS + Voice Recipients</label>
            <div style={{fontSize:11,color:"#475569"}}>Select who receives SMS and voice call</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {[
                ["admin","Admin"],
                ["med1","Med Unit 1"],
                ["med2","Med Unit 2"],
                ["all_staff","All Staff"],
                ["moon_stage","Moon Stage"],
                ["sun_stage","Sun Stage"],
                ["lagniappe","Lagniappe"],
                ["lafayette","Lafayette"],
                ["cabaret","Cabaret"],
                ["family_fete","Family Fête"],
              ].map(([id,label])=>{
                const sel=(alertFields._smsRecipients||["admin"]).includes(id);
                return(
                  <button key={id} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${sel?"rgba(168,85,247,0.6)":"rgba(255,255,255,0.1)"}`,background:sel?"rgba(168,85,247,0.15)":"rgba(255,255,255,0.03)",color:sel?"#d8b4fe":"#64748b",fontSize:13,fontWeight:sel?700:400,cursor:"pointer"}}
                    onClick={()=>{
                      const cur=alertFields._smsRecipients||["admin"];
                      const next=sel?cur.filter(x=>x!==id):[...cur,id];
                      setAlertFields(p=>({...p,_smsRecipients:next}));
                    }}>
                    {sel?"✓ ":""}{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WEATHER TYPE — for weather_imminent */}
          {t.requiresWeatherType&&(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Type of Weather *</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {["Thunderstorm","Rain Storm","High Winds","Severe Thunderstorm","Tornado Watch","Tornado Warning","Torrential Rain / Downpour","Custom..."].map(w=>{
                  const selected=(alertFields._weatherTypes||[]);
                  const sel=selected.includes(w);
                  return(
                    <button key={w} style={{padding:"10px 14px",borderRadius:8,border:`1px solid ${sel?"rgba(239,68,68,0.6)":"rgba(255,255,255,0.1)"}`,background:sel?"rgba(239,68,68,0.15)":"rgba(255,255,255,0.03)",color:sel?"#ef4444":"#64748b",fontSize:14,fontWeight:sel?700:400,cursor:"pointer"}}
                      onClick={()=>{
                        const cur=alertFields._weatherTypes||[];
                        const next=sel?cur.filter(x=>x!==w):[...cur,w];
                        setAlertFields(p=>({...p,_weatherTypes:next}));
                        setEditedMsg("");
                      }}>
                      {sel?"✓ ":""}{w}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE/AREA TARGETING */}
          {t.id==="weather_imminent"&&(()=>{
            const wTypes=alertFields._weatherTypes||[];
            const isHeavy=wTypes.some(w=>["Thunderstorm","Severe Thunderstorm","High Winds","Tornado Watch","Tornado Warning"].includes(w));
            const isRain=wTypes.some(w=>["Rain Storm","Torrential Rain / Downpour","Thunderstorm"].includes(w));
            const AREAS=["Moon Stage","Sun Stage","Lagniappe","Lafayette","Cabaret","Family Fête"];
            const RAIN_AREAS=["Sun Stage","Lagniappe","Lafayette","Cabaret","Family Fête"];
            // Auto-set areas when weather type changes
            const autoAreas=isHeavy?["All Areas",...AREAS]:isRain?RAIN_AREAS:[];
            const selected=alertFields._areasOverridden?(alertFields._targetAreas||[]):autoAreas;
            return(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <label style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Areas Affected</label>
                  {alertFields._areasOverridden&&<button style={{background:"none",border:"none",color:"#94a3b8",fontSize:11,cursor:"pointer"}} onClick={()=>setAlertFields(p=>({...p,_areasOverridden:false,_targetAreas:[]}))}>↩ Reset to auto</button>}
                </div>
                {isHeavy&&!alertFields._areasOverridden&&<div style={{fontSize:12,color:"#ef4444",background:"rgba(220,38,38,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(220,38,38,0.2)",fontWeight:700}}>⚡ ALL AREAS — Full shutdown protocol</div>}
                {isRain&&!isHeavy&&!alertFields._areasOverridden&&<div style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(245,158,11,0.2)",fontWeight:700}}>🌧 Moon Stage stays open (tent). All other areas notified.</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["All Areas",...AREAS].map(area=>{
                    const sel=selected.includes(area);
                    return(
                      <button key={area} style={{padding:"10px 14px",borderRadius:8,border:`2px solid ${sel?"rgba(245,158,11,0.7)":"rgba(255,255,255,0.1)"}`,background:sel?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.03)",color:sel?"#fbbf24":"#64748b",fontSize:13,fontWeight:sel?800:400,cursor:"pointer"}}
                        onClick={()=>{
                          const cur=selected;
                          let next;
                          if(area==="All Areas"){
                            next=sel?[]:["All Areas",...AREAS];
                          } else {
                            next=sel?cur.filter(x=>x!==area):[...cur,area];
                          }
                          setAlertFields(p=>({...p,_targetAreas:next,_areasOverridden:true}));
                          setEditedMsg("");
                        }}>
                        {sel?"✓ ":""}{area}
                      </button>
                    );
                  })}
                </div>
                {selected.length>0&&<div style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.08)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(245,158,11,0.2)"}}>
                  📍 Notifying: {selected.filter(a=>a!=="All Areas").join(", ")||"All Areas"}
                </div>}
              </div>
            );
          })()}

          {/* ESTIMATED ARRIVAL (for weather/delays) */}
          {(t.id==="weather_imminent"||t.id==="event_delayed")&&(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Estimated Storm Arrival / Duration</label>
              <input style={{...S.inp,fontSize:14}} placeholder="e.g. 8:15 PM arrival · 45 min duration" value={alertFields._eta||""} onChange={e=>{setAlertFields(p=>({...p,_eta:e.target.value}));setEditedMsg("");}}/>
            </div>
          )}

          {/* REASON PICKER — for postponed/cancelled */}
          {t?.requiresReason&&(
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:4}}>
              <label style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Reason *</label>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {(t.reasonType==="postpone"?POSTPONE_REASONS:CANCEL_REASONS).map(r=>(
                  <button key={r} style={{padding:"14px 16px",borderRadius:10,border:`2px solid ${alertFields._reason===r?"rgba(245,158,11,0.7)":"rgba(255,255,255,0.12)"}`,background:alertFields._reason===r?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.04)",color:alertFields._reason===r?"#fbbf24":"#e2e8f0",fontSize:19,fontWeight:800,cursor:"pointer",textAlign:"left",letterSpacing:"0.01em"}} onClick={()=>{setAlertFields(p=>({...p,_reason:r}));setEditedMsg("");}}>
                    {alertFields._reason===r?"✅  ":""}{r}
                  </button>
                ))}
                {alertFields._reason==="Other"&&(
                  <input style={{...S.inp,fontSize:13}} placeholder="Type reason..." value={alertFields._customReason||""} onChange={e=>{setAlertFields(p=>({...p,_customReason:e.target.value}));setEditedMsg("");}}/>
                )}
              </div>
            </div>
          )}
          <textarea style={{...S.ta,minHeight:110,fontSize:13,lineHeight:1.6,borderColor:"rgba(124,58,237,0.4)"}} value={editedMsg||(t?.defaultMsg||"").replace("[REASON]",alertFields._reason==="Other"?alertFields._customReason||"":alertFields._reason||"[select reason above]").replace("[WEATHER_TYPE]",(alertFields._weatherTypes||[]).length>0?(alertFields._weatherTypes||[]).map(w=>w==="Custom..."?alertFields._customWeather||"Custom":w).join(", "):"[select weather type above]").replace("[TIME]",alertFields.eta||"time TBD")} onChange={e=>setEditedMsg(e.target.value)} onFocus={e=>{if(!editedMsg)setEditedMsg((t?.defaultMsg||"").replace("[REASON]",alertFields._reason==="Other"?alertFields._customReason||"":alertFields._reason||"[select reason above]").replace("[TIME]",alertFields.eta||"time TBD"));}}/>
          {editedMsg&&<button style={{background:"none",border:"none",color:"#94a3b8",fontSize:12,cursor:"pointer",padding:0}} onClick={()=>setEditedMsg("")}>↩ Reset to original</button>}
          <div style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.08)",borderRadius:8,padding:"8px 12px",border:"1px solid rgba(245,158,11,0.2)"}}>⏱ 90-sec ACK — {ALL_LOCS.length} locations</div>
          <button style={S.sendBtn} onClick={()=>{
  const msg=editedMsg||preview;
  // Build targeted areas string for weather
  const wTypes=alertFields._weatherTypes||[];
  const isHeavy=wTypes.some(w=>["Thunderstorm","Severe Thunderstorm","High Winds","Tornado Watch","Tornado Warning"].includes(w));
  const isRain=wTypes.some(w=>["Rain Storm","Torrential Rain / Downpour"].includes(w));
  const RAIN_AREAS=["Sun Stage","Lagniappe","Lafayette","Cabaret","Family Fête"];
  const ALL_AREAS=["Moon Stage","Sun Stage","Lagniappe","Lafayette","Cabaret","Family Fête"];
  let effectiveAreas=alertFields._areasOverridden?(alertFields._targetAreas||[]).filter(a=>a!=="All Areas"):isHeavy?ALL_AREAS:isRain?RAIN_AREAS:[];
  let areasStr="";
  if(t.id==="weather_imminent"&&effectiveAreas.length>0){
    if(isHeavy&&!alertFields._areasOverridden) areasStr="\nAFFECTED: ALL AREAS — Full Shutdown Protocol";
    else if(isRain&&!alertFields._areasOverridden) areasStr="\nAFFECTED: "+RAIN_AREAS.join(", ")+"\nMoon Stage remains open (tent)";
    else areasStr="\nAFFECTED: "+effectiveAreas.join(", ");
  }
  const finalMsg=msg+(areasStr?areasStr:"");
  setBroadcastSending(true);
  setBroadcastAlerts(p=>[{id:Date.now(),label:t.label,msg:finalMsg,requiresAck:true,firedAt:Date.now(),date:now(),acks:{},escalated:false},...p]);
  setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"alert",label:`Broadcast: ${t.label}`,msg:finalMsg},...p]);
  // GroupMe
  const broadcastChannels=alertFields._gmChannels||(t.defaultChannels||["all_staff","admin"]);
  const _ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  const _date=new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  sendGroupMe(`FDM 2026 — ${t.label}\n${_date} · ${_ts}\n\n${finalMsg}`, broadcastChannels);
  // SMS + Voice to all staff, SMS only to vendors
  const isWeather=t.id&&t.id.startsWith("weather");
  const isEvent=["event_delayed","event_postponed","event_cancelled","all_clear"].includes(t.id);
  const announcementHeader=isWeather?`Fête de Marquette 2026 IMPORTANT ANNOUNCEMENT\nDANGEROUS WEATHER — ${t.label}`:isEvent?`Fête de Marquette 2026 IMPORTANT ANNOUNCEMENT\nEVENT IS — ${t.label}`:`Fête de Marquette 2026 IMPORTANT ANNOUNCEMENT\n${t.label}`;
  const bcastMsg=`${announcementHeader}\n\n${finalMsg}`;
  const bcastPhones=getNotifyList("broadcast");
  const vendorPhones=getNotifyList("vendors_sms");
  // Async SMS + Voice to prevent UI freeze
  setTimeout(()=>{
    const bcastMsg2=bcastMsg;
    const bcastPhones2=[...new Set([ADMIN2_PHONE,...getNotifyList("broadcast")])];
    const vendorPhones2=getNotifyList("vendors_sms");
    const vendorOnly2=vendorPhones2.filter(p=>!bcastPhones2.includes(p));
    sendSMSList(bcastPhones2,bcastMsg2);
    sendVoice(bcastPhones2,`Fete de Marquette announcement. ${finalMsg.replace(/\n/g," ")}`);
    sendSMSList(vendorOnly2,bcastMsg2);
  },100);
  playAlert("broadcast");
  setBroadcastSending(false);
  const _successData={label:t.label, channels:broadcastChannels, count:bcastPhones.length};
  setTimeout(()=>{
    setBroadcastSuccess(_successData);
    setTimeout(()=>{
      setBroadcastSuccess(null);
      setView("home");setAlertView(null);setAlertFields({});setEditedMsg("");
    },4000);
  },50);
}}>
  {broadcastSending?"⏳ Sending...":"🚀 SEND NOW"}
</button>
        {broadcastSuccess&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:"32px"}}>
          <div style={{fontSize:72}}>✅</div>
          <div style={{fontSize:24,fontWeight:900,color:"#10b981",textAlign:"center"}}>Broadcast Sent!</div>
          <div style={{background:"rgba(16,185,129,0.12)",border:"2px solid rgba(16,185,129,0.4)",borderRadius:14,padding:"20px 24px",textAlign:"center",maxWidth:340,width:"100%"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",marginBottom:8}}>{broadcastSuccess.label}</div>
            <div style={{fontSize:13,color:"#6ee7b7",marginBottom:4}}>✓ GroupMe — {broadcastSuccess.channels.length} channels</div>
            <div style={{fontSize:13,color:"#6ee7b7",marginBottom:4}}>✓ SMS — {broadcastSuccess.count} recipients</div>
            <div style={{fontSize:13,color:"#6ee7b7"}}>✓ Voice calls firing</div>
          </div>
          <div style={{fontSize:12,color:"#475569"}}>Returning to home in 4 seconds...</div>
        </div>}
        </div></>);
      })()}
    </div></div>
  );

  // NEW CALL VIEW (Admin initiated)
  if(newCallView) return(
    <div style={{display:"flex",flexDirection:"column",gap:0,height:"100vh",background:"#0d0d0d",overflowY:"auto"}}>
      <div style={{...S.panelHdr,position:"sticky",top:0,zIndex:10}}>
        <BB onClick={()=>setNewCallView(false)}/>
        <span style={{...S.panelTitle}}>➕ New Call</span>
      </div>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Call Type</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {type:"medical",label:"🩺 Medical",color:"#a855f7"},
            {type:"fire",label:"🔥 Fire / Life Safety",color:"#ef4444"},
            {type:"security",label:"🛡️ Security",color:"#3b82f6"},
          ].map(({type,label,color})=>(
            <button key={type} style={{padding:"14px",borderRadius:10,border:`2px solid ${newCallType===type?color:color+"44"}`,background:newCallType===type?color+"22":"rgba(255,255,255,0.03)",color:newCallType===type?"#f1f5f9":"#64748b",fontWeight:800,fontSize:14,cursor:"pointer",textAlign:"left"}} onClick={()=>setNewCallType(type)}>{label}</button>
          ))}
        </div>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:4}}>Location *</div>
        <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"14px",color:"#f1f5f9",fontSize:14,outline:"none"}} placeholder="e.g. Sun Stage · Moon Bar · First Aid" value={newCallLocation} onChange={e=>setNewCallLocation(e.target.value)}/>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>Problem / Description *</div>
        <textarea style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"14px",color:"#f1f5f9",fontSize:14,outline:"none",minHeight:80,resize:"none",fontFamily:"inherit"}} placeholder="What's happening?" value={newCallProblem} onChange={e=>setNewCallProblem(e.target.value)}/>
        <button style={{padding:"16px",borderRadius:12,border:"none",background:(!newCallType||!newCallLocation||!newCallProblem)?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#ef4444,#dc2626)",color:(!newCallType||!newCallLocation||!newCallProblem)?"#475569":"#fff",fontWeight:800,fontSize:16,cursor:"pointer",opacity:(!newCallType||!newCallLocation||!newCallProblem)?0.5:1}}
          disabled={!newCallType||!newCallLocation||!newCallProblem}
          onClick={()=>{
            const call={id:Date.now(),type:newCallType,location:newCallLocation,problem:newCallProblem,requestedBy:"Admin",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:tShort()}],unit:null,firedAt:Date.now()};
            setCalls(p=>[call,...p]);
            // Fire alerts same as incoming call
            const msg=`🚨 FDM ALERT — ${newCallType.toUpperCase()}\nLOCATION: ${newCallLocation}\n${newCallProblem}\nReported by: Admin\nDATE/TIME: ${now()}`;
            const channelMap={medical:"medical",fire:"medical",security:"admin"};
            sendGroupMe(msg,[channelMap[newCallType]||"admin","admin"]);
            setTimeout(()=>{
              if(newCallType==="medical"||newCallType==="fire"){
                const phones=getNotifyList("medical");
                sendSMSList(phones,msg);
                sendVoice(phones,`${newCallType==="fire"?"Life safety":"Medical"} alert at Fete de Marquette. ${newCallProblem}. Location: ${newCallLocation}. Please respond immediately.`);
              } else if(newCallType==="security"){
                const phones=getNotifyList("security");
                sendSMSList(phones,msg);
                sendVoice(phones,`Security alert at Fete de Marquette. ${newCallProblem}. Location: ${newCallLocation}. Please respond.`);
              }
            },100);
            playAlert(newCallType);
            setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:newCallType,label:`${newCallType} call initiated by Admin`,msg:newCallProblem},...p]);
            setNewCallView(false);setNewCallType("");setNewCallLocation("");setNewCallProblem("");
          }}>🚨 Submit & Alert Staff</button>
      </div>
    </div>
  );

  // CALL QUEUE VIEW
  
  // MAINTENANCE NARRATIVE FORM
  if(maintNarrativeForm){
    const mc2=maintNarrativeForm.call;
    const clearBy2=maintNarrativeForm.by;
    const ts=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
    return(<div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>🔧 Maintenance — What Was Done?</span></div>
      <div style={S.cWrap}>
        <div style={{background:"rgba(5,150,105,0.08)",border:"1px solid rgba(5,150,105,0.3)",borderRadius:10,padding:"12px",fontSize:13}}>
          <div style={{fontWeight:800,color:"#6ee7b7",marginBottom:2}}>🔧 {mc2.location}</div>
          <div style={{color:"#e2e8f0"}}>{mc2.problem}</div>
        </div>
        <Fld label="What was done? *" value={incFields.maintNarrative||""} onChange={e=>setIncFields(p=>({...p,maintNarrative:e.target.value}))} ph="e.g. Replaced fuse, cleared drain, fixed sound cable..." multi/>
        <Fld label="Resolved by" value={incFields.maintBy||clearBy2||""} onChange={e=>setIncFields(p=>({...p,maintBy:e.target.value}))} ph="Name or role"/>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px",fontSize:12,color:"#94a3b8"}}>📅 {ts}</div>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#059669,#047857)",opacity:!incFields.maintNarrative?0.5:1}} disabled={!incFields.maintNarrative} onClick={()=>{
          const ts2=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
          const maintMsg=`🔧 MAINTENANCE CLEARED\nLOCATION: ${mc2.location}\nISSUE: ${mc2.problem}\nWHAT WAS DONE: ${incFields.maintNarrative}\nCLEARED BY: ${incFields.maintBy||clearBy2}\nDATE/TIME: ${ts2}`;
          sendGroupMe(maintMsg,["admin","maintenance"]);
          // Email report
          fetch("/.netlify/functions/send-incident-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
            incidentNumber:`MAINT-${Date.now().toString().slice(-6)}`,type:"maintenance",location:mc2.location,problem:mc2.problem,
            requestedBy:mc2.requestedBy,respondingUnit:incFields.maintBy||clearBy2,
            disposition:"Resolved",narrative:incFields.maintNarrative,openedAt:new Date().toISOString(),
          })}).catch(()=>{});
          // Clear the call
          playAlert("clear");removeAckedBanner(mc2.id);
          if(liveMode)fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:mc2.id,status:"Cleared",unit:clearBy2})}).catch(()=>{});
          setCompleted(p=>[{...mc2,status:"cleared",clearedBy:clearBy2,clearedAt:tShort()},...p]);
          setLiveCalls(p=>p.filter(c=>c.id!==mc2.id));
          setCalls(p=>p.filter(c=>c.id!==mc2.id));
          setMaintNarrativeForm(null);setIncFields({});setView("home");
        }}>✅ Submit & Clear Maintenance Call</button>
        <button style={{...S.sendBtn,background:"none",color:"#475569",fontSize:13}} onClick={()=>setMaintNarrativeForm(null)}>← Back to Call</button>
      </div>
    </div></div>);
  }

  // LOST CHILD FOUND FORM
  if(lcFoundForm){
    const ts=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
    return(<div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>🧒 Child Found — Enter Details</span></div>
      <div style={S.cWrap}>
        <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:10,padding:"12px",fontSize:13,color:"#6ee7b7",fontWeight:700,textAlign:"center"}}>✅ Child has been located — please record details</div>
        <Fld label="Found Location *" value={incFields.foundLocation||""} onChange={e=>setIncFields(p=>({...p,foundLocation:e.target.value}))} ph="e.g. Near Moon Stage, Main Gate area..."/>
        <Fld label="Found By" value={incFields.foundBy||""} onChange={e=>setIncFields(p=>({...p,foundBy:e.target.value}))} ph="Name of staff member who found child"/>
        <Fld label="Reunited With" value={incFields.reunitedWith||""} onChange={e=>setIncFields(p=>({...p,reunitedWith:e.target.value}))} ph="Parent/guardian name"/>
        <Fld label="Additional Notes" value={incFields.foundNotes||""} onChange={e=>setIncFields(p=>({...p,foundNotes:e.target.value}))} ph="Any other details..." multi/>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px",fontSize:12,color:"#94a3b8"}}>
          📅 Date/Time: {ts}
        </div>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)"}} onClick={()=>{
          const foundTs=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
          // Send all-clear GroupMe
          sendGroupMe(`🧒 LOST CHILD — FOUND ✅\nChild has been located.\nFound at: ${incFields.foundLocation||""}\nFound by: ${incFields.foundBy||""}\nReunited with: ${incFields.reunitedWith||""}\nTime: ${foundTs}`,["all_staff","admin","medical","bar_stage","financial","restock","maintenance"]);
          // Clear the call
          clearCall(lcFoundForm.id,role||"Admin");
          setLcFoundForm(null);
          setIncFields({});
        }}>✅ Confirm Child Found & Send All-Clear</button>
        <button style={{...S.sendBtn,background:"none",color:"#475569",fontSize:13}} onClick={()=>setLcFoundForm(null)}>← Back</button>
      </div>
    </div></div>);
  }

  // QUICK CLEAR INCIDENT FORM
  if(clearIncView){
    const cc=clearIncView.call;
    const clearBy=clearIncView.by;
    const typeLabels={medical:"Medical",fire:"Fire / Life Safety",security:"Security",walk_in:"Walk-In"};
    const DISPOSITIONS=["Patient Released — No Transport","Patient Transported via EMS","Patient Refused Care","Patron Removed","PD Took Over","Medically Cleared","No Patient Found","False Alarm","Other"];
    return(<div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>📋 Close Call — Incident Report</span></div>
      <div style={S.cWrap}>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px",fontSize:13}}>
          <div style={{fontWeight:800,color:"#f59e0b",marginBottom:4}}>{typeLabels[cc.type]||cc.type}</div>
          <div style={{color:"#e2e8f0"}}>📍 {cc.location}</div>
          <div style={{color:"#e2e8f0"}}>🔍 {cc.problem}</div>
        </div>
        <Fld label="Responding Unit" value={incFields.respondingUnit||clearBy||""} onChange={e=>setIncFields(p=>({...p,respondingUnit:e.target.value}))} ph="Med 1, Admin, etc."/>
        <Fld label="Individual Description" value={incFields.individualDescription||""} onChange={e=>setIncFields(p=>({...p,individualDescription:e.target.value}))} ph="Age, appearance..." multi/>
        <Fld label="Interventions" value={incFields.interventions||""} onChange={e=>setIncFields(p=>({...p,interventions:e.target.value}))} ph="Vitals, AED, oxygen..." multi/>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <label style={{fontSize:12,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Disposition</label>
          <select style={{...S.sel}} value={incFields.disposition||""} onChange={e=>setIncFields(p=>({...p,disposition:e.target.value}))}>
            <option value="">Select disposition...</option>
            {DISPOSITIONS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <Fld label="Narrative" value={incFields.narrative||""} onChange={e=>setIncFields(p=>({...p,narrative:e.target.value}))} ph="What happened, timeline, outcome..." multi/>
        <Fld label="Additional Notes" value={incFields.notes||""} onChange={e=>setIncFields(p=>({...p,notes:e.target.value}))} ph="Optional"/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)"}} onClick={()=>submitAndClearCall(cc,clearBy,{...incFields,respondingUnit:incFields.respondingUnit||clearBy})}>
          📋 Submit Report & Clear Call
        </button>
        <button style={{...S.sendBtn,background:"rgba(255,255,255,0.06)",color:"#94a3b8",border:"1px solid rgba(255,255,255,0.1)",fontSize:13}} onClick={()=>submitAndClearCall(cc,clearBy,{respondingUnit:clearBy})}>
          ⏭ Skip — Auto Report
        </button>
        <button style={{...S.sendBtn,background:"none",color:"#475569",fontSize:13}} onClick={()=>{setClearIncView(null);setIncFields({});}}>
          ← Back to Call
        </button>
      </div>
    </div></div>);
  }
  if(incidentView) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>{setIncidentView(null);setIncFields({});}}/>
        <span style={S.panelTitle}>📋 Incident Report</span>
      </div>
      <div style={S.cWrap}>
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>Auto-filled from call</div>
          <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>{incidentView.type?.toUpperCase()} — {incidentView.location}</div>
          <div style={{fontSize:13,color:"#e2e8f0"}}>{incidentView.problem}</div>
          {incidentView.details&&<div style={{fontSize:12,color:"#94a3b8"}}>{incidentView.details}</div>}
          <div style={{fontSize:12,color:"#94a3b8"}}>Reported by: {incidentView.requestedBy} · Unit: {incFields.respondingUnit}</div>
        </div>
        <Fld label="Individual Description" value={incFields.individualDescription||""} onChange={e=>setIncFields(p=>({...p,individualDescription:e.target.value}))} ph="Age, gender, appearance, condition" multi/>
        <Fld label="Interventions Performed" value={incFields.interventions||""} onChange={e=>setIncFields(p=>({...p,interventions:e.target.value}))} ph="e.g. CPR, AED, oxygen, bandaging, verbal de-escalation" multi/>
        <label style={S.lbl}>Disposition *</label>
        <select style={S.sel} value={incFields.disposition||""} onChange={e=>setIncFields(p=>({...p,disposition:e.target.value}))}>
          <option value="">Select disposition...</option>
          <option>Treated on Scene</option>
          <option>Transported — Madison Fire Medics</option>
          <option>Transported — Private Vehicle</option>
          <option>Refused Care</option>
          <option>No Treatment Needed</option>
          <option>Patron Removed</option>
          <option>Police Custody</option>
          <option>Other</option>
        </select>
        {incFields.disposition==="Other"&&(
          <input style={{...S.inp,marginTop:6}} placeholder="Please describe disposition..." value={incFields.dispositionOther||""} onChange={e=>setIncFields(p=>({...p,dispositionOther:e.target.value}))}/>
        )}
        <Fld label="Narrative" value={incFields.narrative||""} onChange={e=>setIncFields(p=>({...p,narrative:e.target.value}))} ph="Full narrative of what happened, timeline, actions taken" multi/>
        <Fld label="Additional Notes" value={incFields.notes||""} onChange={e=>setIncFields(p=>({...p,notes:e.target.value}))} ph="Any other relevant info" multi/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)",opacity:!incFields.disposition?0.5:1}}
          disabled={!incFields.disposition}
          onClick={async()=>{
            try{
              const res=await fetch("/.netlify/functions/submit-incident",{method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({callId:incidentView.id,type:incidentView.type,location:incidentView.location,problem:incidentView.problem,individualDescription:incFields.individualDescription||"",requestedBy:incidentView.requestedBy,respondingUnit:incFields.respondingUnit||role,interventions:incFields.interventions||"",disposition:incFields.disposition==="Other"?(incFields.dispositionOther||"Other"):incFields.disposition,notes:incFields.narrative||"",openedAt:incidentView.timestamp||new Date().toISOString()})});
              const data=await res.json();
              if(data.success){
                setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"incident",label:`Incident Report: ${data.incidentNumber}`,msg:`${incidentView.type} — ${incidentView.location}`},...p]);
              }
            }catch(e){console.log(e);}
            setIncidentView(null);setIncFields({});
          }}>
          📋 SUBMIT INCIDENT REPORT
        </button>
        <button style={{...S.sendBtn,background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:14}} onClick={()=>{setIncidentView(null);setIncFields({});setView("home");}}>Skip & Return to Hub</button>
      </div>
    </div></div>
  );


  if(view==="callqueue"){
    const qCalls=callFilter?activeCalls.filter(c=>callFilter.includes(c.type)):activeCalls;
    const unacked=qCalls.filter(c=>!c.acknowledged);
    const acked=qCalls.filter(c=>c.acknowledged);
    const compQ=callFilter?completed.filter(c=>callFilter.includes(c.type)):completed;
    const ac=callFilter?ALERT_COLORS[callFilter[0]]||{}:{};
    return(<div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>{callFilterTitle}</span></div>
      <div style={S.tabRow}>
        <button style={{...S.tab,borderBottom:callTab==="active"?"2px solid #f59e0b":"2px solid transparent",color:callTab==="active"?"#f59e0b":"#64748b"}} onClick={()=>setCallTab("active")}>Active ({qCalls.length})</button>
        <button style={{...S.tab,borderBottom:callTab==="completed"?"2px solid #10b981":"2px solid transparent",color:callTab==="completed"?"#10b981":"#64748b"}} onClick={()=>setCallTab("completed")}>Completed ({compQ.length})</button>
      </div>
      <div style={S.callQ}>
        {callTab==="active"&&<>
          {/* UNACKED TILES */}
          {unacked.length>0&&<div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:8}}>
            {unacked.map(c=>{
              const limit=ESCALATION_MS[c.type]||60000;
              const elapsed=Math.min(Date.now()-c.firedAt,limit);
              const pct=Math.round((elapsed/limit)*100);
              const remaining=Math.max(0,Math.round((limit-elapsed)/1000));
              const isEsc=escalated[c.id];
              const color=ALERT_COLORS[c.type]||ALERT_COLORS.medical;
              return(<div key={c.id} style={{background:color.full,padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{color.icon} {color.label} — NEW</div>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{c.history[0]?.ts}</span>
                </div>
                <div style={{fontSize:18,fontWeight:900,color:"#fff"}}>📍 {c.location}</div>
                <div style={{fontSize:15,color:"rgba(255,255,255,0.85)",lineHeight:1.4}}>{c.problem}</div>
                {c.details&&<div style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>{c.details}</div>}
                {c.requestedBy&&<div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.75)"}}>From: {c.requestedBy}</div>}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:4,background:"rgba(255,255,255,0.2)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:isEsc?"#ef4444":pct>66?"#f97316":"#10b981",borderRadius:2,width:`${pct}%`,transition:"width 1s"}}/></div>
                  <span style={{fontSize:11,color:isEsc?"#fca5a5":"rgba(255,255,255,0.7)",fontWeight:700,whiteSpace:"nowrap"}}>{isEsc?"⚠ RESENT":remaining>0?`${remaining}s`:"⚠"}</span>
                </div>
                <button style={{border:"2px solid rgba(255,255,255,0.6)",borderRadius:10,padding:"14px",color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer",background:"rgba(0,0,0,0.3)"}} onClick={()=>ackCall(c.id,"Admin")}>✅ ACKNOWLEDGE</button>
              </div>);
            })}
          </div>}
          {/* ACKED LIST — always open */}
          {acked.length>0&&<>
            {unacked.length>0&&<div style={{fontSize:11,fontWeight:800,color:"#94a3b8",letterSpacing:"0.08em",padding:"4px 0 8px"}}>── Acknowledged</div>}
            {acked.map(c=>{
              const color=ALERT_COLORS[c.type]||ALERT_COLORS.medical;
              const statuses={acknowledged:{label:"ACKNOWLEDGED",color:"#10b981"},dispatched:{label:"DISPATCHED",color:"#6366f1"},on_scene:{label:"ON SCENE",color:"#ef4444"},delivered:{label:"DELIVERED",color:"#10b981"},cleared:{label:"CLEARED",color:"#10b981"}};
              const st=statuses[c.status]||{label:c.status,color:"#475569"};
              return(<div key={c.id} style={{borderRadius:12,border:`2px solid ${color.border}`,padding:"14px",display:"flex",flexDirection:"column",gap:10,background:color.bg}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"inline-flex",padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:800,color:"#fff",background:st.color}}>{st.label}</div>
                  <span style={{fontSize:11,color:"#94a3b8"}}>{c.history[0]?.ts}</span>
                </div>
                <div style={{fontSize:17,fontWeight:900,color:"#f1f5f9"}}>📍 {c.location}</div>
                <div style={{fontSize:14,color:"#e2e8f0",lineHeight:1.4}}>{c.problem}</div>
                {c.unit&&<div style={{fontSize:12,color:"#10b981",fontWeight:600}}>👤 {c.unit}</div>}
                {c.type==="security"&&c.assignedOfficers?.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:2}}>
                    {c.assignedOfficers.map(oid=>{const o=mpdOfficers.find(x=>x.id===oid);return o?<span key={oid} style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",color:"#93c5fd",fontWeight:600}}>👮 {o.name}</span>:null;})}
                  </div>
                )}
                {/* HISTORY */}
                <div style={{display:"flex",flexDirection:"column",gap:3,background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"8px"}}>
                  {c.history.map((h,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12}}><span style={{color:"#94a3b8",minWidth:50}}>{h.ts}</span><span style={{color:"#cbd5e1"}}>{h.status}{h.unit?` · ${h.unit}`:""}</span></div>)}
                </div>
                {/* ASSIGN UNIT — ADMIN ONLY */}
                {isAdmin&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <label style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Assign Unit</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {(c.type==="medical"||c.type==="walk_in"
                      ?["Med 1","Med 2","Both","Admin"]
                      :c.type==="security"
                        ?["Admin","Med 1","Med 2"]
                        :["Admin","Med 1","Med 2"]
                    ).map(u=>(
                      <button key={u} style={{...S.actBtn,background:c.unit===u?"#10b981":"rgba(99,102,241,0.3)",fontSize:12,padding:"8px 12px",border:c.unit===u?"1px solid #10b981":"1px solid rgba(99,102,241,0.4)"}}
                        onClick={()=>updCall(c.id,"dispatched",u)}>{c.unit===u?"✅ ":""}{u}</button>
                    ))}
                    {/* POLICE OFFICER BUTTON — security only, opens officer popup */}
                    {c.type==="security"&&(
                      <button style={{...S.actBtn,background:c.assignedOfficers?.length>0?"rgba(59,130,246,0.4)":"rgba(59,130,246,0.2)",fontSize:12,padding:"8px 12px",border:`1px solid ${c.assignedOfficers?.length>0?"rgba(59,130,246,0.7)":"rgba(59,130,246,0.4)"}`}}
                        onClick={()=>setAssignPanel(assignPanel===c.id?null:c.id)}>
                        👮 {c.assignedOfficers?.length>0?`Officers (${c.assignedOfficers.length})`:"Police Officer"}
                      </button>
                    )}
                  </div>
                </div>}
                {/* ACTION BUTTONS */}
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>

                  {c.status!=="on_scene"&&<button style={{...S.actBtn,background:"#ef4444",flex:1}} onClick={()=>updCall(c.id,"on_scene",c.unit||"Admin")}>🔴 On Scene</button>}
                  {c.type==="supplies"&&c.status==="acknowledged"&&<button style={{...S.actBtn,background:"#10b981",flex:1}} onClick={()=>updCall(c.id,"delivered","Admin")}>✅ Delivered</button>}
                  {/* SECURITY — Admin only clear */}
                  {c.type==="security"&&isAdmin&&<button style={{...S.actBtn,background:"rgba(100,100,100,0.4)",flex:1}} onClick={()=>clearCall(c.id,"Admin")}>✅ Clear — Admin</button>}
                  {c.type==="security"&&isAdmin&&<button style={{...S.actBtn,background:"rgba(37,99,235,0.3)",border:"1px solid rgba(37,99,235,0.5)",flex:1}} onClick={()=>{
                    const situation=`🚨 SECURITY REQUEST\nLOCATION: ${c.location}\nSITUATION: ${c.problem||""}\nRequested by: ${c.requestedBy||"Staff"}\nDATE/TIME: ${new Date().toLocaleString()}`;
                    fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"security",officers:mpdOfficers,location:c.location,situation})}).catch(e=>console.log(e));
                    setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"security",label:"MPD Dispatched",msg:`Security at ${c.location}`},...p]);
                  }}>👮 Request MPD</button>}
                  {/* ALL OTHER TYPES — normal clear */}
                  {c.type!=="security"&&<button style={{...S.actBtn,background:"rgba(100,100,100,0.4)",flex:1}} onClick={()=>clearCall(c.id,"Admin")}>✅ Clear</button>}
                </div>
                {/* OFFICER ASSIGNMENT PANEL */}
                {c.type==="security"&&isAdmin&&assignPanel===c.id&&(()=>{
                  const cNotifs=officerNotifs[c.id]||{};
                  const selectedIds=c.assignedOfficers||[];
                  const anyNotified=Object.values(cNotifs).some(n=>n.notified&&!n.cancelled);

                  const cancelOfficer=(oid)=>{
                    const o=mpdOfficers.find(x=>x.id===oid);
                    const ts=tShort();
                    setOfficerNotifs(p=>({...p,[c.id]:{...p[c.id],[oid]:{...p[c.id]?.[oid],cancelled:true,cancelledAt:ts}}}));
                    setActivityLog(prev=>[{id:Date.now(),ts,date:now(),type:"security",
                      label:`MPD Stand Down — ${o?.name}`,
                      msg:`Stand down sent to ${o?.name} · ${c.location}\nVoice: "${MPD_STANDDOWN_VOICE(c.location)}"`
                    },...prev]);
                  };
                  const simAck=(oid)=>{
                    setOfficerNotifs(p=>({...p,[c.id]:{...p[c.id],[oid]:{...p[c.id]?.[oid],acked:true,ackedAt:tShort()}}}));
                  };
                  // If panel just opened and no officers notified yet — fire all immediately
                  const justOpened=Object.keys(cNotifs).length===0;

                  return(
                    <div style={{background:"rgba(29,78,216,0.08)",border:"1px solid rgba(59,130,246,0.35)",borderRadius:12,padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{fontSize:12,fontWeight:800,color:"#93c5fd",textTransform:"uppercase",letterSpacing:"0.06em"}}>👮 Officers Notified — {c.location}</div>
                      <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.5}}>SMS + Voice fired to all on-duty officers. Cancel any not needed.</div>

                      {/* AUTO-FIRE ON OPEN */}
                      {justOpened&&(()=>{
                        const ts=tShort();
                        setTimeout(()=>{
                          setOfficerNotifs(p=>({...p,[c.id]:mpdOfficers.reduce((acc,o)=>({...acc,[o.id]:{notified:true,acked:false,cancelled:false,notifiedAt:ts}}),{})}));
                          setCalls(p=>p.map(x=>x.id!==c.id?x:{...x,assignedOfficers:mpdOfficers.map(o=>o.id)}));
                          setActivityLog(prev=>[{id:Date.now(),ts,date:now(),type:"security",
                            label:`👮 All Officers Notified — ${c.location}`,
                            msg:`SMS + Voice sent to all ${mpdOfficers.length} on-duty officers
Voice: "${MPD_VOICE_SCRIPT(c.location,c.problem)}"
Reply YES to acknowledge.`
                          },...prev]);
                        },0);
                        return null;
                      })()}

                      {/* OFFICER LIST */}
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {mpdOfficers.map(o=>{
                          const notif=cNotifs[o.id];
                          const isNotified=notif?.notified&&!notif?.cancelled;
                          const isAcked=notif?.acked;
                          const isCancelled=notif?.cancelled;
                          const statusColor=isAcked?"rgba(16,185,129,0.6)":isCancelled?"rgba(100,116,139,0.25)":isNotified?"rgba(59,130,246,0.5)":"rgba(255,255,255,0.08)";
                          const statusBg=isAcked?"rgba(16,185,129,0.07)":isCancelled?"rgba(100,116,139,0.03)":isNotified?"rgba(59,130,246,0.06)":"rgba(255,255,255,0.02)";
                          return(
                            <div key={o.id} style={{borderRadius:10,border:`1px solid ${statusColor}`,background:statusBg,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                              <span style={{fontSize:20,flexShrink:0}}>{isAcked?"✅":isCancelled?"❌":"📞"}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:isCancelled?"#64748b":"#f1f5f9"}}>{o.name}</div>
                                <div style={{fontSize:11,color:"#94a3b8"}}>{o.badge} · {o.phone}</div>
                                {isNotified&&!isAcked&&<div style={{fontSize:11,color:"#60a5fa",fontWeight:600,marginTop:2}}>📞 Notified {notif?.notifiedAt} · Awaiting YES</div>}
                                {isAcked&&<div style={{fontSize:11,color:"#10b981",fontWeight:700,marginTop:2}}>✅ Acknowledged · {notif?.ackedAt}</div>}
                                {isCancelled&&<div style={{fontSize:11,color:"#e2e8f0",marginTop:2}}>❌ Stood down {notif?.cancelledAt}</div>}
                              </div>
                              <div style={{display:"flex",gap:6,flexShrink:0}}>
                                {isNotified&&!isAcked&&<button style={{fontSize:11,padding:"4px 8px",borderRadius:6,border:"1px solid rgba(16,185,129,0.4)",background:"rgba(16,185,129,0.1)",color:"#6ee7b7",fontWeight:700,cursor:"pointer"}} onClick={()=>simAck(o.id)}>Sim YES</button>}
                                {!isCancelled&&<button style={{fontSize:11,padding:"5px 10px",borderRadius:6,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.08)",color:"#fca5a5",fontWeight:700,cursor:"pointer"}} onClick={()=>cancelOfficer(o.id)}>Cancel</button>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* STATUS + DONE */}
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <div style={{flex:1,fontSize:12,color:"#93c5fd",background:"rgba(59,130,246,0.06)",borderRadius:10,padding:"10px 12px",lineHeight:1.6}}>
                          📞 {Object.values(cNotifs).filter(n=>n.notified&&!n.cancelled).length} active · ✅ {Object.values(cNotifs).filter(n=>n.acked).length} acknowledged · ❌ {Object.values(cNotifs).filter(n=>n.cancelled).length} stood down
                        </div>
                        <button style={{padding:"10px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}} onClick={()=>setAssignPanel(null)}>Done</button>
                      </div>
                    </div>
                  );
                })()}
              </div>);
            })}
          </>}
          {qCalls.length===0&&<div style={S.empty}>No active calls</div>}
        </>}
        {callTab==="completed"&&<>
          {compQ.length===0&&<div style={S.empty}>No completed calls</div>}
          {compQ.map(c=>(
            <div key={c.id} style={{...S.callCard,borderColor:"#10b981",opacity:0.85}}>
              <div style={{display:"inline-flex",padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:800,color:"#fff",background:"#10b981",alignSelf:"flex-start"}}>✅ COMPLETED</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginTop:4}}>📍 {c.location}</div>
              <div style={{fontSize:13,color:"#cbd5e1"}}>{c.problem}</div>
              {c.clearedBy&&<div style={{fontSize:12,color:"#94a3b8"}}>Cleared by: {c.clearedBy} · {c.clearedAt}</div>}
              <div style={{display:"flex",flexDirection:"column",gap:3,background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"8px"}}>
                {c.history.map((h,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12}}><span style={{color:"#94a3b8",minWidth:50}}>{h.ts}</span><span style={{color:"#cbd5e1"}}>{h.status}{h.unit?` · ${h.unit}`:""}</span></div>)}
              </div>
            </div>
          ))}
        </>}
      </div>
    </div></div>);
  }

  // 911 VIEW
  
  // MPD REQUEST OVERLAY
  if(mpdRequestView) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>setMpdRequestView(false)}/>
        <span style={S.panelTitle}>🚔 Request MPD Officer</span>
      </div>
      <div style={{padding:"20px 16px",display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:"rgba(37,99,235,0.08)",border:"1px solid rgba(37,99,235,0.25)",borderRadius:12,padding:"14px"}}>
          <div style={{fontSize:13,color:"#93c5fd",fontWeight:700,marginBottom:4}}>How it works</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Each officer on duty will receive an SMS text AND a voice call with your location and situation details.</div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>📍 Where do they need to go?</div>
          <input style={{width:"100%",padding:"14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,color:"#f1f5f9",fontSize:16,fontFamily:"inherit",outline:"none"}} placeholder="e.g. Moon Stage Left, near the bar" value={mpdLocation} onChange={e=>setMpdLocation(e.target.value)}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Situation (optional)</div>
          <textarea style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,color:"#f1f5f9",fontSize:15,fontFamily:"inherit",outline:"none",minHeight:80,resize:"none"}} placeholder="e.g. Fight in progress, crowd control needed" value={mpdSituation} onChange={e=>setMpdSituation(e.target.value)}/>
        </div>
        {/* Officer Status List */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",fontSize:11,fontWeight:900,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            Officer Status — {mpdOfficers.filter(o=>o.status!=="Off Duty").length} on duty
          </div>
          {mpdOfficers.length===0&&<div style={{padding:"12px",fontSize:12,color:"#374151",textAlign:"center"}}>No officers in system</div>}
          {mpdOfficers.map(o=>{
            const isOff=(o.status||"").toLowerCase().includes("off");
            return(
              <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:isOff?"#374151":"#22c55e",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:isOff?"#475569":"#f1f5f9"}}>{o.name}</div>
                  {o.phone&&<div style={{fontSize:11,color:"#94a3b8"}}>{o.phone}</div>}
                </div>
                <button style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${isOff?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"}`,background:isOff?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",color:isOff?"#4ade80":"#fca5a5",fontSize:11,fontWeight:700,cursor:"pointer"}} onClick={async()=>{
                  const newStatus=isOff?"Available":"Off Duty";
                  await fetch("/.netlify/functions/update-mpd-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:o.id,status:newStatus})}).catch(()=>{});
                  setMpdOfficers(p=>p.map(x=>x.id===o.id?{...x,status:newStatus}:x));
                }}>{isOff?"Set Online":"Set Offline"}</button>
              </div>
            );
          })}
        </div>
        <div style={{fontSize:12,color:"#374151"}}>
          Only officers marked <span style={{color:"#4ade80",fontWeight:700}}>online</span> will be contacted when you send the alert.
        </div>
        <button style={{padding:"18px",borderRadius:12,border:"none",background:mpdLocation.trim()&&mpdOfficers.length>0?"linear-gradient(135deg,rgba(37,99,235,0.9),rgba(29,78,216,0.9))":"rgba(255,255,255,0.06)",color:mpdLocation.trim()&&mpdOfficers.length>0?"#fff":"#475569",fontSize:16,fontWeight:900,cursor:mpdLocation.trim()&&mpdOfficers.length>0?"pointer":"not-allowed",opacity:mpdSending?0.6:1}} disabled={!mpdLocation.trim()||mpdOfficers.length===0||mpdSending} onClick={async()=>{
          setMpdSending(true);
          const loc=mpdLocation.trim();
          const sit=mpdSituation.trim();
          const ts=new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
          const smsMsg=`🚔 MPD REQUESTED — Fête de Marquette 2026

Your presence is requested at:
📍 ${loc}
${sit?`Situation: ${sit}
`:""}
McPike Park, Madison WI
Time: ${ts}

Please respond immediately.
— FDM 2026 Operations`;
          const voiceMsg=`This is Fête de Marquette Operations at McPike Park in Madison. Your presence is requested at ${loc}.${sit?` Situation: ${sit}.`:""} Please respond immediately. This is Fête de Marquette Operations at McPike Park.`;
          const phones=mpdOfficers.filter(o=>o.phone&&!(o.status||"").toLowerCase().includes("off")).map(o=>{const d=String(o.phone).replace(/[^0-9]/g,"");return d.length===10?`+1${d}`:`+${d}`;});
          for(const phone of phones){
            await fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:phone,message:smsMsg})}).catch(()=>{});
          }
          if(phones.length>0){
            await fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phones,message:voiceMsg})}).catch(()=>{});
          }
          setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"security",label:`MPD Requested — ${loc}`,msg:smsMsg},...p]);
          setMpdSending(false);
          setMpdLocation("");
          setMpdSituation("");
          setMpdRequestView(false);
          alert(`✅ MPD alerted — ${phones.length} officer${phones.length!==1?"s":""} contacted via SMS + Voice`);
        }}>{mpdSending?"Sending...":"🚔 Send SMS + Voice to All Officers"}</button>
      </div>
    </div></div>
  );

  if(lcView) return(
    <div style={{...S.root,position:"relative"}}><Bg/><div style={{...S.panel,position:"relative",zIndex:1}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",position:"sticky",top:0,zIndex:20,background:"rgba(13,13,26,0.95)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <span style={{fontSize:17,fontWeight:800,color:"#f1f5f9"}}>🧒 Report Lost Child</span>
        <button style={{background:"rgba(255,255,255,0.12)",border:"2px solid rgba(255,255,255,0.4)",color:"#fff",padding:"12px 20px",borderRadius:10,cursor:"pointer",fontSize:15,fontWeight:900,boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}} onClick={()=>setLcView(false)}>← Back</button>
      </div>
      <div style={S.cWrap}>
        <div style={{fontSize:14,color:"#fcd34d",fontWeight:700,background:"rgba(202,138,4,0.1)",border:"1px solid rgba(234,179,8,0.3)",borderRadius:8,padding:"10px 12px"}}>📋 Gather info from parent/guardian first, then fill in below.</div>
        <Fld label="Child Age *" value={lcFields?.age||""} onChange={e=>setLcFields(p=>({...p,age:e.target.value}))} ph="e.g. 6" required large/>
        <Fld label="Gender" value={lcFields?.gender||""} onChange={e=>setLcFields(p=>({...p,gender:e.target.value}))} ph="e.g. Girl, Boy"/>
        <Fld label="Hair Color / Style" value={lcFields?.hair||""} onChange={e=>setLcFields(p=>({...p,hair:e.target.value}))} ph="e.g. Brown pigtails"/>
        <Fld label="Top / Shirt" value={lcFields?.top||""} onChange={e=>setLcFields(p=>({...p,top:e.target.value}))} ph="e.g. Red shirt"/>
        <Fld label="Bottom / Pants" value={lcFields?.bottom||""} onChange={e=>setLcFields(p=>({...p,bottom:e.target.value}))} ph="e.g. Blue shorts"/>
        <Fld label="Last Seen Location *" value={lcFields?.lastSeen||""} onChange={e=>setLcFields(p=>({...p,lastSeen:e.target.value}))} ph="e.g. Near Moon Stage 1 bar" required large/>
        <Fld label="Last Seen Time" value={lcFields?.lastSeenTime||""} onChange={e=>setLcFields(p=>({...p,lastSeenTime:e.target.value}))} ph="e.g. 5:30 PM"/>
        <Fld label="Meet Reporting Party / Parent *" value={lcFields?.assembly||""} onChange={e=>setLcFields(p=>({...p,assembly:e.target.value}))} ph="e.g. First Aid, Moon Stage entrance" required large/>
        <Fld label="Parent / Guardian Name" value={lcFields?.parentName||""} onChange={e=>setLcFields(p=>({...p,parentName:e.target.value}))} ph="e.g. Sarah Johnson"/>
        <Fld label="Parent / Guardian Phone" value={lcFields?.parentPhone||""} onChange={e=>setLcFields(p=>({...p,parentPhone:e.target.value}))} ph="(608) 555-1234"/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)",opacity:(!lcFields?.age||!lcFields?.lastSeen||!lcFields?.assembly)?0.5:1}}
          disabled={!lcFields?.age||!lcFields?.lastSeen||!lcFields?.assembly}
          onClick={()=>{
            const lcMsg=`🧒 LOST CHILD 🧒\n\nLOCATION: ${lcFields?.lastSeen}\nDESCRIPTION: ${lcFields?.gender||"Child"}, approx ${lcFields?.age}${lcFields?.hair?" · "+lcFields.hair:""}${lcFields?.top?" · "+lcFields.top:""}\nLast seen: ${lcFields?.lastSeenTime||""}\nMeet Reporting Party / Parent: ${lcFields?.assembly}\nParent: ${lcFields?.parentName||"Unknown"} · ${lcFields?.parentPhone||""}\nDATE/TIME: ${new Date().toLocaleString()}`;
            const newCall={id:Date.now(),type:"lost_child",location:lcFields?.lastSeen,problem:`${lcFields?.gender||"Child"}, approx ${lcFields?.age}. ${lcFields?.hair||""} ${lcFields?.top||""} ${lcFields?.bottom||""}. Last seen: ${lcFields?.lastSeenTime} near ${lcFields?.lastSeen}. Assembly: ${lcFields?.assembly}. Parent: ${lcFields?.parentName||"Unknown"} ${lcFields?.parentPhone||""}`,requestedBy:"Admin",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:tShort()}],unit:null,firedAt:Date.now()};
            setCalls(p=>[newCall,...p]);
            // Use dedicated function — sends to ALL staff + all GroupMe channels
            fetch("/.netlify/functions/send-lost-child",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
              location:lcFields?.lastSeen||"Unknown",
              description:`${lcFields?.gender||"Child"}, approx ${lcFields?.age}. ${lcFields?.hair||""} ${lcFields?.top||""} ${lcFields?.bottom||""}`.trim(),
              requestedBy:"Admin",
              assemblyPoint:lcFields?.assembly||"First Aid",
            })}).catch(e=>console.log("LC send error:",e));
            fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"lost_child",officers:mpdOfficers,location:lcFields?.lastSeen,situation:lcMsg})}).catch(e=>console.log(e));
            playAlert("lost_child");
            setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"lost_child",label:"Lost Child Reported",msg:lcMsg},...p]);
            setLcView(false);setLcFields({});
          }}>
          🧒 REPORT & ALERT ALL STAFF + MPD
        </button>
      </div>
    </div></div>
  );


  // ─── LOST & FOUND VIEW ────────────────────────────────────────────────────────



  if(view==="stafflist") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>setView("home")}/>
        <span style={S.panelTitle}>👥 Staff List</span>
        <span style={{fontSize:11,color:"#94a3b8",marginLeft:"auto"}}>{staffList.length} staff</span>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {/* TABLE HEADER */}
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1.2fr 1.2fr 1.5fr",gap:0,padding:"8px 14px",background:"rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.08)",position:"sticky",top:0}}>
          {["Name","Phone","Location","Schedule"].map(h=>(
            <div key={h} style={{fontSize:10,fontWeight:900,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</div>
          ))}
        </div>
        {staffList.length===0&&<div style={{textAlign:"center",color:"#374151",padding:30}}>No staff loaded</div>}
        {staffList.map((s,i)=>(
          <div key={s.id||i} style={{display:"grid",gridTemplateColumns:"1.5fr 1.2fr 1.2fr 1.5fr",gap:0,padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:i%2===0?"transparent":"rgba(255,255,255,0.015)"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",lineHeight:1.3}}>{s.name}</div>
              {s.role&&<div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{hubDisplayRole(s.role)}</div>}
            </div>
            <div style={{fontSize:12,color:"#38bdf8"}}>{s.phone||"—"}</div>
            <div style={{fontSize:12,color:"#e2e8f0"}}>{s.location||"—"}</div>
            <div style={{fontSize:11,color:"#e2e8f0",lineHeight:1.4}}>
              {s.days?<div>{s.days}</div>:"—"}
              {s.shiftStart&&s.shiftEnd&&<div style={{fontSize:10,color:"#475569"}}>{s.shiftStart}–{s.shiftEnd}</div>}
            </div>
          </div>
        ))}
      </div>
    </div></div>
  );

  if(view==="sendonboarding") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>setView("home")}/>
        <span style={S.panelTitle}>📱 Send Onboarding Text</span>
      </div>
      <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>Enter staff member info and send them the onboarding text with the RSVP link.</div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Full Name</div>
          <input id="ob-name" style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#f1f5f9",fontSize:16,fontFamily:"inherit",outline:"none"}} placeholder="e.g. Bryan Thornton"/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Role (optional)</div>
          <input id="ob-role" style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#f1f5f9",fontSize:16,fontFamily:"inherit",outline:"none"}} placeholder="e.g. Bar Manager"/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Phone Number</div>
          <input id="ob-phone" type="tel" style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,color:"#f1f5f9",fontSize:16,fontFamily:"inherit",outline:"none"}} placeholder="6085551234"/>
        </div>
        {/* Hold Texts toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:holdTexts?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.03)",border:`1px solid ${holdTexts?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:10,padding:"12px 14px"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:holdTexts?"#fcd34d":"#64748b"}}>{holdTexts?"🔕 Texts On Hold":"🔔 Texts Enabled"}</div>
            <div style={{fontSize:11,color:"#475569",marginTop:2}}>{holdTexts?"Records save to Airtable but no texts sent":"Text fires immediately when you hit send"}</div>
          </div>
          <button style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${holdTexts?"rgba(245,158,11,0.5)":"rgba(255,255,255,0.12)"}`,background:holdTexts?"rgba(245,158,11,0.15)":"rgba(255,255,255,0.06)",color:holdTexts?"#fcd34d":"#94a3b8",fontSize:12,fontWeight:800,cursor:"pointer"}} onClick={()=>setHoldTexts(p=>!p)}>{holdTexts?"Release":"Hold"}</button>
        </div>

        <button style={{padding:"16px",borderRadius:12,border:"none",background:holdTexts?"rgba(255,255,255,0.08)":"linear-gradient(135deg,#10b981,#059669)",color:holdTexts?"#64748b":"#fff",fontSize:16,fontWeight:800,cursor:"pointer",marginTop:4}} onClick={async()=>{
          const name=document.getElementById("ob-name").value.trim();
          const role=document.getElementById("ob-role").value.trim();
          const phone=document.getElementById("ob-phone").value.trim();
          if(!name||!phone){alert("Name and phone are required");return;}
          const btn=event.target;
          btn.textContent=holdTexts?"Saving...":"Sending...";btn.disabled=true;
          try{
            const res=await fetch("/.netlify/functions/send-onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,role,phone,saveToAirtable:true,holdTexts})});
            const data=await res.json();
            if(data.success){
              alert(holdTexts?"✅ "+name+" saved to Airtable (text on hold)":"✅ Text sent to "+name+"!");
              document.getElementById("ob-name").value="";
              document.getElementById("ob-role").value="";
              document.getElementById("ob-phone").value="";
              setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"onboarding",label:"Onboarding text sent to "+name},...p]);
            } else {
              alert("Error: "+(data.error||"Unknown error"));
            }
          }catch(e){alert("Failed: "+e.message);}
          btn.textContent="Send Onboarding Text";btn.disabled=false;
        }}>Send Onboarding Text →</button>
      </div>

      {/* 911 POPUP */}
      {show911Popup&&popup911Data&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",zIndex:9999}} onClick={()=>setShow911Popup(false)}>
          <div style={{width:"100%",background:"#0d0d1a",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",display:"flex",flexDirection:"column",gap:14}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:36}}>🚨</div>
              <div><div style={{fontSize:20,fontWeight:900,color:"#fca5a5"}}>911 ACTIVATED</div><div style={{fontSize:13,color:"#64748b"}}>By {popup911Data.by} at {popup911Data.at}</div></div>
            </div>
            <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.4)",borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9",marginBottom:4}}>📍 {popup911Data.location}</div>
              <div style={{fontSize:14,color:"#e2e8f0"}}>{popup911Data.problem}</div>
            </div>
            <div style={{fontSize:14,color:"#fbbf24",fontWeight:700}}>⚠️ EMS and Fire are inbound. Clear the path.</div>
            <button style={{padding:"16px",borderRadius:12,border:"none",background:"rgba(239,68,68,0.8)",color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer"}} onClick={()=>setShow911Popup(false)}>✅ Acknowledged</button>
          </div>
        </div>
      )}
    </div></div>
  );

  if(view==="chat") return(
    <HubChatInbox
      myName={"Admin"}
      myRole={"Admin"}
      staffList={staffList}
      onBack={()=>setView("home")}
    />
  );

  if(view==="lostfound") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>setView("home")}/>
        <span style={S.panelTitle}>📦 Lost & Found</span>
        <button style={{background:"rgba(139,92,246,0.15)",border:"1px solid rgba(139,92,246,0.4)",borderRadius:8,padding:"6px 12px",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer",marginLeft:"auto"}} onClick={fetchLostFound}>Refresh</button>
      </div>
      <div style={S.cWrap}>
        {lfClaimView?(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>Mark as Claimed — #{lfClaimView.itemNumber}</div>
            <div style={{fontSize:13,color:"#e2e8f0"}}>{lfClaimView.description}</div>
            <Fld label="Claimed By (Name) *" value={lfClaimBy} onChange={e=>setLfClaimBy(e.target.value)} ph="Full name of person claiming"/>
            <Fld label="ID Verification" value={lfClaimID} onChange={e=>setLfClaimID(e.target.value)} ph="e.g. DL #123456"/>
            <Fld label="Phone Number" value={lfClaimPhone} onChange={e=>setLfClaimPhone(e.target.value)} ph="(608) 555-1234"/>
            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)",opacity:!lfClaimBy?0.5:1}} disabled={!lfClaimBy}
              onClick={async()=>{
                await fetch("/.netlify/functions/update-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:lfClaimView.id,claimedBy:lfClaimBy,claimedByID:lfClaimID,claimedByPhone:lfClaimPhone})});
                setLfClaimView(null);setLfClaimBy("");setLfClaimID("");setLfClaimPhone("");
                fetchLostFound();
              }}>✅ Mark as Claimed</button>
            <button style={{...S.sendBtn,background:"rgba(255,255,255,0.06)",color:"#e2e8f0"}} onClick={()=>setLfClaimView(null)}>Cancel</button>
          </div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:13,color:"#94a3b8"}}>{lfItems.length} items · {lfItems.filter(i=>i.status==="Unclaimed").length} unclaimed</div>
              <a href="https://fdm2026.netlify.app/lostfound?from=hub" target="_blank" style={{fontSize:12,color:"#a78bfa",fontWeight:700,textDecoration:"none",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:6,padding:"4px 10px"}}>🔗 L&F Lookup</a>
            </div>

            {/* LOG NEW ITEM FORM */}
            {lfNewItem?(
              <div style={{background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.25)",borderRadius:14,padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:14,fontWeight:900,color:"#fb923c"}}>📦 Log New Item</div>
                <div style={{display:"flex",gap:6}}>
                  {[["Thu","🔵"],["Fri","🟠"],["Sat","🟢"],["Sun","🟣"]].map(([d,e])=>(
                    <button key={d} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${lfNewFields.day===d?"rgba(249,115,22,0.6)":"rgba(255,255,255,0.1)"}`,background:lfNewFields.day===d?"rgba(249,115,22,0.15)":"rgba(255,255,255,0.03)",color:lfNewFields.day===d?"#fb923c":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>setLfNewFields(p=>({...p,day:d}))}>{e} {d}</button>
                  ))}
                </div>
                <Fld label="Where found" value={lfNewFields.foundAt||""} onChange={e=>setLfNewFields(p=>({...p,foundAt:e.target.value}))} ph="e.g. Near Moon Stage Left"/>
                <Fld label="Where is it now" value={lfNewFields.nowAt||""} onChange={e=>setLfNewFields(p=>({...p,nowAt:e.target.value}))} ph="e.g. Festival Office"/>
                <Fld label="Description" value={lfNewFields.description||""} onChange={e=>setLfNewFields(p=>({...p,description:e.target.value}))} ph="Describe the item..." multi/>
                <div style={{display:"flex",gap:8}}>
                  <button style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,rgba(249,115,22,0.8),rgba(234,88,12,0.9))",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",opacity:(!lfNewFields.description||!lfNewFields.foundAt)?0.5:1}} disabled={!lfNewFields.description||!lfNewFields.foundAt} onClick={async()=>{
                    const res=await fetch("/.netlify/functions/submit-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:lfNewFields.description,foundAt:lfNewFields.foundAt,currentLocation:lfNewFields.nowAt||lfNewFields.foundAt,dayFound:lfNewFields.day||"",foundBy:"Admin",role:"Admin"})});
                    const data=await res.json();
                    setLfNewItem(false);setLfNewFields({});
                    if(data.itemNumber) setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"lf",label:`L&F Logged — #${data.itemNumber}: ${lfNewFields.description.slice(0,30)}`},...p]);
                    fetchLostFound();
                  }}>Log Item</button>
                  <button style={{padding:"12px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>{setLfNewItem(false);setLfNewFields({});}}>Cancel</button>
                </div>
              </div>
            ):(
              <button style={{padding:"12px 16px",borderRadius:12,border:"1px solid rgba(249,115,22,0.4)",background:"rgba(249,115,22,0.08)",color:"#fb923c",fontSize:14,fontWeight:800,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>setLfNewItem(true)}>
                + Log New Found Item
              </button>
            )}
            {lfLoading&&<div style={{textAlign:"center",color:"#94a3b8",padding:"20px"}}>Loading...</div>}
            {!lfLoading&&lfItems.length===0&&<div style={{textAlign:"center",color:"#94a3b8",padding:"20px"}}>No lost & found items yet.</div>}
            {lfItems.map(item=>(
              <div key={item.id} style={{borderRadius:12,border:`1px solid ${item.status==="Claimed"?"rgba(16,185,129,0.3)":item.status==="In Box"?"rgba(139,92,246,0.5)":"rgba(139,92,246,0.3)"}`,background:item.status==="Claimed"?"rgba(16,185,129,0.05)":"rgba(139,92,246,0.06)",padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>

                {/* Header row: item number + day badge + status */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                  <div style={{fontSize:15,fontWeight:900,color:item.status==="Claimed"?"#10b981":"#c4b5fd",fontFamily:"monospace",letterSpacing:"0.05em"}}>{item.itemNumber||"#?"}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {item.dayFound&&(()=>{
                      const d=(item.dayFound||'').toLowerCase();
                      const dc=d.includes('thu')?{bg:"rgba(59,130,246,0.25)",br:"rgba(59,130,246,0.6)",tx:"#bfdbfe",lb:"THU"}:
                               d.includes('fri')?{bg:"rgba(251,146,60,0.25)",br:"rgba(251,146,60,0.6)",tx:"#fed7aa",lb:"FRI"}:
                               d.includes('sat')?{bg:"rgba(22,163,74,0.25)",br:"rgba(22,163,74,0.6)",tx:"#bbf7d0",lb:"SAT"}:
                               d.includes('sun')?{bg:"rgba(139,92,246,0.25)",br:"rgba(139,92,246,0.6)",tx:"#e9d5ff",lb:"SUN"}:
                               {bg:"rgba(245,158,11,0.15)",br:"rgba(245,158,11,0.4)",tx:"#fcd34d",lb:(item.dayFound||'').slice(0,3).toUpperCase()};
                      return <div style={{fontSize:10,fontWeight:800,background:dc.bg,border:`1px solid ${dc.br}`,color:dc.tx,borderRadius:6,padding:"2px 8px"}}>{dc.lb}</div>;
                    })()}
                    {item.status==="In Box"&&<div style={{fontSize:10,fontWeight:800,background:"rgba(139,92,246,0.15)",border:"1px solid rgba(139,92,246,0.4)",color:"#c4b5fd",borderRadius:6,padding:"2px 8px"}}>📦 IN BOX</div>}
                    {item.status==="Claimed"&&<div style={{fontSize:10,fontWeight:800,background:"rgba(16,185,129,0.12)",border:"1px solid rgba(16,185,129,0.3)",color:"#6ee7b7",borderRadius:6,padding:"2px 8px"}}>✅ CLAIMED</div>}
                    {item.status!=="Claimed"&&item.status!=="In Box"&&<div style={{fontSize:10,fontWeight:800,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",color:"#fcd34d",borderRadius:6,padding:"2px 8px"}}>UNCLAIMED</div>}
                  </div>
                </div>

                {/* Description */}
                <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{item.description}</div>

                {/* Locations */}
                <div style={{display:"flex",flexDirection:"column",gap:3,fontSize:12,color:"#e2e8f0"}}>
                  <div>📍 Found at: <strong style={{color:"#e2e8f0"}}>{item.location}</strong></div>
                  {item.currentLocation&&item.currentLocation!==item.location&&<div>📌 Now at: <strong style={{color:"#e2e8f0"}}>{item.currentLocation}</strong></div>}
                  <div>👤 {item.foundBy} · 🕐 {item.foundAt||""}</div>
                </div>

                {/* Claimed info */}
                {item.status==="Claimed"&&<div style={{fontSize:12,color:"#10b981",background:"rgba(16,185,129,0.06)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:8,padding:"8px 10px"}}>✅ Claimed by {item.claimedBy}{item.claimedByID?` · ID: ${item.claimedByID}`:""}</div>}
                {item.inBoxAt&&<div style={{fontSize:11,color:"#a78bfa"}}>📦 Boxed: {item.inBoxAt}</div>}
                {item.officeAt&&<div style={{fontSize:11,color:"#a5b4fc"}}>🏢 Festival Office: {item.officeAt}</div>}

                {/* Action buttons */}
                {item.status!=="Claimed"&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                  <button style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(139,92,246,0.4)",background:"rgba(139,92,246,0.1)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>setLfClaimView(item)}>✅ Mark Claimed</button>
                  {item.status!=="In Box"&&<button style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(245,158,11,0.4)",background:"rgba(245,158,11,0.08)",color:"#fcd34d",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>{
                    const ts=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
                    setLfItems(p=>p.map(i=>i.id===item.id?{...i,status:"In Box",inBoxAt:ts}:i));
                    fetch("/.netlify/functions/update-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:"In Box",inBoxAt:ts})}).catch(()=>{});
                  }}>📦 In L&F Box</button>}
                  {item.status!=="at_office"&&<button style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.08)",color:"#a5b4fc",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>{
                    const ts=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
                    setLfItems(p=>p.map(i=>i.id===item.id?{...i,status:"at_office",officeAt:ts}:i));
                    fetch("/.netlify/functions/update-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status:"at_office",officeAt:ts})}).catch(()=>{});
                  }}>🏢 Festival Office</button>}
                </div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div></div>
  );


  if(view==="acks") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Acknowledgments</span></div>
      <div style={S.callQ}>
        {broadcastAlerts.filter(a=>a.requiresAck).map((a,i)=>{
          const tot=ALL_LOCS.length,conf=Object.keys(a.acks||{}).length,pct=Math.round(conf/tot*100);
          return(<div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",padding:"14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{a.label}</div><div style={{fontSize:11,color:"#94a3b8"}}>{a.date}</div></div>
              <button style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#fca5a5",fontSize:11,borderRadius:6,padding:"4px 8px",cursor:"pointer"}} onClick={()=>setBroadcastAlerts(p=>p.filter((_,j)=>j!==i))}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{flex:1,height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#10b981,#059669)",borderRadius:3,width:`${pct}%`,transition:"width 0.4s"}}/></div>
              <span style={{fontSize:12,color:"#e2e8f0"}}>{conf}/{tot}</span>
            </div>
            {ALL_LOCS.map(loc=>{const t=a.acks?.[loc];return(<div key={loc} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",borderRadius:8,border:`1px solid ${t?"#10b981":"rgba(239,68,68,0.2)"}`,background:t?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.03)",marginBottom:3}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:t?"#10b981":"#ef4444",display:"inline-block",flexShrink:0}}/>
              <span style={{flex:1,fontSize:12,color:"#cbd5e1"}}>{loc}</span>
              {t?<span style={{fontSize:11,color:"#10b981",fontWeight:600}}>{t}</span>:<button style={{fontSize:10,background:"rgba(255,255,255,0.06)",border:"none",color:"#e2e8f0",borderRadius:4,padding:"2px 6px",cursor:"pointer"}} onClick={()=>setBroadcastAlerts(prev=>prev.map((al,j)=>j!==i?al:{...al,acks:{...al.acks,[loc]:"Override"}}))}>Override</button>}
            </div>);})}
          </div>);
        })}
        {broadcastAlerts.filter(a=>a.requiresAck).length===0&&<div style={S.empty}>No active alerts</div>}
      </div>
    </div></div>
  );

  // LOG VIEW
  if(view==="log") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Activity Log</span><BB onClick={()=>setView("home")}/><span style={{fontSize:12,color:"#475569",marginLeft:"auto"}}>{activityLog.length} entries</span></div>
      <div style={S.callQ}>
        {activityLog.map((e,i)=>{
          const isOpen=expandedLog===i;
          const typeColor={medical:"#a855f7",walk_in:"#a855f7",fire:"#ef4444",security:"#3b82f6",lost_child:"#f59e0b",supplies:"#92400e",maintenance:"#10b981",resource:"#60a5fa",broadcast:"#7c3aed",ack:"#10b981",clear:"#10b981","911":"#ef4444",weather:"#38bdf8",general:"#64748b"}[e.type]||"#64748b";
          const typeEmoji={medical:"🩺",walk_in:"🏥",fire:"🔥",security:"🛡",lost_child:"🧒",supplies:"📦",maintenance:"🔧",resource:"📋",broadcast:"📢",ack:"✅",clear:"✅","911":"🚨",weather:"⛈",general:"💬"}[e.type]||"📋";
          return(
            <div key={i} style={{background:isOpen?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.03)",borderRadius:12,border:`1px solid ${isOpen?typeColor+"55":"rgba(255,255,255,0.07)"}`,overflow:"hidden",transition:"border-color 0.2s",marginBottom:4}}>
              {/* HEADER ROW — always visible, tap to expand */}
              <button style={{display:"flex",alignItems:"center",gap:10,padding:"12px",width:"100%",background:"none",border:"none",cursor:"pointer",textAlign:"left"}} onClick={()=>setExpandedLog(isOpen?null:i)}>
                <span style={{fontSize:18,minWidth:24,textAlign:"center"}}>{typeEmoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{e.date||e.ts}</div>
                </div>
                <span style={{fontSize:11,color:typeColor,fontWeight:700,flexShrink:0}}>{e.ts}</span>
                <span style={{fontSize:12,color:"#475569",flexShrink:0,marginLeft:4}}>{isOpen?"▲":"▼"}</span>
              </button>
              {/* EXPANDED DETAIL */}
              {isOpen&&(
                <div style={{padding:"0 12px 14px",display:"flex",flexDirection:"column",gap:8,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:10}}>
                    {e.type&&<span style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:`${typeColor}22`,color:typeColor,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{e.type.replace("_"," ")}</span>}
                    {e.ts&&<span style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:"rgba(255,255,255,0.06)",color:"#e2e8f0",fontWeight:600}}>⏰ {e.ts}</span>}
                    {e.date&&e.date!==e.ts&&<span style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:"rgba(255,255,255,0.06)",color:"#94a3b8"}}>📅 {e.date}</span>}
                  </div>
                  {e.location&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:"#94a3b8",minWidth:60,fontWeight:600}}>Location</span><span style={{fontSize:13,color:"#f1f5f9",fontWeight:700}}>📍 {e.location}</span></div>}
                  {e.msg&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:"#94a3b8",minWidth:60,fontWeight:600,flexShrink:0}}>Details</span><span style={{fontSize:13,color:"#e2e8f0",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{e.msg}</span></div>}
                  {e.unit&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#94a3b8",minWidth:60,fontWeight:600}}>Unit</span><span style={{fontSize:13,color:"#f1f5f9"}}>👤 {e.unit}</span></div>}
                  {e.requestedBy&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#94a3b8",minWidth:60,fontWeight:600}}>From</span><span style={{fontSize:13,color:"#f1f5f9"}}>{e.requestedBy}</span></div>}
                  {!e.msg&&!e.location&&!e.unit&&!e.requestedBy&&<div style={{fontSize:12,color:"#475569",fontStyle:"italic"}}>No additional details</div>}
                </div>
              )}
            </div>
          );
        })}
        {activityLog.length===0&&<div style={S.empty}>No activity yet</div>}
      </div>
    </div></div>
  );

  // MED HOME
  // END OF NIGHT REPORT VIEW
  if(view==="endofnight") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>setView("home")}/>
        <span style={S.panelTitle}>🌙 End of Night Report</span>
      </div>
      <div style={S.cWrap}>
        <div style={{background:"rgba(99,102,241,0.08)",borderRadius:12,border:"1px solid rgba(99,102,241,0.2)",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:14,fontWeight:800,color:"#a5b4fc"}}>Tonight's Summary</div>
          <div style={{fontSize:13,color:"#e2e8f0"}}>Date: {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{[...calls,...completed].length}</div><div style={{fontSize:11,color:"#94a3b8"}}>Total Calls</div></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{lfItems.length}</div><div style={{fontSize:11,color:"#94a3b8"}}>L&F Items</div></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{broadcastAlerts.length}</div><div style={{fontSize:11,color:"#94a3b8"}}>Broadcasts</div></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{activityLog.length}</div><div style={{fontSize:11,color:"#94a3b8"}}>Log Entries</div></div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,textTransform:"uppercase"}}>Call Breakdown</div>
          {[["medical","🩺 Medical"],["fire","🔥 Fire/Safety"],["security","🛡 Security"],["supplies","📦 Supplies"],["maintenance","🔧 Maintenance"],["lost_child","🧒 Lost Child"]].map(([type,label])=>{
            const count=[...calls,...completed].filter(c=>c.type===type).length;
            return count>0?(<div key={type} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:8}}><span style={{fontSize:13,color:"#f1f5f9"}}>{label}</span><span style={{fontSize:13,fontWeight:700,color:"#a5b4fc"}}>{count}</span></div>):null;
          })}
        </div>

        {lfItems.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Lost & Found</div>
            {lfItems.map(item=>(
              <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:8}}>
                <span style={{fontSize:12,color:"#f1f5f9"}}>#{item.itemNumber} — {item.description}</span>
                <span style={{fontSize:11,color:item.status==="Claimed"?"#10b981":"#f59e0b"}}>{item.status}</span>
              </div>
            ))}
          </div>
        )}

        <Fld label="Additional Notes for Report" value={endOfNightNotes||""} onChange={e=>setEndOfNightNotes(e.target.value)} ph="Any additional notes for tonight's summary..." multi/>

        {endOfNightSent&&<div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:12,padding:"16px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:16,fontWeight:900,color:"#10b981"}}>Report Submitted!</div>
          <div style={{fontSize:13,color:"#64748b",marginTop:4}}>Saved to Airtable · SMS sent to Admin</div>
          <button style={{...S.sendBtn,background:"rgba(99,102,241,0.2)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.3)",fontSize:13,padding:"10px",marginTop:12}} onClick={()=>{setEndOfNightSent(false);setView("home");}}>← Back to Home</button>
        </div>}
        {!endOfNightSent&&<button style={{...S.sendBtn,background:"linear-gradient(135deg,#6366f1,#4f46e5)"}}
          onClick={async()=>{
            const report={
              date:new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}),
              totalCalls:[...calls,...completed].length,
              callBreakdown:{
                medical:[...calls,...completed].filter(c=>c.type==="medical"||c.type==="walk_in").length,
                fire:[...calls,...completed].filter(c=>c.type==="fire").length,
                security:[...calls,...completed].filter(c=>c.type==="security").length,
                supplies:[...calls,...completed].filter(c=>c.type==="supplies").length,
                maintenance:[...calls,...completed].filter(c=>c.type==="maintenance").length,
                lostChild:[...calls,...completed].filter(c=>c.type==="lost_child").length,
              },
              lostFound:lfItems.map(i=>`#${i.itemNumber}: ${i.description} (${i.status})`).join("\n"),
              broadcasts:broadcastAlerts.map(b=>`${b.label}: ${b.msg?.slice(0,80)}`).join("\n"),
              notes:endOfNightNotes||"",
              generatedBy:role,
              generatedAt:new Date().toLocaleString(),
            };
            // Send SMS summary to Admin
            const summary=`🌙 END OF NIGHT REPORT\n${report.date}\n\nCalls: ${report.totalCalls}\nMedical: ${report.callBreakdown.medical}\nSecurity: ${report.callBreakdown.security}\nL&F Items: ${lfItems.length}\nBroadcasts: ${broadcastAlerts.length}\n\nGenerated by ${role}`;
            // Send email to Admin
            const emailBody=`END OF NIGHT REPORT — ${report.date}\n\nTOTAL CALLS: ${report.totalCalls}\nMedical: ${report.callBreakdown.medical}\nFire/Safety: ${report.callBreakdown.fire}\nSecurity: ${report.callBreakdown.security}\nSupplies: ${report.callBreakdown.supplies}\nMaintenance: ${report.callBreakdown.maintenance}\nLost Child: ${report.callBreakdown.lostChild}\n\nLOST & FOUND (${lfItems.length} items):\n${lfItems.map(i=>`#${i.itemNumber}: ${i.description} (${i.status})`).join("\n")||"None"}\n\nBROADCASTS (${broadcastAlerts.length}):\n${broadcastAlerts.map(b=>b.label).join("\n")||"None"}\n\nNOTES:\n${endOfNightNotes||"None"}\n\nGenerated by ${role} at ${new Date().toLocaleString()}`;
            // Save to Airtable + SMS via dedicated function
            fetch("/.netlify/functions/send-eod-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:report.date,totalCalls:report.totalCalls,callBreakdown:report.callBreakdown,lostFound:report.lostFound,broadcasts:report.broadcasts,notes:report.notes,generatedBy:role})}).catch(()=>{});
            fetch("/.netlify/functions/send-eod-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
              date:report.date,
              totalCalls:report.totalCalls,
              callBreakdown:report.callBreakdown,
              lostFound:report.lostFound,
              broadcasts:report.broadcasts,
              notes:report.notes,
              generatedBy:role,
              generatedAt:report.generatedAt,
            })}).catch(e=>console.log(e));
            setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"report",label:"End of Night Report Generated",msg:`${report.totalCalls} calls · ${lfItems.length} L&F items`},...p]);
            setEndOfNightSent(true);
          }}>
          📧 Generate & Send Report
        </button>}
      </div>
    </div></div>
  );

  if(view==="911") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      {/* FULL SCREEN ALERT HEADER */}
      <div style={{background:"linear-gradient(135deg,#dc2626,#991b1b)",padding:"16px",display:"flex",flexDirection:"column",gap:4,textAlign:"center",boxShadow:"0 0 24px rgba(239,68,68,0.4)"}}>
        <div style={{fontSize:40}}>🚨</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"0.04em"}}>MFD / EMS INBOUND</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>911 Active · Initiated by {nineOneOne.by} · {nineOneOne.at}</div>
      </div>

      <div style={S.panelHd}><span style={S.panelTitle}>911 Incident Details</span><BB onClick={()=>setView("home")}/></div>

      <div style={S.cWrap}>
        {/* ALL INCIDENT INFO */}
        {[["location","Location","e.g. Near Moon Stage 1"],["nature","Nature of Call","e.g. Unresponsive adult"],["patients","Number of Patients","e.g. 1"],["age_sex","Age / Sex","e.g. 40s Male"],["conscious","Conscious / Breathing","e.g. Unconscious, breathing"],["interventions","Interventions in Progress","e.g. CPR in progress"],["entry","EMS Entry Point","e.g. Main Gate on Willy St"],["meeting","Who's Meeting EMS","e.g. Med 1 at gate"]].map(([k,l,p])=><Fld key={k} label={l} value={nineOneOne.info?.[k]||""} onChange={e=>set911(prev=>({...prev,info:{...prev.info,[k]:e.target.value}}))} ph={p}/>)}

        <label style={S.lbl}>🏥 MFD Staging Location</label>
        <select style={S.sel} value={emsForm.staging} onChange={e=>setEmsForm(p=>({...p,staging:e.target.value}))}>
          <option value="">Select...</option>
          {EMS_STAGING.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <Fld label="⏱ EMS ETA" value={emsForm.eta} onChange={e=>setEmsForm(p=>({...p,eta:e.target.value}))} ph="e.g. 8 minutes"/>

        {/* SEND DISPATCH ALERT */}
        {!emsDispatched
          ?<button style={{...S.sendBtn,background:"linear-gradient(135deg,#dc2626,#991b1b)",opacity:(!emsForm.staging||!emsForm.eta)?0.5:1}} disabled={!emsForm.staging||!emsForm.eta} onClick={()=>setEmsDispatched(true)}>🚑 SEND EMS DISPATCH ALERT</button>
          :<div style={{background:"rgba(16,185,129,0.1)",border:"1px solid #10b981",borderRadius:10,padding:"12px",fontSize:13,color:"#10b981",fontWeight:700}}>✅ EMS Dispatch Alert Sent · {EMS_STAGING.find(s=>s.id===emsForm.staging)?.label} · ETA: {emsForm.eta}</div>
        }

        {/* ACKNOWLEDGE BUTTON — marks EMS as inbound, shows banner on home until cleared */}
        {!emsAcked
          ?<button style={{...S.sendBtn,background:"linear-gradient(135deg,#f59e0b,#d97706)",fontSize:16,fontWeight:900}} onClick={()=>{setEmsAcked(true);setEmsAlertDismissed(false);setView("home");}}>
            ✅ ACKNOWLEDGE — MFD / EMS INBOUND
          </button>
          :<div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.4)",borderRadius:10,padding:"12px",fontSize:13,color:"#f59e0b",fontWeight:700}}>✅ Acknowledged — MFD / EMS Inbound banner active on home screen</div>
        }

        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)"}} onClick={()=>{
          // Trigger incident report before closing
          const callData={
            id:`911-${Date.now()}`,
            type:"medical",
            location:nineOneOne.info?.location||"Festival Grounds",
            problem:nineOneOne.info?.nature||"EMS/911 Incident",
            details:emsForm.notes||"",
            requestedBy:nineOneOne.by||role,
            timestamp:nineOneOne.at||new Date().toISOString(),
          };
          setIncidentView(callData);
          setIncFields({respondingUnit:role,disposition:"",interventions:nineOneOne.info?.interventions||"",narrative:"",notes:`ETA: ${emsForm.eta||""} · Staging: ${emsForm.staging||""} · Meeting EMS: ${nineOneOne.info?.meeting||""}`});
          set911({active:false,info:{},by:null,at:null});
          setEmsDispatched(false);setEmsAcked(false);setEmsAlertDismissed(false);
          setEmsForm({staging:"",eta:"",nature:"",notes:""});
          setView("home");
        }}>✅ CLOSE INCIDENT & FILE REPORT</button>
      </div>
    </div></div>
  );

  // ACKS VIEW

  // ADMIN CALL DETAIL / OVERRIDE VIEW
  if(adminCallDetail && isAdmin){
    const ac=adminCallDetail;
    const typeColors={medical:"#1e40af",fire:"#dc2626",security:"#1e1e2e",walk_in:"#7c3aed",maintenance:"#059669",supplies:"#d97706",lost_child:"#b45309"};
    const typeLabels={medical:"MEDICAL ALERT",fire:"FIRE / LIFE SAFETY ALERT",security:"SECURITY ALERT",walk_in:"WALK-IN PATIENT",maintenance:"MAINTENANCE",supplies:"SUPPLY REQUEST",lost_child:"LOST CHILD"};
    const bc=typeColors[ac.type]||"#1e40af";
    const bl=typeLabels[ac.type]||ac.type.toUpperCase();
    return(<div style={S.root}><Bg/>
      <div style={{position:"fixed",top:0,left:0,right:0,height:4,background:bc}}/>
      <div style={S.panel}>
        <div style={{background:`linear-gradient(135deg,${bc}dd,${bc}99)`,padding:"14px 16px",margin:"0 0 4px"}}>
          <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.7)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Active Call — Admin View</div>
          <div style={{fontSize:18,fontWeight:900,color:"#fff",marginTop:4}}>{bl}</div>
          {nineOneOne.active&&nineOneOne.callId===ac.id&&(
            <div style={{marginTop:8,background:"rgba(220,38,38,0.3)",border:"1px solid rgba(220,38,38,0.6)",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:700,color:"#fca5a5"}}>
              🚨 911 ACTIVATED by {nineOneOne.by} · Staging: {nineOneOne.info?.staging||"Unknown"} · {nineOneOne.at}
            </div>
          )}
        </div>
        <div style={S.cWrap}>
          {/* All call info — editable */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {label:"Location",key:"location",val:ac.location},
              {label:"Problem / Description",key:"problem",val:ac.problem},
              {label:"Unit Assigned",key:"unit",val:ac.unit||"Unassigned"},
              {label:"Reporting Party",key:"requestedBy",val:ac.requestedBy},
              {label:"Details",key:"details",val:ac.details||""},
            ].map(({label,key,val})=>(
              <div key={key} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>
                <input style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:14,fontWeight:600,width:"100%",outline:"none",fontFamily:"inherit"}}
                  defaultValue={val}
                  onBlur={e=>{
                    const updated={...ac,[key]:e.target.value};
                    setAdminCallDetail(updated);
                    setLiveCalls(p=>p.map(c=>c.id!==ac.id?c:{...c,[key]:e.target.value}));
                    if(liveMode) fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:ac.id,[key]:e.target.value})}).catch(()=>{});
                  }}/>
              </div>
            ))}
          </div>

          {/* Timestamps */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"12px 14px"}}>
            <div style={{fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Timeline</div>
            {[
              {label:"Time of Call",val:ac.timestamp||ac.firedAt?new Date(ac.firedAt||Date.now()).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}):"—"},
              {label:"Acknowledged",val:ac.acknowledgedAt||"Not yet"},
              {label:"On Scene",val:ac.status==="on_scene"?"✅ On Scene":"Not yet"},
              {label:"Cleared",val:ac.clearedAt||"Active"},
            ].map(({label,val})=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13}}>
                <span style={{color:"#64748b",fontWeight:600}}>{label}</span>
                <span style={{color:"#f1f5f9",fontWeight:700}}>{val}</span>
              </div>
            ))}
          </div>

          {/* Admin actions */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button style={{...S.sendBtn,background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",color:"#fbbf24"}}
              onClick={()=>{if(liveMode)fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:ac.id,status:"On Scene",unit:ac.unit})}).catch(()=>{});setLiveCalls(p=>p.map(c=>c.id!==ac.id?c:{...c,status:"on_scene"}));setAdminCallDetail(p=>({...p,status:"on_scene"}));}}>
              📍 Mark On Scene
            </button>
            <button style={{...S.sendBtn,background:"rgba(29,78,216,0.15)",border:"1px solid rgba(59,130,246,0.4)",color:"#93c5fd"}}
              onClick={()=>{
                const mpdMsg=`👮 MPD REQUESTED — ${bl}\nLOCATION: ${ac.location}\nSITUATION: ${ac.problem}\nREQUESTED BY: ${role}\nTIME: ${tShort()}`;
                fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"mpd_requested",officers:mpdOfficers,location:ac.location,situation:mpdMsg})}).catch(()=>{});
                sendGroupMe(mpdMsg,["admin"]);
                setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"security",label:`MPD Notified — ${ac.location}`,msg:ac.problem},...p]);
              }}>
              👮 Notify MPD — Request Officer
            </button>
            <button style={{...S.sendBtn,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.4)",color:"#6ee7b7"}}
              onClick={()=>{clearCall(ac.id,role);setAdminCallDetail(null);}}>
              ✅ Clear Call — Generate Report
            </button>
            <button style={{...S.sendBtn,background:"none",color:"#475569",fontSize:13}}
              onClick={()=>setAdminCallDetail(null)}>
              ← Back to Hub
            </button>
          </div>
        </div>
      </div>
    </div>);
  }

  // MED CALL DETAIL VIEW
  if(medActiveCall && isMed){
    const mc=medActiveCall;
    const typeColors={medical:"#be185d",fire:"#dc2626",security:"#1d4ed8",walk_in:"#7c3aed"};
    const typeLabels={medical:"MEDICAL",fire:"FIRE / LIFE SAFETY",security:"SECURITY",walk_in:"WALK-IN"};
    const color=typeColors[mc.type]||"#be185d";
    return(<div style={S.root}><Bg/>
      <div style={{position:"fixed",top:0,left:0,right:0,height:4,background:color}}/>
      <div style={S.panel}>
        <div style={{background:`linear-gradient(135deg,${color}22,${color}11)`,border:`1px solid ${color}44`,borderRadius:14,padding:"16px",margin:"12px 0 8px"}}>
          <div style={{fontSize:11,fontWeight:800,color:color,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{typeLabels[mc.type]||mc.type} — ACTIVE CALL</div>
          <div style={{fontSize:20,fontWeight:900,color:"#f1f5f9",marginBottom:4}}>📍 {mc.location}</div>
          <div style={{fontSize:15,color:"#cbd5e1",marginBottom:4}}>🔍 {mc.problem}</div>
          {mc.details&&<div style={{fontSize:13,color:"#e2e8f0"}}>ℹ️ {mc.details}</div>}
          <div style={{fontSize:12,color:"#64748b",marginTop:6}}>Reported by {mc.requestedBy} · Acked by {mc.unit} · {mc.acknowledgedAt}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 0 12px"}}>
          {/* 911 button - auto-pulls from this call */}
          {!nineOneOne.active&&<button style={{width:"100%",padding:"16px",borderRadius:12,border:"2px solid rgba(180,0,0,0.6)",background:"rgba(180,0,0,0.1)",color:"#f87171",fontSize:16,fontWeight:900,cursor:"pointer"}}
            onClick={()=>{
              set911({active:true,by:role,at:now(),callId:mc.id,info:{location:mc.location,nature:mc.problem,type:mc.type}});
              const msg911=`🚨 911 ACTIVATED — ${role}\nLOCATION: ${mc.location}\nCALL: ${mc.problem}\nMADISON FIRE / EMS INBOUND\nTIME: ${tShort()}`;
              sendGroupMe(`MEDICAL ALERT 🩺\n${msg911}`,["admin","medical"]);
              const phones=[...new Set([ADMIN2_PHONE,...(staffList||[]).filter(s=>["m1","m2","a1","a2"].some(r=>(s.role||"").toLowerCase().startsWith(r))).map(s=>s.phone).filter(Boolean)])];
              phones.forEach(p=>{const d=p.replace(/\D/g,"");const fmt=d.length===10?`+1${d}`:d.length===11&&d[0]==="1"?`+${d}`:p;fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmt,message:msg911})}).catch(()=>{});fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmt,message:`911 activated by ${role} at Fete de Marquette. Responding to ${mc.location}. ${mc.problem}. EMS inbound. Clear a path.`})}).catch(()=>{});});
            }}>🚨 Activate 911 — EMS to This Call</button>}
          {nineOneOne.active&&<div style={{background:"rgba(180,0,0,0.15)",border:"2px solid rgba(180,0,0,0.5)",borderRadius:12,padding:"14px",textAlign:"center",color:"#f87171",fontWeight:900}}>🚨 911 ACTIVE — EMS INBOUND</div>}
          {/* On Scene button */}
          <button style={{width:"100%",padding:"14px",borderRadius:12,border:`2px solid ${mc.status==="on_scene"?"rgba(16,185,129,0.8)":"rgba(245,158,11,0.5)"}`,background:mc.status==="on_scene"?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.1)",color:mc.status==="on_scene"?"#6ee7b7":"#fbbf24",fontSize:14,fontWeight:800,cursor:"pointer"}}
            onClick={()=>{if(liveMode)fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:mc.id,status:"On Scene",unit:mc.unit})}).catch(()=>{});setLiveCalls(p=>p.map(c=>c.id!==mc.id?c:{...c,status:"on_scene"}));setMedActiveCall(p=>({...p,status:"on_scene"}));}}>
            {mc.status==="on_scene"?"✅ On Scene — Active":"📍 On Scene"}
          </button>
          {/* Clear / Close Call */}
          <button style={{width:"100%",padding:"12px",borderRadius:12,border:"2px solid rgba(29,78,216,0.5)",background:"rgba(29,78,216,0.1)",color:"#93c5fd",fontSize:13,fontWeight:800,cursor:"pointer"}}
            onClick={()=>{
              const mpdMsg=`👮 MPD REQUESTED — ${mc.type.toUpperCase()}\nLOCATION: ${mc.location}\nSITUATION: ${mc.problem}\nREQUESTED BY: ${role}\nTIME: ${tShort()}`;
              fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"mpd_requested",officers:mpdOfficers,location:mc.location,situation:mpdMsg})}).catch(()=>{});
              sendGroupMe(mpdMsg,["admin","medical"]);
            }}>
            👮 Notify MPD — Request Officer
          </button>
          <button style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid rgba(16,185,129,0.5)",background:"rgba(16,185,129,0.1)",color:"#6ee7b7",fontSize:14,fontWeight:800,cursor:"pointer"}}
            onClick={()=>{clearCall(mc.id,role);setMedActiveCall(null);}}>
            ✅ Clear Call — Generate Report
          </button>
          <button style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"none",color:"#475569",fontSize:13,cursor:"pointer"}}
            onClick={()=>setMedActiveCall(null)}>
            ← Back to Med Hub (call stays active)
          </button>
        </div>
      </div>
    </div>);
  }

  if(isMed) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 16px 8px"}}>
        <div><div style={{fontSize:18,fontWeight:900,color:"#fff"}}>Fête de Marquette</div><div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em"}}>2026 Operations</div></div>
        <div style={{display:"flex",gap:6}}>
          <button style={{...S.backBtn,padding:"8px 10px",fontSize:12}} onClick={()=>setRole(null)}>↩ Role</button>
          <button style={{...S.backBtn,padding:"8px 10px",fontSize:12}} onClick={onBack}>← Apps</button>
        </div>
      </div>
      <div style={{fontSize:13,color:"#ec4899",fontWeight:700,padding:"0 16px 8px"}}>🔴 {role} — Medical Unit</div>
      {/* 911 STATUS — Clean single block */}
      <div style={{margin:"0 16px 8px"}}>
        {nineOneOne.active?(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{borderRadius:12,border:"2px solid #ef4444",background:"linear-gradient(135deg,rgba(180,0,0,0.3),rgba(120,0,0,0.15))",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8,boxShadow:"0 0 16px rgba(239,68,68,0.3)"}}>
              <div style={{fontSize:15,fontWeight:900,color:"#ef4444",letterSpacing:"0.06em",textTransform:"uppercase"}}>🚨 MFD / EMS INBOUND — ACTIVE</div>
              {nineOneOne.info?.location&&<div style={{fontSize:14,fontWeight:700,color:"#fff"}}>📍 {nineOneOne.info.location}</div>}
              {nineOneOne.info?.nature&&<div style={{fontSize:13,color:"#fca5a5"}}>{nineOneOne.info.nature}</div>}
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Initiated by {nineOneOne.by}{nineOneOne.info?.activatedBy?" · "+nineOneOne.info.activatedBy:""} · {nineOneOne.at}</div>
              <button style={{padding:"10px",borderRadius:8,border:"1px solid rgba(239,68,68,0.5)",background:"rgba(239,68,68,0.15)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>setView("911")}>Update / View Details →</button>
            </div>
            <button style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid rgba(180,0,0,0.6)",background:"linear-gradient(135deg,rgba(180,0,0,0.25),rgba(120,0,0,0.1))",color:"#fff",fontSize:14,fontWeight:900,cursor:"pointer",textAlign:"center"}}
              onClick={()=>{
                // Archive current incident and start new one
                setNineOneOneHistory(p=>[...p,{...nineOneOne,closedAt:now()}]);
                set911({active:true,by:role,at:now(),info:{}});
                setView("911");
                sendGroupMe(`🚨 ADDITIONAL 911 INCIDENT by ${role}\nNew MFD / EMS activation — separate incident.`,["admin","medical"]);
                fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:`🚨 ADDITIONAL 911 INCIDENT by ${role} at Fete de Marquette. New separate incident.`})}).catch(e=>console.log(e));
              }}>
              ➕ New Separate 911 Incident
            </button>
          </div>
        ):(
          <button style={{width:"100%",padding:"18px",borderRadius:12,border:"2px solid rgba(180,0,0,0.6)",background:"rgba(180,0,0,0.08)",color:"#f87171",fontSize:16,fontWeight:900,cursor:"pointer",textAlign:"center",letterSpacing:"0.02em"}}
            onClick={()=>{
              // Pull info directly from current active call
              const activeCall=myActive?.[0]||unassigned?.[0];
              const callLoc=activeCall?.location||nineOneOne.info?.location||"Festival Grounds";
              const callProblem=activeCall?.problem||nineOneOne.info?.nature||"";
              const callType=activeCall?.type||"medical";
              const callId=activeCall?.id;
              // Activate 911 with call data
              set911({active:true,by:role,at:now(),callId,info:{location:callLoc,nature:callProblem,type:callType}});
              // Build message from call data
              const msg911=`🚨 911 ACTIVATED — ${role}\nLOCATION: ${callLoc}${callProblem?"\nCALL: "+callProblem:""}\nMADISON FIRE / EMS INBOUND\nTIME: ${new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}\nClear a path for emergency vehicles.`;
              // Fire SMS + Voice + GroupMe immediately — no second tap
              sendGroupMe(`MEDICAL ALERT 🩺\n${msg911}`,["admin","medical"]);
              const phones=[...new Set(["+16082289692",...(staffList||[]).filter(s=>["m1","m2","a1","a2"].some(r=>(s.role||"").toLowerCase().startsWith(r))).map(s=>s.phone).filter(Boolean)])];
              phones.forEach(p=>{
                const d=p.replace(/\D/g,"");
                const fmt=d.length===10?`+1${d}`:d.length===11&&d[0]==="1"?`+${d}`:p;
                fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmt,message:msg911})}).catch(()=>{});
                fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:fmt,message:`911 ACTIVATED by ${role} at Fete de Marquette. Responding to: ${callLoc}. ${callProblem}. EMS staging at Staging 1, Ingersoll and Wilson. Clear a path for emergency vehicles. Responding to: ${callLoc}. ${callProblem}. Clear a path for emergency vehicles.`})}).catch(()=>{});
              });
              // No setView("911") — stay on call, form comes when call is cleared
            }}>
            🚨 Tap to Notify of 911 Activation
          </button>
        )}
      </div>
      <MedHome role={role} calls={activeCalls} setCalls={setCalls} completed={completed} setCompleted={setCompleted} medSt={medSt} setMedSt={setMedSt} myActive={myActive} unassigned={unassigned} set911={set911} setView={setView} resourceView={resourceView} setResourceView={setResourceView} nineOneOne={nineOneOne} triggerIncident={(call)=>{setIncidentView(call);setIncFields({respondingUnit:role,disposition:"",interventions:"",narrative:"",notes:""});}} sendGroupMe={sendGroupMe} liveMode={liveMode} openLostChild={()=>setLcView(true)} setNewCallView={setNewCallView} setNewCallType={setNewCallType} setNewCallLocation={setNewCallLocation} setNewCallProblem={setNewCallProblem} staffList={staffList} setClearIncView={setClearIncView} lfItems={lfItems}/>
    </div></div>
  );

  // ADMIN HOME
  const pendingAcks=broadcastAlerts.filter(a=>a.requiresAck).reduce((s,a)=>s+ALL_LOCS.filter(l=>!(a.acks&&a.acks[l])).length,0);
  return(<div style={S.root}><Bg/><div style={S.panel}>
    {/* HEADER */}
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"20px 16px 4px"}}>
      <div><div style={{fontSize:20,fontWeight:900,color:"#fff"}}>Fête de Marquette</div><div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em"}}>2026 Operations Hub</div></div>
      <div style={{display:"flex",gap:6}}>
        <button style={{...S.backBtn,padding:"8px 10px",fontSize:12}} onClick={()=>setRole(null)}>↩ Role</button>
        <button style={{...S.backBtn,padding:"8px 10px",fontSize:12}} onClick={onBack}>← Apps</button>
      </div>
    </div>
    <div style={{fontSize:12,color:"#f59e0b",fontWeight:700,padding:"0 16px 10px"}}>⚡ Command / Admin</div>
    {nineOneOne.active&&<button style={{margin:"0 16px 8px",background:"rgba(239,68,68,0.2)",border:"2px solid #ef4444",borderRadius:10,padding:"10px",fontSize:13,color:"#fff",fontWeight:800,cursor:"pointer",textAlign:"center"}} onClick={()=>setView("911")}>🚨 911 ACTIVE — Tap to update</button>}

    <div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 16px 24px"}}>

      {/* LIVE/DEMO MODE INDICATOR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:liveMode?"rgba(16,185,129,0.08)":"rgba(245,158,11,0.08)",border:`1px solid ${liveMode?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.3)"}`,borderRadius:10,padding:"10px 14px"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:liveMode?"#10b981":"#f59e0b"}}>{liveMode?"⚡ LIVE MODE — Real calls from staff":"🎭 DEMO MODE — Showing sample data"}</div>
          {!liveMode&&<div style={{fontSize:10,color:"#374151",marginTop:2}}>Switching to Live clears all demo calls</div>}
        </div>
        {liveMode&&<button style={{background:"none",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,padding:"4px 10px",color:"#fca5a5",fontSize:11,cursor:"pointer",fontWeight:600,marginRight:4}} onClick={async()=>{
          if(!window.confirm("Clear ALL active calls from Airtable? Use before going live.")) return;
          try{
            await fetch("/.netlify/functions/clear-test-calls",{method:"POST"});
            setLiveCalls([]);
            alert("All test calls cleared from Airtable.");
          }catch(e){alert("Error: "+e.message);}
        }}>🗑 Clear Test Calls</button>}
        <button style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"4px 10px",color:"#64748b",fontSize:11,cursor:"pointer",fontWeight:600}} onClick={()=>{
          setLiveMode(p=>{
            if(!p){
              // Switching TO live — clear demo calls so they don't bleed in
              setCalls([]);
              setLiveCalls([]);
            }
            return !p;
          });
        }}>Switch</button>
      </div>

      {/* 911 INBOUND BANNER — Admin home — shows full info when acknowledged, stays until incident closed */}
      {nineOneOne?.active&&emsAcked&&(
        <div style={{borderRadius:12,border:"2px solid rgba(239,68,68,0.8)",background:"linear-gradient(135deg,rgba(180,0,0,0.28),rgba(120,0,0,0.15))",padding:"16px",display:"flex",flexDirection:"column",gap:8,boxShadow:"0 0 20px rgba(239,68,68,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#ef4444",letterSpacing:"0.08em",textTransform:"uppercase"}}>🚨 MFD / EMS INBOUND — ACTIVE INCIDENT</div>
            <button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",fontWeight:600}} onClick={()=>setView("911")}>Details →</button>
          </div>
          {nineOneOne.info?.location&&<div style={{fontSize:22,fontWeight:900,color:"#fff"}}>📍 {nineOneOne.info.location}</div>}
          {nineOneOne.info?.nature&&<div style={{fontSize:14,fontWeight:700,color:"#fca5a5"}}>{nineOneOne.info.nature}</div>}
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {nineOneOne.info?.patients&&<div style={{fontSize:12,color:"#e2e8f0"}}>👤 {nineOneOne.info.patients} patient{nineOneOne.info.patients!=="1"?"s":""}</div>}
            {nineOneOne.info?.age_sex&&<div style={{fontSize:12,color:"#e2e8f0"}}>{nineOneOne.info.age_sex}</div>}
            {nineOneOne.info?.conscious&&<div style={{fontSize:12,color:"#e2e8f0"}}>{nineOneOne.info.conscious}</div>}
            {emsForm.eta&&<div style={{fontSize:12,color:"#fbbf24",fontWeight:700}}>⏱ ETA: {emsForm.eta}</div>}
          </div>
          {nineOneOne.info?.interventions&&<div style={{fontSize:13,color:"#e2e8f0"}}>Interventions: {nineOneOne.info.interventions}</div>}
          {nineOneOne.info?.meeting&&<div style={{fontSize:13,color:"#e2e8f0"}}>Meeting EMS: {nineOneOne.info.meeting}</div>}
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>By {nineOneOne.by} · {nineOneOne.at} · Stays until incident closed</div>
        </div>
      )}
      {/* PERSISTENT ACKNOWLEDGED CALL BANNERS — stays until cleared */}
      {Object.values(ackedBanners).map(c=>{
        const ac=ALERT_COLORS[c.type]||ALERT_COLORS.medical;
        const bannerColors={
          medical:"rgba(126,34,206,0.15)",fire:"rgba(239,68,68,0.15)",security:"rgba(59,130,246,0.15)",
          lost_child:"rgba(234,179,8,0.15)",supplies:"rgba(120,53,15,0.15)",maintenance:"rgba(16,185,129,0.15)",walk_in:"rgba(219,39,119,0.15)"
        };
        const bannerBorder={
          medical:"rgba(126,34,206,0.5)",fire:"rgba(239,68,68,0.5)",security:"rgba(59,130,246,0.5)",
          lost_child:"rgba(234,179,8,0.5)",supplies:"rgba(180,83,9,0.4)",maintenance:"rgba(16,185,129,0.4)",walk_in:"rgba(219,39,119,0.5)"
        };
        return(
          <div key={c.id} style={{borderRadius:12,border:`2px solid ${bannerBorder[c.type]||"rgba(255,255,255,0.2)"}`,background:bannerColors[c.type]||"rgba(255,255,255,0.05)",padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:13,fontWeight:900,color:ac.border||"#f1f5f9",letterSpacing:"0.06em",textTransform:"uppercase"}}>{ac.icon} {ac.label} — ACKNOWLEDGED</div>
              <button style={{background:"none",border:"none",color:"#64748b",fontSize:11,cursor:"pointer",fontWeight:600}} onClick={()=>removeAckedBanner(c.id)}>✕ Clear</button>
            </div>
            <div style={{fontSize:19,fontWeight:900,color:"#fff"}}>📍 {c.location}</div>
            {c.problem&&<div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",lineHeight:1.5}}>{c.problem}</div>}
            {c.details&&<div style={{fontSize:13,color:"#e2e8f0",lineHeight:1.5}}>{c.details}</div>}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:2}}>
              {c.unit&&<div style={{fontSize:12,color:"#e2e8f0"}}>👤 Unit: <span style={{color:"#f1f5f9",fontWeight:700}}>{c.unit}</span></div>}
              {c.requestedBy&&<div style={{fontSize:12,color:"#e2e8f0"}}>From: <span style={{color:"#f1f5f9",fontWeight:700}}>{c.requestedBy}</span></div>}
              <div style={{fontSize:12,color:"#e2e8f0"}}>⏰ <span style={{color:"#f1f5f9",fontWeight:700}}>{c.ackedAt}</span></div>
            </div>
          </div>
        );
      })}

      {/* Pre-acknowledge — tap to go to 911 screen */}
      {nineOneOne?.active&&!emsAcked&&(
        <div style={{borderRadius:12,border:"2px solid rgba(239,68,68,0.8)",background:"linear-gradient(135deg,rgba(180,0,0,0.25),rgba(120,0,0,0.12))",padding:"14px 16px",display:"flex",flexDirection:"column",gap:6,boxShadow:"0 0 16px rgba(239,68,68,0.25)",cursor:"pointer"}} onClick={()=>setView("911")}>
          <div style={{fontSize:13,fontWeight:900,color:"#ef4444",letterSpacing:"0.08em",textTransform:"uppercase"}}>🚨 911 ACTIVE — TAP TO ACKNOWLEDGE</div>
          {nineOneOne.info?.location&&<div style={{fontSize:18,fontWeight:800,color:"#fff"}}>📍 {nineOneOne.info.location}</div>}
          {nineOneOne.info?.nature&&<div style={{fontSize:14,color:"#fca5a5"}}>{nineOneOne.info.nature}</div>}
          <div style={{fontSize:13,color:"#fbbf24",fontWeight:700}}>⚠ Tap to view full details and acknowledge</div>
        </div>
      )}

      {/* NWS WEATHER ALERT BANNER */}


      {/* WEATHER + MED STATUS LEFT | ALERTS + ACTIVE CALLS RIGHT */}
      {isAdmin&&(
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          {/* LEFT: Weather + Med Status */}
          <div style={{width:130,flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{background:"rgba(14,165,233,0.07)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:12,padding:"10px 12px",display:"flex",flexDirection:"column",gap:5}}>
              <div style={{fontSize:9,fontWeight:900,color:"#38bdf8",textTransform:"uppercase",letterSpacing:"0.1em"}}>🌤 McPike Park</div>
              <div style={{fontSize:26,fontWeight:900,color:"#f1f5f9",lineHeight:1}}>{currentWeather?.temp!=null?`${currentWeather.temp}°F`:"--°F"}</div>
              <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.3}}>{currentWeather?.desc||"Loading..."}</div>
              {currentWeather?.wind!=null&&<div style={{fontSize:10,color:"#64748b"}}>💨 {currentWeather.wind} mph</div>}
              {currentWeather?.humidity!=null&&<div style={{fontSize:10,color:"#64748b"}}>💧 {currentWeather.humidity}%</div>}
              <button style={{marginTop:2,padding:"4px 8px",borderRadius:8,border:"1px solid rgba(14,165,233,0.3)",background:"rgba(14,165,233,0.08)",color:"#38bdf8",fontSize:10,fontWeight:700,cursor:"pointer"}} onClick={()=>setRadarVisible(p=>!p)}>
                {radarVisible?"Hide Radar":"📡 Radar"}
              </button>
            </div>
            {/* Med 1 + Med 2 Status */}
            {[["med1","Med 1"],["med2","Med 2"]].map(([key,label])=>{
              const st=medSt[key]||{status:"available"};
              const isOnCall=st.status==="on_call";
              const isClear=st.status==="cleared";
              const bg=isOnCall?"rgba(147,51,234,0.15)":isClear?"rgba(16,185,129,0.1)":"rgba(255,255,255,0.03)";
              const br=isOnCall?"rgba(147,51,234,0.5)":isClear?"rgba(16,185,129,0.4)":"rgba(255,255,255,0.1)";
              const tc=isOnCall?"#d8b4fe":isClear?"#6ee7b7":"#64748b";
              const sl=isOnCall?"🟣 On Call":isClear?"🟢 Cleared":"⚪ Available";
              return(
                <div key={key} style={{background:bg,borderRadius:10,border:`1px solid ${br}`,padding:"9px 11px"}}>
                  <div style={{fontSize:12,fontWeight:900,color:"#f1f5f9",marginBottom:2}}>🩺 {label}</div>
                  <div style={{fontSize:11,fontWeight:700,color:tc}}>{sl}</div>
                  {st.since&&<div style={{fontSize:9,color:"#374151",marginTop:1}}>{st.since}</div>}
                </div>
              );
            })}
          </div>
          {/* RIGHT: Alerts + Active calls */}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:0}}>
            {nwsAlerts.slice(0,2).map((a,i)=>(
              <div key={i} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"8px 10px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#fca5a5"}}>🚨 {a.properties?.event}</div>
                <div style={{fontSize:10,color:"#94a3b8",marginTop:2,lineHeight:1.3}}>{(a.properties?.headline||"").slice(0,80)}</div>
              </div>
            ))}
            {nwsAlerts.length===0&&(
              <div style={{background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.15)",borderRadius:10,padding:"8px 10px"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#4ade80"}}>✅ No Weather Alerts</div>
                <div style={{fontSize:10,color:"#374151",marginTop:2}}>Conditions clear</div>
              </div>
            )}
            {activeCalls.filter(c=>c.status!=="cleared"&&c.type!=="lost_child").map(ac=>{
              const cc={medical:{bg:"rgba(30,64,175,0.15)",border:"rgba(59,130,246,0.6)",text:"#93c5fd",label:"🩺 Medical"},fire:{bg:"rgba(220,38,38,0.15)",border:"rgba(239,68,68,0.6)",text:"#fca5a5",label:"🔥 Fire"},security:{bg:"rgba(15,15,20,0.6)",border:"rgba(100,116,139,0.5)",text:"#94a3b8",label:"🔒 Security"},walk_in:{bg:"rgba(124,58,237,0.15)",border:"rgba(167,139,250,0.5)",text:"#c4b5fd",label:"🚶 Walk-In"},maintenance:{bg:"rgba(5,150,105,0.12)",border:"rgba(16,185,129,0.5)",text:"#6ee7b7",label:"🔧 Maint"},supplies:{bg:"rgba(217,119,6,0.12)",border:"rgba(245,158,11,0.5)",text:"#fcd34d",label:"📦 Supplies"}};
              const c2=cc[ac.type]||cc.medical;
              return(
                <div key={ac.id} style={{background:c2.bg,border:`2px solid ${c2.border}`,borderRadius:10,padding:"8px 10px",cursor:"pointer"}} onClick={()=>setAdminCallDetail(ac)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{fontSize:11,fontWeight:900,color:c2.text}}>{c2.label}</div>
                    {!ac.acknowledged&&<div style={{background:"#ef4444",color:"#fff",fontSize:9,fontWeight:800,borderRadius:5,padding:"1px 5px"}}>NEW</div>}
                    {ac.status==="on_scene"&&<div style={{background:"#10b981",color:"#fff",fontSize:9,fontWeight:800,borderRadius:5,padding:"1px 5px"}}>ON SCENE</div>}
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{ac.location}</div>
                  <div style={{fontSize:10,color:"#94a3b8",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>{ac.problem}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIVE RADAR */}
      {radarVisible&&isAdmin&&(
        <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
          <iframe src="https://radar.weather.gov/station/KMKX/standard" style={{width:"100%",height:260,border:"none"}} title="NWS Radar"/>
        </div>
      )}



    {/* ===== CHAT BOX ===== */}
      <button style={{width:"100%",background:"rgba(14,165,233,0.08)",borderRadius:16,border:"2px solid rgba(14,165,233,0.25)",padding:"18px 18px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}} onClick={()=>{setView("chat");setChatUnread(0);fetchHubChat();}}>
        <div style={{background:"rgba(14,165,233,0.18)",borderRadius:14,padding:"14px",fontSize:28,flexShrink:0,position:"relative"}}>
          💬
          {chatUnread>0&&<div style={{position:"absolute",top:-6,right:-6,background:"#ef4444",color:"#fff",fontSize:11,fontWeight:900,borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center"}}>{chatUnread>9?"9+":chatUnread}</div>}
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{fontSize:18,fontWeight:900,color:"#38bdf8"}}>Festival Chat</div>
          </div>
          <div style={{fontSize:13,color:chatUnread>0?"#38bdf8":"#64748b",fontWeight:chatUnread>0?700:400}}>
            {chatUnread>0?`${chatUnread} new message${chatUnread>1?"s":""}`:chatMessages.length>0
              ?`${chatMessages[chatMessages.length-1].fromName}: ${chatMessages[chatMessages.length-1].message.slice(0,55)}${chatMessages[chatMessages.length-1].message.length>55?"...":""}`
              :"Tap to open messages"}
          </div>
        </div>
        <div style={{fontSize:18,color:"#38bdf8",fontWeight:700}}>→</div>
      </button>

    {/* ===== ROW 1: SAFETY | BROADCAST ===== */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

        {/* SAFETY COLUMN */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{background:"linear-gradient(135deg,rgba(220,38,38,0.15),rgba(180,0,0,0.1))",borderRadius:14,border:"1px solid rgba(220,38,38,0.3)",padding:"10px 10px 8px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:12,fontWeight:900,color:"#fca5a5",textTransform:"uppercase",letterSpacing:"0.06em",paddingBottom:4,borderBottom:"1px solid rgba(220,38,38,0.2)"}}>🚨 Safety</div>

            {/* REPORT LOST CHILD — ALL YELLOW */}
            <button style={{width:"100%",padding:"14px 10px",borderRadius:12,border:"2px solid #eab308",background:"linear-gradient(135deg,#ca8a04,#a16207)",color:"#fff",fontSize:13,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,position:"relative"}} onClick={()=>setLcView(true)}>
              <span style={{fontSize:18}}>🧒</span>
              REPORT LOST CHILD
              {lostChildCalls.length>0&&<div style={{position:"absolute",top:4,right:6,background:"#ef4444",color:"#fff",fontSize:10,fontWeight:900,borderRadius:20,padding:"1px 6px"}}>{lostChildCalls.length}</div>}
            </button>

            {/* QUICK CALL TILES */}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <button style={{width:"100%",padding:"14px 12px",borderRadius:12,border:"2px solid rgba(147,51,234,0.6)",background:"linear-gradient(135deg,rgba(147,51,234,0.2),rgba(220,38,38,0.1))",cursor:"pointer",display:"flex",alignItems:"center",gap:12,boxShadow:"0 0 10px rgba(147,51,234,0.15)"}} onClick={()=>{setNewCallType("medical");setNewCallLocation("");setNewCallProblem("");setNewCallView(true);}}>
                <span style={{fontSize:22}}>🏥</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#d8b4fe"}}>MEDICAL / LIFE SAFETY</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:1}}>Medical emergency · Life threatening</div>
                </div>
              </button>
              <button style={{width:"100%",padding:"14px 12px",borderRadius:12,border:"2px solid rgba(37,99,235,0.6)",background:"linear-gradient(135deg,rgba(37,99,235,0.2),rgba(29,78,216,0.1))",cursor:"pointer",display:"flex",alignItems:"center",gap:12,boxShadow:"0 0 10px rgba(37,99,235,0.15)"}} onClick={()=>{setNewCallType("security");setNewCallLocation("");setNewCallProblem("");setNewCallView(true);}}>
                <span style={{fontSize:22}}>🛡</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#93c5fd"}}>SECURITY</div>
                  
                </div>
              </button>
              
            </div>

            {/* REQUEST MPD BUTTON */}
            <button style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid rgba(37,99,235,0.5)",background:"rgba(37,99,235,0.08)",color:"#93c5fd",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}} onClick={()=>setMpdRequestView(true)}>
              🚔 Request MPD Officer
            </button>

            {/* 911 COMPACT BUTTON */}
            <button style={{width:"100%",padding:"10px",borderRadius:10,border:`2px solid ${nineOneOne.active?"rgba(239,68,68,0.9)":"rgba(180,0,0,0.5)"}`,background:nineOneOne.active?"rgba(239,68,68,0.25)":"rgba(180,0,0,0.08)",color:nineOneOne.active?"#fca5a5":"#f87171",fontSize:11,fontWeight:900,cursor:"pointer",animation:nineOneOne.active?"pulse 1s infinite":"none"}} onClick={()=>{if(nineOneOne.active){const msg=`🚨 911 ACTIVE 🚨

Madison Fire / EMS has been called.
LOCATION: ${nineOneOne.info?.location||"Festival Grounds"}
NATURE: ${nineOneOne.info?.nature||""}
Activated by: ${nineOneOne.by} · ${nineOneOne.at}

Clear a path for emergency vehicles.`;sendGroupMe(msg,["admin","medical"]);setTimeout(()=>{const phones=[...new Set([ADMIN2_PHONE,...getNotifyList("medical")])];sendSMSList(phones,msg);sendVoice(phones,`911 ACTIVATED at Fete de Marquette. Madison Fire and EMS are inbound. Location: ${nineOneOne.info?.location||"Festival Grounds"}. Clear a path for emergency vehicles.`);},100);fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"911_active",officers:mpdOfficers,location:nineOneOne.info?.location||"Festival Grounds",situation:msg})}).catch(e=>console.log(e));setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"911",label:"911 Alert — Admin/Med/MPD",msg},...p]);}else{set911({active:true,by:"Admin",at:now(),info:{}});setView("911");}}}>
              {nineOneOne.active?"🚨 911 ACTIVE — TAP TO ALERT ALL":"🚨 911 ACTIVATION"}
            </button>
          </div>

        </div>

        {/* BROADCAST COLUMN */}
        {/* BROADCAST */}
        <div style={{background:"rgba(236,72,153,0.1)",borderRadius:14,border:"1px solid rgba(236,72,153,0.35)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{...S.sectionHdr,background:"rgba(236,72,153,0.25)",fontSize:13,fontWeight:900}}>📢 Broadcast</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,padding:"8px"}}>
            {/* Broadcast buttons — specific row groupings */}
            {[
              ["weather_imminent"],
              ["event_delayed","event_postponed"],
              ["event_cancelled_staff"],
              ["event_resuming","all_clear"],
              ["custom"],
            ].map((row,ri)=>(
              <div key={ri} style={{display:"grid",gridTemplateColumns:row.length===2?"1fr 1fr":"1fr",gap:4}}>
                {row.map(id=>{const t=BROADCAST_ALERTS.find(x=>x.id===id);if(!t)return null;return(
                  <button key={id} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 6px",borderRadius:8,border:`1px solid ${t.color}33`,background:`${t.color}11`,cursor:"pointer",textAlign:"center",minHeight:36}} onClick={()=>{setAlertView(t.id);setAlertFields({});setView("alert");}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9",lineHeight:1.3}}>{t.label}</span>
                  </button>
                );})}
              </div>
            ))}
          </div>
        </div>
      </div>

    {/* ===== SUPPLIES ===== */}
      <button style={{width:"100%",background:"rgba(245,158,11,0.06)",borderRadius:14,border:"1px solid rgba(245,158,11,0.2)",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left"}} onClick={()=>{setNewCallType("supplies");setNewCallLocation("");setNewCallProblem("");setNewCallView(true);}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"#fbbf24"}}>📦 Supplies Request</div>
          <div style={{fontSize:12,color:"#64748b",marginTop:3}}>Tap to log a supply or restock request</div>
        </div>
        <div style={{color:"#fbbf24",fontSize:20}}>→</div>
      </button>

    {/* ===== ROW 2: EQUIPMENT TRACKER ===== */}
      <div style={{background:"rgba(234,179,8,0.06)",borderRadius:14,border:"1px solid rgba(234,179,8,0.3)",overflow:"hidden"}}>
        <div style={{background:"rgba(234,179,8,0.15)",padding:"10px 14px",fontSize:12,fontWeight:900,color:"#fcd34d",textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>window.open("https://fdm2026.netlify.app/equipment","_blank")}>
          <span>⚙️ Equipment Tracker</span>
          <span style={{fontSize:11,color:"#fcd34d",fontWeight:400}}>Open →</span>
        </div>
        <div style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>Track radios, readers and all festival gear.</div>
      </div>

    {/* ===== LOST & FOUND — SEPARATE SECTION ===== */}
      <div style={{background:"rgba(249,115,22,0.06)",borderRadius:14,border:"1px solid rgba(249,115,22,0.25)",overflow:"hidden"}}>
        <div style={{background:"rgba(249,115,22,0.15)",padding:"10px 14px",fontSize:12,fontWeight:900,color:"#fdba74",textTransform:"uppercase",letterSpacing:"0.06em",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>📦 Lost & Found</span>
          {lfItems.filter(i=>i.status!=="Claimed").length>0&&<div style={{background:"rgba(249,115,22,0.4)",color:"#fed7aa",fontSize:10,fontWeight:800,borderRadius:20,padding:"1px 7px"}}>{lfItems.filter(i=>i.status!=="Claimed").length} active</div>}
        </div>
        <div style={{padding:"8px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,border:"1px solid rgba(249,115,22,0.2)",background:"rgba(249,115,22,0.06)",cursor:"pointer",textAlign:"left"}} onClick={()=>setView("lostfound")}>
            <span style={{fontSize:16}}>📋</span><div><div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>Manage Items</div><div style={{fontSize:11,color:"#64748b"}}>Log · box · clear</div></div>
          </button>
          <a href="https://fdm2026.netlify.app/lostfound?from=hub" target="_blank" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:8,border:"1px solid rgba(249,115,22,0.2)",background:"rgba(249,115,22,0.06)",textDecoration:"none"}}>
            <span style={{fontSize:16}}>🔍</span><div><div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>L&F Lookup</div><div style={{fontSize:11,color:"#64748b"}}>Search all items</div></div>
          </a>
        </div>
      </div>

    {/* ===== ROW 3: VENDOR | STAFF ===== */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

        {/* VENDOR CHECK-IN */}
        <div style={{background:"rgba(139,92,246,0.06)",borderRadius:14,border:"1px solid rgba(139,92,246,0.25)",overflow:"hidden"}}>
          <div style={{background:"rgba(139,92,246,0.15)",padding:"10px 14px",fontSize:12,fontWeight:900,color:"#c4b5fd",textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>setView("vendors")}>
            <span>🏪 Vendors</span>
            <span style={{fontSize:11,color:"#c4b5fd",fontWeight:400}}>Manage →</span>
          </div>
          <div style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>Check in vendors, view plot roster.</div>
        </div>

        {/* STAFF MANAGEMENT */}
        <div style={{background:"rgba(16,185,129,0.06)",borderRadius:14,border:"1px solid rgba(16,185,129,0.25)",overflow:"hidden"}}>
          <div style={{background:"rgba(16,185,129,0.12)",padding:"10px 14px",fontSize:12,fontWeight:900,color:"#6ee7b7",textTransform:"uppercase",letterSpacing:"0.06em"}}>
            👥 Staff
          </div>
          <div style={{padding:"8px",display:"flex",flexDirection:"column",gap:5}}>

            <button style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(16,185,129,0.2)",background:"rgba(16,185,129,0.06)",cursor:"pointer",textAlign:"left",width:"100%"}} onClick={()=>setView("stafflist")}>
              <span style={{fontSize:14}}>👥</span><div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>Staff List</div>
            </button>
            <a href="https://fdm2026.netlify.app/register" target="_blank" style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(16,185,129,0.2)",background:"rgba(16,185,129,0.06)",textDecoration:"none"}}>
              <span style={{fontSize:14}}>📝</span><div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>Register Staff</div>
            </a>
            <a href="/.netlify/functions/export-staff" download="FDM-2026-Staff.csv" style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(16,185,129,0.2)",background:"rgba(16,185,129,0.06)",textDecoration:"none"}}>
              <span style={{fontSize:14}}>⬇️</span><div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>Export Staff to Spreadsheet</div>
            </a>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(16,185,129,0.2)",background:"rgba(16,185,129,0.06)",cursor:"pointer",textAlign:"left"}} onClick={()=>setView("sendonboarding")}>
              <span style={{fontSize:14}}>📱</span><div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>Send Onboarding Text</div>
            </button>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.06)",cursor:"pointer",textAlign:"left"}} onClick={async()=>{
              if(!window.confirm(`Send registration reminder to all staff who haven\'t submitted their RSVP yet?`)) return;
              const btn=event.target.closest("button");
              btn.style.opacity="0.5";
              btn.disabled=true;
              try{
                const res=await fetch("/.netlify/functions/send-reminder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
                const data=await res.json();
                alert(`✅ Reminder sent to ${data.sent} staff\n${data.skipped} already submitted — skipped`);
                setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"broadcast",label:`RSVP reminders sent to ${data.sent} staff`},...p]);
              }catch(e){alert("Error: "+e.message);}
              btn.style.opacity="";btn.disabled=false;
            }}>
              <span style={{fontSize:14}}>🔔</span><div style={{fontSize:12,fontWeight:700,color:"#fbbf24"}}>Send RSVP Reminders</div>
            </button>
          </div>
        </div>
      </div>

    {/* ===== ROW 4: EOD | ACTIVITY LOG ===== */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

        {/* EOD REPORT */}
        <div style={{background:"rgba(99,102,241,0.06)",borderRadius:14,border:"1px solid rgba(99,102,241,0.2)",overflow:"hidden"}}>
          <div style={{background:"rgba(99,102,241,0.15)",padding:"10px 14px",fontSize:12,fontWeight:900,color:"#a5b4fc",textTransform:"uppercase",letterSpacing:"0.06em",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>setView("endofnight")}>
            <span>🌙 EOD</span>
            <span style={{fontSize:11,color:"#a5b4fc",fontWeight:400}}>Generate →</span>
          </div>
          <div style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>All calls, incidents, L&F, broadcasts.</div>
        </div>

        {/* ACTIVITY LOG */}
        <div style={{background:"rgba(255,255,255,0.02)",borderRadius:14,border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
          <div style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>setView("log")}>
            <div style={{fontSize:12,fontWeight:900,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>📋 Log</div>
            <span style={{fontSize:11,color:"#64748b"}}>{activityLog.length} →</span>
          </div>
          <div style={{padding:"4px 8px",display:"flex",flexDirection:"column",gap:3}}>
            {activityLog.slice(0,3).map(e=>(
              <div key={e.id} style={{fontSize:10,color:"#475569",display:"flex",gap:5}}>
                <span style={{color:"#374151",flexShrink:0}}>{e.ts}</span>
                <span style={{textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>{e.label}</span>
              </div>
            ))}
            {activityLog.length===0&&<div style={{fontSize:11,color:"#374151",padding:"4px 0"}}>No activity yet</div>}
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
  );
}

const S={
  root:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",background:"#0d0d1a",fontFamily:"'DM Sans',sans-serif",overflowX:"hidden"},
  panel:{position:"relative",zIndex:1,width:"100%",maxWidth:768,minHeight:"100vh",display:"flex",flexDirection:"column"},
  sectionHdr:{fontSize:17,fontWeight:900,color:"#f59e0b",letterSpacing:"0.06em",textTransform:"uppercase",padding:"12px 14px 8px",background:"rgba(245,158,11,0.06)",borderBottom:"1px solid rgba(245,158,11,0.15)"},
  panelHd:{display:"flex",alignItems:"center",gap:10,padding:"16px 16px 8px"},
  backBtn:{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#f1f5f9",padding:"10px 18px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600},
  panelTitle:{flex:1,fontSize:17,fontWeight:700,color:"#f1f5f9"},
  cWrap:{display:"flex",flexDirection:"column",gap:14,padding:"8px 16px 32px"},
  lbl:{fontSize:11,color:"#64748b",letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700},
  inp:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
  sel:{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,width:"100%",boxSizing:"border-box"},
  ta:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"},
  sendBtn:{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",border:"none",borderRadius:14,padding:"16px",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer"},
  bigAckBtn:{background:"rgba(0,0,0,0.3)",border:"2px solid rgba(255,255,255,0.7)",borderRadius:14,padding:"18px",color:"#fff",fontSize:18,fontWeight:900,cursor:"pointer",width:"100%",maxWidth:380},
  tabRow:{display:"flex",padding:"0 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:4},
  tab:{flex:1,padding:"10px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600},
  callQ:{display:"flex",flexDirection:"column",gap:8,padding:"8px 16px 32px",overflowY:"auto"},
  callCard:{borderRadius:12,border:"2px solid",padding:"12px",display:"flex",flexDirection:"column",gap:8,background:"rgba(255,255,255,0.02)"},
  actBtn:{border:"none",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},
  persistAlert:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:16,padding:"32px 24px",textAlign:"center",position:"relative",zIndex:1,width:"100%",maxWidth:768,boxSizing:"border-box"},
  empty:{textAlign:"center",color:"#475569",padding:"48px 0",fontSize:14},
};