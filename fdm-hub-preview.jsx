export default function HubAppV1({onBack}){
  return <HubApp onBack={onBack||(() => {})}/>;
}

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALL_LOCS=["Moon Stage 1","Moon Stage 2","Lafayette","Lagniappe","Sun Left","Sun Right","Cabaret","Financial 1","Greeter Head Ingersoll Left","Greeter Head Ingersoll Right","Greeter Head Few","Moon Stage Manager","Lagniappe Manager","Lafayette Manager","Sun Stage Manager","Cabaret Manager","Med 1","Med 2","Hospitality","Medical Tent","Merch Tent","Sun Stage Vendors","Moon Stage Vendors","Lafayette Vendors"];

const ALERT_COLORS={
  medical:   {bg:"rgba(190,24,93,0.15)",  border:"rgba(219,39,119,0.6)",  full:"rgba(157,23,77,0.97)",  full2:"rgba(190,24,93,0.95)",  label:"MEDICAL ALERT",     icon:"🩺"},
  walk_in:   {bg:"rgba(190,24,93,0.15)",  border:"rgba(219,39,119,0.6)",  full:"rgba(157,23,77,0.97)",  full2:"rgba(190,24,93,0.95)",  label:"WALK-IN PATIENT",   icon:"🚶"},
  fire:      {bg:"rgba(153,27,27,0.15)",  border:"rgba(220,38,38,0.6)",   full:"rgba(153,27,27,0.97)",  full2:"rgba(185,28,28,0.95)",  label:"FIRE / LIFE SAFETY",icon:"🔥"},
  security:  {bg:"rgba(29,78,216,0.15)",  border:"rgba(59,130,246,0.6)",  full:"rgba(29,78,216,0.97)",  full2:"rgba(37,99,235,0.95)",  label:"SECURITY ALERT",    icon:"🛡️"},
  supplies:  {bg:"rgba(92,40,4,0.20)",    border:"rgba(146,64,14,0.6)",   full:"rgba(69,26,3,0.97)",    full2:"rgba(92,40,4,0.95)",    label:"SUPPLIES REQUEST",  icon:"📦"},
  maintenance:{bg:"rgba(20,83,45,0.20)",  border:"rgba(22,101,52,0.6)",   full:"rgba(20,83,45,0.97)",   full2:"rgba(21,128,61,0.95)",  label:"MAINTENANCE",       icon:"🔧"},
  lost_child:{bg:"rgba(202,138,4,0.15)",  border:"rgba(234,179,8,0.6)",   full:"rgba(202,138,4,0.90)",  full2:"rgba(234,179,8,0.95)",  label:"LOST CHILD",        icon:"🧒"},
};

const POSTPONE_REASONS=["Weather","Safety Concern","Unforeseen Circumstances","Other"];
const CANCEL_REASONS=["Weather","Safety Concern","Unforeseen Circumstances","Other"];

const BROADCAST_ALERTS=[
  {id:"weather_imminent",label:"⛈️ Inclement Weather Imminent",color:"#dc2626",
   requiresWeatherType:true,
   defaultMsg:"ATTENTION ALL STAFF AND VENDORS: There is dangerous weather ([WEATHER_TYPE]) approaching festival grounds. Please begin storm procedures and secure all items. Food, beverage, and merchandise sales are postponed until further notice. Additional information will be sent out once available.",
   fields:[]},
  {id:"event_delayed",label:"⏰ Event Delayed",color:"#f59e0b",
   defaultMsg:"Attention all staff and vendors — Fête de Marquette has been delayed. Further information will be provided via the festival app and messaging.",
   fields:[{key:"duration",label:"Estimated Delay",ph:"e.g. 30 minutes"}]},
  {id:"event_postponed",label:"🔄 Event Postponed",color:"#f97316",
   requiresReason:true,reasonType:"postpone",
   defaultMsg:"Attention all staff and vendors — Fête de Marquette has been postponed due to [REASON]. Food, beverage, and merchandise sales should stop immediately and shutdown procedures should begin. Further information will be provided via the festival app and messaging.",
   fields:[]},
  {id:"event_resuming",label:"🔁 Event Resuming",color:"#10b981",
   defaultMsg:"Attention all staff — Fête de Marquette will be resuming shortly. Further information will be provided via the festival app and messaging.",
   fields:[]},
  {id:"event_cancelled_staff",label:"❌ Cancelled — Staff & Vendors",color:"#dc2626",
   requiresReason:true,reasonType:"cancel",
   defaultMsg:"Attention all staff and vendors — due to [REASON], Fête de Marquette has been cancelled for today. Food, beverage, and merchandise sales should stop immediately. Please proceed with shutdown procedures. Further information will be provided via the festival app and messaging.",
   fields:[]},

  {id:"all_clear",label:"☀️ All Clear",color:"#059669",
   defaultMsg:"Attention all staff and vendors — all dangerous weather has passed and Fête de Marquette will be resuming shortly. Further information will be provided via the festival app and messaging.",
   fields:[]},
  {id:"custom",label:"✏️ Custom Message",color:"#475569",fields:[
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
  <button style={{position:"sticky",top:8,zIndex:10,background:"rgba(255,255,255,0.1)",border:"2px solid rgba(255,255,255,0.25)",color:"#f1f5f9",padding:"12px 20px",borderRadius:12,cursor:"pointer",fontSize:15,fontWeight:800,backdropFilter:"blur(8px)",boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}} onClick={onClick}>{label}</button>
);
}
function Fld({label,value,onChange,ph,multi,required,large}){return(<div style={{display:"flex",flexDirection:"column",gap:6}}><label style={S.lbl}>{label}{required&&<span style={{color:"#ef4444",marginLeft:4}}>*</span>}</label>{multi?<textarea style={S.ta} rows={3} placeholder={ph} value={value} onChange={onChange}/>:<input style={{...S.inp,fontSize:large?18:14,padding:large?"14px":"10px 12px",fontWeight:large?700:400}} placeholder={ph} value={value} onChange={onChange}/>}</div>);}

// ─── MAIN SWITCHER ─────────────────────────────────────────────────────────────
function Preview_unused(){
  const onBack=()=>{};
}

// ─── MPD SCRIPTS ──────────────────────────────────────────────────────────────
const MPD_VOICE_SCRIPT=(location,situation)=>
  `Attention Madison Police Officers — you are requested to respond to ${location} for ${situation}. Please respond promptly. This call has been initiated by Fête de Marquette Operations. Thank you.`;

const MPD_STANDDOWN_VOICE=()=>
  `Per Fête de Marquette Operations — stand down. No response needed. Thank you!`;

const MPD_STANDDOWN_SMS=()=>
  `✅ STAND DOWN\nPer Fête de Marquette Operations — stand down. No response needed. Thank you!`;

const MPD_SMS=(location,situation,requestedBy,timestamp)=>
  `🚨 MPD RESPONSE REQUESTED\nFête de Marquette Operations\n\n📍 Location: ${location}\nSituation: ${situation}\nInitiated by: ${requestedBy} · ${timestamp}\n\nPlease respond promptly. Reply YES to acknowledge.\n— Fête de Marquette Operations`;


// ─── SOUND ENGINE ─────────────────────────────────────────────────────────────
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

// ─── GROUPME ──────────────────────────────────────────────────────────────────
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

// ─── HUB APP ──────────────────────────────────────────────────────────────────
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
  const [tick,setTick]=useState(0);
  const [lostChildBlink,setLostChildBlink]=useState(false);
  const [lcFields,setLcFields]=useState({});
  const blinkRef=useRef(null);
  const [escalated,setEscalated]=useState({});
  const ESCALATION_MS={medical:30000,walk_in:30000,fire:30000,security:30000,supplies:60000,maintenance:60000};

  const [calls,setCalls]=useState([
    {id:1,type:"medical",location:"Moon Stage 1",problem:"Patron unresponsive near bar",details:"Male, 40s, sitting on ground",requestedBy:"Moon Stage 1",status:"acknowledged",acknowledged:true,history:[{status:"new_call",ts:"4:33 PM"},{status:"acknowledged",ts:"4:34 PM",unit:"Med 1"}],unit:"Med 1",firedAt:Date.now()-300000},
    {id:7,type:"medical",location:"Lagniappe Bar",problem:"Person down, possible heat exhaustion",details:"Female, 30s",requestedBy:"Lagniappe",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:"4:35 PM"}],unit:null,firedAt:Date.now()-60000},
    {id:2,type:"security",location:"Lafayette Bar",problem:"Altercation between two patrons",details:"Near east entrance",requestedBy:"Lafayette",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:"4:28 PM"}],unit:null,firedAt:Date.now()-120000},
    {id:3,type:"fire",location:"Sun Stage Vendor Area",problem:"Cooking flame too close to tent fabric",details:"Vendor unaware",requestedBy:"Sun Stage Manager",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:"4:20 PM"}],unit:null,firedAt:Date.now()-180000},
    {id:4,type:"supplies",subtype:"restock",location:"Sun Left",problem:"Ice — 3 bags",requestedBy:"Sun Left",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:"4:15 PM"}],unit:null,firedAt:Date.now()-240000,quantityRequested:"3 bags"},
    {id:5,type:"maintenance",location:"Cabaret Stage",problem:"Generator tripped, no power to bar",requestedBy:"Cabaret Manager",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:"4:10 PM"}],unit:null,firedAt:Date.now()-300000},
    {id:6,type:"lost_child",location:"Moon Stage Area",problem:"Girl, approx 6 · Brown pigtails · Red shirt · Blue shorts\nLast seen: 4:05 PM near Moon Stage 1 bar\nMeet Reporting Party / Parent: Medical Tent\nParent: Sarah Johnson · 608-555-1234",requestedBy:"Moon Stage Manager",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:"4:08 PM"}],unit:null,firedAt:Date.now()-400000},
  ]);
  const [completed,setCompleted]=useState([
    {id:99,type:"medical",location:"Lagniappe",problem:"Heat exhaustion",status:"cleared",clearedBy:"Med 1",clearedAt:"2:35 PM",history:[{status:"new_call",ts:"2:10 PM"},{status:"acknowledged",ts:"2:11 PM",unit:"Med 1"},{status:"on_scene",ts:"2:14 PM",unit:"Med 1"},{status:"cleared",ts:"2:35 PM",unit:"Med 1"}]},
    {id:98,type:"security",location:"Moon Stage 2",problem:"Unruly patron",status:"cleared",clearedBy:"Admin",clearedAt:"3:15 PM",history:[{status:"new_call",ts:"3:05 PM"},{status:"cleared",ts:"3:15 PM",unit:"Admin"}]},
  ]);
  const [medSt,setMedSt]=useState({med1:{status:"available",since:null},med2:{status:"on_scene",since:"4:14 PM"}});
  const [broadcastAlerts,setBroadcastAlerts]=useState([
    {id:10,label:"⛈️ Inclement Weather Imminent",msg:"⛈️ INCLEMENT WEATHER IMMINENT\nEstimated Arrival: 45 min\nShutdown: 7:45 PM",requiresAck:true,firedAt:Date.now()-120000,date:now(),acks:{"Moon Stage 1":"4:33 PM","Med 1":"4:33 PM","Med 2":"4:33 PM"},escalated:false},
  ]);
  const [nineOneOne,set911]=useState({active:false,info:{},by:null,at:null});
  const [nineOneOneHistory,setNineOneOneHistory]=useState([]);
  const [emsForm,setEmsForm]=useState({staging:"",eta:"",nature:"",notes:""});
  const [emsDispatched,setEmsDispatched]=useState(false);
  // END OF NIGHT
  const [endOfNightNotes,setEndOfNightNotes]=useState("");

  // ADMIN REQUEST FORM
  const [adminReqView,setAdminReqView]=useState(false);
  const [adminReqType,setAdminReqType]=useState("");
  const [adminReqLoc,setAdminReqLoc]=useState("");
  const [adminReqProblem,setAdminReqProblem]=useState("");
  const [adminReqDetails,setAdminReqDetails]=useState("");

  // INCIDENT REPORT
  const [incidentView,setIncidentView]=useState(null); // holds call data for report form
  const [incFields,setIncFields]=useState({});

  // LOST & FOUND
  const [lfAddMode,setLfAddMode]=useState(false);
  const [lfNewDesc,setLfNewDesc]=useState("");
  const [lfNewLoc,setLfNewLoc]=useState("");
  const [lfNewNarrative,setLfNewNarrative]=useState("");
  const [lfSubmitting,setLfSubmitting]=useState(false);
  const [lfItems,setLfItems]=useState([]);
  const [lfLoading,setLfLoading]=useState(false);
  const [lfClaimView,setLfClaimView]=useState(null);
  const [lfClaimBy,setLfClaimBy]=useState("");
  const [lfClaimID,setLfClaimID]=useState("");
  const [lfClaimPhone,setLfClaimPhone]=useState("");

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
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const urlRole=params.get("role");
    if(urlRole==="med1"){setRole("Med 1");setPin(PINS["Med 1"]||"0000");setLoggedIn(true);}
    else if(urlRole==="med2"){setRole("Med 2");setPin(PINS["Med 2"]||"0000");setLoggedIn(true);}
  },[]);

  // NWS Weather Alert System
  const [nwsAlerts,setNwsAlerts]=useState([]);
  const [weatherAlertBanner,setWeatherAlertBanner]=useState(null);
  const [weatherDismissed,setWeatherDismissed]=useState([]);
  const [currentWeather,setCurrentWeather]=useState(null);
  const [radarVisible,setRadarVisible]=useState(false);

  // NWS Alert fetch — Dane County WI zone WIZ064
  const fetchNWSAlerts=async()=>{
    try{
      const r=await fetch('https://api.weather.gov/alerts/active?zone=WIZ064');
      const d=await r.json();
      const severe=(d.features||[]).filter(f=>{
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
    const alertInterval=setInterval(fetchNWSAlerts,5*60*1000);
    const weatherInterval=setInterval(fetchWeather,10*60*1000);
    return()=>{clearInterval(alertInterval);clearInterval(weatherInterval);};
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
    const unacked = calls.filter(c=>!c.acknowledged&&c.status==="new_call");
    if(unacked.length===0)return;
    const newest = unacked.reduce((a,b)=>b.firedAt>a.firedAt?b:a);
    if(newest.id!==_lastSoundId.current){
      _lastSoundId.current=newest.id;
      playAlert(newest.type);
    }
  },[calls]);
  const [mpdOfficers,setMpdOfficers]=useState([
    {id:"o1", name:"Officer Martinez", badge:"MPD-412", phone:"(608) 555-0101", status:"on_duty"},
    {id:"o2", name:"Officer Chen",     badge:"MPD-387", phone:"(608) 555-0102", status:"on_duty"},
    {id:"o3", name:"Officer Williams", badge:"MPD-455", phone:"(608) 555-0103", status:"on_duty"},
    {id:"o4", name:"Officer Johnson",  badge:"MPD-391", phone:"(608) 555-0104", status:"on_duty"},
  ]);
  const [assignPanel,setAssignPanel]=useState(null); // callId being assigned
  const [lcForm,setLcForm]=useState({name:"",age:"",description:"",lastSeen:"",assemblyPoint:"Medical Tent",parentName:"",parentPhone:""});
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
  const myActive=isMed?calls.filter(c=>c.unit===role):[];
  const unassigned=isMed?activeCalls.filter(c=>(c.type==="medical"||c.type==="walk_in")&&!c.unit&&c.status==="new_call"):[];

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
    if(liveMode){ fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"Acknowledged",unit:by})}).catch(e=>console.log(e)); }
    const call=calls.find(c=>c.id===id);
    if(call) addAckedBanner({...call,unit:by});
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
        // Supplies go directly to Admin only
        if(msg) sendGroupMe(msg,["admin"]);
        msg=null; // prevent double-send below
      } else if(call.type==="maintenance"){
        msg=[
          `🔧 MAINTENANCE 🔧`,
          ``,
          `LOCATION: ${call.location}`,
          `WHAT'S THE PROBLEM: ${call.problem||""}`,
          `REQUESTING PARTY: ${call.requestedBy||"Staff"}`,
          `DATE/TIME: ${ts}`,
        ].filter(Boolean).join("\n");
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
        // Lost child — SMS + voice + MPD on acknowledge
        fetch("/.netlify/functions/send-broadcast",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({message:msg,recipients:[{name:"Admin",phone:"+16082289692"}],includeVoice:true,voiceScript:`Lost child alert. ${call.problem||""}. Location: ${call.location}. All staff please be on alert.`})
        }).catch(e=>console.log(e));
        fetch("/.netlify/functions/send-mpd",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({type:"lost_child",officers:mpdOfficers,location:call.location,situation:msg})
        }).catch(e=>console.log(e));
      } else {
        msg=`🚨 FDM ALERT\nLOCATION: ${call.location}\n${call.problem||""}\nDATE/TIME: ${ts}`;
      }
      if(msg) sendGroupMe(msg, [ch,"admin"]);
    }
    setCalls(p=>p.map(c=>c.id!==id?c:{...c,acknowledged:true,status:"acknowledged",history:[...c.history,{status:"acknowledged",ts:tShort(),unit:by}]}));
    setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"ack",label:`Acknowledged by ${by}`,msg:calls.find(c=>c.id===id)?.problem||""},...p]);
  };
  const updCall=(id,status,unit=null)=>setCalls(p=>p.map(c=>c.id!==id?c:{...c,status,unit:unit||c.unit,history:[...c.history,{status,ts:tShort(),unit}]}));
  const clearCall=(id,by)=>{ playAlert("clear"); removeAckedBanner(id);
    if(liveMode){ fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"Cleared",unit:by})}).catch(e=>console.log(e)); }
    // Trigger incident report for medical/fire/security
    const call=activeCalls.find(c=>c.id===id)||calls.find(c=>c.id===id);
    if(call&&["medical","walk_in","fire","security"].includes(call.type)){
      setIncidentView(call);
      setIncFields({respondingUnit:by,disposition:"",interventions:"",narrative:"",notes:""});
    }
    const c=calls.find(x=>x.id===id);if(!c)return;
    setCompleted(p=>[{...c,status:"cleared",clearedBy:by,clearedAt:tShort()},...p]);
    setCalls(p=>p.filter(x=>x.id!==id));
    setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"clear",label:`Cleared by ${by}`,msg:c.problem||""},...p]);
  };

  // FULL SCREEN ALERT
  if(view==="home"){
    const PRIORITY=["lost_child","medical","walk_in","fire","security","supplies","maintenance"];
    let alertCall=null;
    for(const t of PRIORITY){alertCall=calls.find(c=>c.type===t&&!c.acknowledged);if(alertCall)break;}
    if(alertCall&&(isAdmin||isMed)){
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
              <span>Auto-escalate in</span><span style={{color:remaining<10?"#fca5a5":"rgba(255,255,255,0.8)",fontWeight:700}}>{escalated[alertCall.id]?"⚠️ RESENT":remaining>0?`${remaining}s`:"⚠️ RESENT"}</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,0.2)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:pct>66?"#ef4444":pct>33?"#f97316":"#10b981",borderRadius:2,width:`${pct}%`,transition:"width 1s"}}/></div>
          </div>
          {calls.filter(c=>!c.acknowledged).length>1&&<div style={{fontSize:13,color:"rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"6px 14px"}}>+{calls.filter(c=>!c.acknowledged).length-1} more pending</div>}
          {(alertCall.type==="medical"||alertCall.type==="walk_in")&&isMed&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:600,textAlign:"center"}}>Who is responding?</div>
              <div style={{display:"flex",gap:8}}>
                <button style={{flex:1,border:"2px solid rgba(255,255,255,0.5)",borderRadius:12,padding:"14px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",background:"rgba(5,150,105,0.5)"}} onClick={()=>ackCall(alertCall.id,role)}>✅ {role}</button>
                <button style={{flex:1,border:"2px solid rgba(255,255,255,0.5)",borderRadius:12,padding:"14px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",background:"rgba(5,150,105,0.5)"}} onClick={()=>ackCall(alertCall.id,"Both")}>✅ Both</button>
              </div>
            </div>
          )}
          {isLC?(
            <><button style={{...S.bigAckBtn,background:"rgba(0,0,0,0.3)"}} onClick={()=>ackCall(alertCall.id,role||"Admin")}>✅ ACKNOWLEDGED — Searching</button>
            <button style={{...S.bigAckBtn,background:"rgba(16,185,129,0.5)",border:"2px solid rgba(16,185,129,0.8)"}} onClick={()=>clearCall(alertCall.id,role||"Admin")}>🧒 CHILD LOCATED — Close</button></>
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
        <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>Fête de Marquette 2026</div>
      </div>
      <div style={{padding:"0 16px 6px",fontSize:12,color:"#64748b",fontWeight:600}}>Select your role:</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 16px 20px"}}>
        {[["ADMIN","⚡","Command / Admin · Full access","rgba(245,158,11,0.1)","#f59e0b"],["Med 1","🩺","Medical Unit 1","rgba(126,34,206,0.1)","rgba(147,51,234,0.5)"],["Med 2","🩺","Medical Unit 2","rgba(126,34,206,0.1)","rgba(147,51,234,0.5)"]].map(([r,em,tp,bg,bc])=>(
          <button key={r} style={{display:"flex",alignItems:"center",gap:12,padding:"16px",borderRadius:12,border:`2px solid ${bc}`,background:bg,cursor:"pointer",textAlign:"left"}} onClick={()=>setRole(r)}>
            <span style={{fontSize:24,minWidth:32}}>{em}</span><div><div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{r}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{tp}</div></div>
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
                <div><div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{t.label}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{t.desc}</div></div>
              </button>
            ))}
          </div>
        </>):(<>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>{RESOURCE_TYPES.find(t=>t.id===resourceType)?.emoji}</span>
            <span style={{fontSize:16,fontWeight:700,color:"#f1f5f9"}}>{RESOURCE_TYPES.find(t=>t.id===resourceType)?.label}</span>
            <button style={{marginLeft:"auto",background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}} onClick={()=>setResourceType(null)}>Change</button>
          </div>
          <Fld label="Location / Where needed" value={resourceFields.location||""} onChange={e=>setResourceFields(p=>({...p,location:e.target.value}))} ph="e.g. Moon Stage 1 area" required/>
          <Fld label="What's needed" value={resourceFields.reason||""} onChange={e=>setResourceFields(p=>({...p,reason:e.target.value}))} ph="e.g. 2 additional officers for crowd control" required/>
          <Fld label="Additional Info" value={resourceFields.notes||""} onChange={e=>setResourceFields(p=>({...p,notes:e.target.value}))} ph="Optional" multi/>
          <button style={{...S.sendBtn,opacity:(!resourceFields.location||!resourceFields.reason)?0.5:1}} disabled={!resourceFields.location||!resourceFields.reason} onClick={()=>{
            setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"resource",label:`Resource Request: ${RESOURCE_TYPES.find(t=>t.id===resourceType)?.label}`,msg:`${resourceFields.reason} — ${resourceFields.location}`},...p]);
            // MFD + Madison Fire Medics auto-trigger 911 activation
            if(resourceType==="mfd"||resourceType==="ems_mfd"){
              set911({active:true,info:{location:resourceFields.location,nature:resourceFields.reason},by:"Resource Request",at:tShort()});
              playAlert("fire");
            }
            setResourceView(false);setResourceType(null);setResourceFields({});
            if(resourceType==="mfd"||resourceType==="ems_mfd") setView("911");
          }}>📋 SUBMIT RESOURCE REQUEST</button>
        </>)}
      </div>
    </div></div>
  );

  // BROADCAST VIEW
  if(view==="alert") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><BB onClick={()=>{setView("home");setAlertView(null);setAlertFields({});setEditedMsg("");}}/><span style={S.panelTitle}>Broadcast Alert</span></div>
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
        const msgBase=(t?.defaultMsg||"").replace("[REASON]",selectedReason||"[select reason above]").replace("[WEATHER_TYPE]",(alertFields._weatherTypes||[]).length>0?(alertFields._weatherTypes||[]).map(w=>w==="Custom..."?alertFields._customWeather||"Custom":w).join(", "):"[select weather type above]");
        const preview=editedMsg||msgBase;
        return(<div style={S.cWrap}>
          <BB onClick={()=>setAlertView(null)}/>
          <div style={{display:"inline-flex",alignSelf:"flex-start",padding:"4px 12px",borderRadius:20,fontSize:13,fontWeight:600,color:"#fff",background:t?.color,marginTop:8}}>{t?.label}</div>
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
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Date & Time of Broadcast</div>
            <div style={{fontSize:16,fontWeight:800,color:"#f1f5f9"}}>{new Date().toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>
          </div>

          {/* GROUPME CHANNEL SELECTOR */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Send to GroupMe Channels</label>
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

          {/* SEND VIA SMS */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Send via SMS</label>
            <div style={{display:"flex",gap:8}}>
              {[{id:"sms_all",label:"Admin Only"}].map(opt=>{
                const sel=alertFields._smsChannels?.includes(opt.id);
                return(
                  <button key={opt.id} style={{flex:1,padding:"10px 14px",borderRadius:8,border:`1px solid ${sel?"rgba(16,185,129,0.6)":"rgba(255,255,255,0.1)"}`,background:sel?"rgba(16,185,129,0.12)":"rgba(255,255,255,0.03)",color:sel?"#10b981":"#64748b",fontSize:13,fontWeight:sel?700:400,cursor:"pointer"}}
                    onClick={()=>setAlertFields(p=>({...p,_smsChannels:sel?[]:[opt.id]}))}>
                    {sel?"✓ ":""}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WEATHER TYPE — for weather_imminent */}
          {t.requiresWeatherType&&(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Type of Weather *</label>
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

          {/* ESTIMATED ARRIVAL (for weather/delays) */}
          {(t.id==="weather_imminent"||t.id==="event_delayed")&&(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Estimated Storm Arrival / Duration</label>
              <input style={{...S.inp,fontSize:14}} placeholder="e.g. 8:15 PM arrival · 45 min duration" value={alertFields._eta||""} onChange={e=>{setAlertFields(p=>({...p,_eta:e.target.value}));setEditedMsg("");}}/>
            </div>
          )}

          {/* REASON PICKER — for postponed/cancelled */}
          {t?.requiresReason&&(
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:4}}>
              <label style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Reason *</label>
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
          <textarea style={{...S.ta,minHeight:110,fontSize:13,lineHeight:1.6,borderColor:"rgba(124,58,237,0.4)"}} value={editedMsg||(t?.defaultMsg||"").replace("[REASON]",alertFields._reason==="Other"?alertFields._customReason||"":alertFields._reason||"[select reason above]").replace("[WEATHER_TYPE]",(alertFields._weatherTypes||[]).length>0?(alertFields._weatherTypes||[]).map(w=>w==="Custom..."?alertFields._customWeather||"Custom":w).join(", "):"[select weather type above]")} onChange={e=>setEditedMsg(e.target.value)} onFocus={e=>{if(!editedMsg)setEditedMsg((t?.defaultMsg||"").replace("[REASON]",alertFields._reason==="Other"?alertFields._customReason||"":alertFields._reason||"[select reason above]"));}}/>
          {editedMsg&&<button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",padding:0}} onClick={()=>setEditedMsg("")}>↩ Reset to original</button>}
          <div style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.08)",borderRadius:8,padding:"8px 12px",border:"1px solid rgba(245,158,11,0.2)"}}>⏱ 90-sec ACK — {ALL_LOCS.length} locations</div>
          <button style={S.sendBtn} onClick={()=>{
  const msg=editedMsg||preview;
  setBroadcastAlerts(p=>[{id:Date.now(),label:t.label,msg,requiresAck:true,firedAt:Date.now(),date:now(),acks:{},escalated:false},...p]);
  setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"alert",label:`Broadcast: ${t.label}`,msg},...p]);
  // GroupMe
  sendGroupMe(`FDM 2026 — ${t.label}\n\n${msg}`, alertFields._gmChannels||["all_staff","admin"]);
  // SMS + Voice to Admin only
  if(alertFields._smsChannels?.includes("sms_all")){
    fetch("/.netlify/functions/send-broadcast",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:msg,recipients:[{name:"Admin",phone:"+16082289692"}],
        includeVoice:true,voiceScript:msg.replace(/[*#]/g,"")})
    }).catch(e=>console.log("SMS broadcast error:",e));
  }
  playAlert("broadcast");
  setView("home");setAlertView(null);setAlertFields({});setEditedMsg("");
}}>🚀 SEND NOW</button>
        </div>);
      })()}
    </div></div>
  );

  // CALL QUEUE VIEW
  // ─── INCIDENT REPORT VIEW ─────────────────────────────────────────────────────
  if(incidentView) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}>
        <BB onClick={()=>{setIncidentView(null);setIncFields({});}}/>
        <span style={S.panelTitle}>📋 Incident Report</span>
      </div>
      <div style={S.cWrap}>
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Auto-filled from call</div>
          <div style={{fontSize:14,fontWeight:800,color:"#f1f5f9"}}>{incidentView.type?.toUpperCase()} — {incidentView.location}</div>
          <div style={{fontSize:13,color:"#94a3b8"}}>{incidentView.problem}</div>
          {incidentView.details&&<div style={{fontSize:12,color:"#64748b"}}>{incidentView.details}</div>}
          <div style={{fontSize:12,color:"#64748b"}}>Reported by: {incidentView.requestedBy} · Unit: {incFields.respondingUnit}</div>
        </div>
        <Fld label="Patient / Person Description" value={incFields.patientDescription||""} onChange={e=>setIncFields(p=>({...p,patientDescription:e.target.value}))} ph="Age, gender, appearance, condition" multi/>
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
                body:JSON.stringify({callId:incidentView.id,type:incidentView.type,location:incidentView.location,problem:incidentView.problem,patientDescription:incFields.patientDescription||"",requestedBy:incidentView.requestedBy,respondingUnit:incFields.respondingUnit||role,interventions:incFields.interventions||"",disposition:incFields.disposition==="Other"?(incFields.dispositionOther||"Other"):incFields.disposition,narrative:incFields.narrative||"",notes:incFields.notes||"",openedAt:incidentView.timestamp||new Date().toISOString()})});
              const data=await res.json();
              if(data.success){
                setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"incident",label:`Incident Report: ${data.incidentNumber}`,msg:`${incidentView.type} — ${incidentView.location}`},...p]);
              }
            }catch(e){console.log(e);}
            setIncidentView(null);setIncFields({});
          }}>
          📋 SUBMIT INCIDENT REPORT
        </button>
        <button style={{...S.sendBtn,background:"rgba(255,255,255,0.05)",color:"#64748b",fontSize:14}} onClick={()=>{setIncidentView(null);setIncFields({});}}>Skip Report</button>
      </div>
    </div></div>
  );


  if(view==="callqueue"){
    const qCalls=callFilter?calls.filter(c=>callFilter.includes(c.type)):calls;
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
                  <span style={{fontSize:11,color:isEsc?"#fca5a5":"rgba(255,255,255,0.7)",fontWeight:700,whiteSpace:"nowrap"}}>{isEsc?"⚠️ RESENT":remaining>0?`${remaining}s`:"⚠️"}</span>
                </div>
                <button style={{border:"2px solid rgba(255,255,255,0.6)",borderRadius:10,padding:"14px",color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer",background:"rgba(0,0,0,0.3)"}} onClick={()=>ackCall(c.id,"Admin")}>✅ ACKNOWLEDGE</button>
              </div>);
            })}
          </div>}
          {/* ACKED LIST — always open */}
          {acked.length>0&&<>
            {unacked.length>0&&<div style={{fontSize:11,fontWeight:800,color:"#64748b",letterSpacing:"0.08em",padding:"4px 0 8px"}}>── Acknowledged</div>}
            {acked.map(c=>{
              const color=ALERT_COLORS[c.type]||ALERT_COLORS.medical;
              const statuses={acknowledged:{label:"ACKNOWLEDGED",color:"#10b981"},dispatched:{label:"DISPATCHED",color:"#6366f1"},on_scene:{label:"ON SCENE",color:"#ef4444"},delivered:{label:"DELIVERED",color:"#10b981"},cleared:{label:"CLEARED",color:"#10b981"}};
              const st=statuses[c.status]||{label:c.status,color:"#475569"};
              return(<div key={c.id} style={{borderRadius:12,border:`2px solid ${color.border}`,padding:"14px",display:"flex",flexDirection:"column",gap:10,background:color.bg}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"inline-flex",padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:800,color:"#fff",background:st.color}}>{st.label}</div>
                  <span style={{fontSize:11,color:"#64748b"}}>{c.history[0]?.ts}</span>
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
                  {c.history.map((h,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12}}><span style={{color:"#64748b",minWidth:50}}>{h.ts}</span><span style={{color:"#cbd5e1"}}>{h.status}{h.unit?` · ${h.unit}`:""}</span></div>)}
                </div>
                {/* ASSIGN UNIT — ADMIN ONLY */}
                {isAdmin&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <label style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Assign Unit</label>
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
                      msg:`Stand down sent to ${o?.name} (${o?.badge}) · ${c.location}\nVoice: "${MPD_STANDDOWN_VOICE(c.location)}"`
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
                      <div style={{fontSize:11,color:"#64748b",lineHeight:1.5}}>SMS + Voice fired to all on-duty officers. Cancel any not needed.</div>

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
                                <div style={{fontSize:11,color:"#64748b"}}>{o.badge} · {o.phone}</div>
                                {isNotified&&!isAcked&&<div style={{fontSize:11,color:"#60a5fa",fontWeight:600,marginTop:2}}>📞 Notified {notif?.notifiedAt} · Awaiting YES</div>}
                                {isAcked&&<div style={{fontSize:11,color:"#10b981",fontWeight:700,marginTop:2}}>✅ Acknowledged · {notif?.ackedAt}</div>}
                                {isCancelled&&<div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>❌ Stood down {notif?.cancelledAt}</div>}
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
                        <button style={{padding:"10px 20px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}} onClick={()=>setAssignPanel(null)}>Done</button>
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
              {c.clearedBy&&<div style={{fontSize:12,color:"#64748b"}}>Cleared by: {c.clearedBy} · {c.clearedAt}</div>}
              <div style={{display:"flex",flexDirection:"column",gap:3,background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"8px"}}>
                {c.history.map((h,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12}}><span style={{color:"#64748b",minWidth:50}}>{h.ts}</span><span style={{color:"#cbd5e1"}}>{h.status}{h.unit?` · ${h.unit}`:""}</span></div>)}
              </div>
            </div>
          ))}
        </>}
      </div>
    </div></div>);
  }

  // 911 VIEW
  // ─── LOST CHILD VIEW ─────────────────────────────────────────────────────────
  if(lcView) return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>🧒 Report Lost Child</span></div>
      <div style={S.cWrap}>
        <div style={{fontSize:14,color:"#fcd34d",fontWeight:700,background:"rgba(202,138,4,0.1)",border:"1px solid rgba(234,179,8,0.3)",borderRadius:8,padding:"10px 12px"}}>📋 Gather info from parent/guardian first, then fill in below.</div>
        <Fld label="Child Age *" value={lcFields?.age||""} onChange={e=>setLcFields(p=>({...p,age:e.target.value}))} ph="e.g. 6" required large/>
        <Fld label="Gender" value={lcFields?.gender||""} onChange={e=>setLcFields(p=>({...p,gender:e.target.value}))} ph="e.g. Girl, Boy"/>
        <Fld label="Hair Color / Style" value={lcFields?.hair||""} onChange={e=>setLcFields(p=>({...p,hair:e.target.value}))} ph="e.g. Brown pigtails"/>
        <Fld label="Top / Shirt" value={lcFields?.top||""} onChange={e=>setLcFields(p=>({...p,top:e.target.value}))} ph="e.g. Red shirt"/>
        <Fld label="Bottom / Pants" value={lcFields?.bottom||""} onChange={e=>setLcFields(p=>({...p,bottom:e.target.value}))} ph="e.g. Blue shorts"/>
        <Fld label="Last Seen Location *" value={lcFields?.lastSeen||""} onChange={e=>setLcFields(p=>({...p,lastSeen:e.target.value}))} ph="e.g. Near Moon Stage 1 bar" required large/>
        <Fld label="Last Seen Time" value={lcFields?.lastSeenTime||""} onChange={e=>setLcFields(p=>({...p,lastSeenTime:e.target.value}))} ph="e.g. 5:30 PM"/>
        <Fld label="Meet Reporting Party / Parent *" value={lcFields?.assembly||""} onChange={e=>setLcFields(p=>({...p,assembly:e.target.value}))} ph="e.g. Medical Tent" required large/>
        <Fld label="Meet Reporting Party (Parent)" value={lcFields?.meetParent||lcFields?.parentName||""} onChange={e=>setLcFields(p=>({...p,meetParent:e.target.value}))} ph="Auto: parent name — or specify location to meet them"/>
        <Fld label="Parent / Guardian Name" value={lcFields?.parentName||""} onChange={e=>setLcFields(p=>({...p,parentName:e.target.value}))} ph="e.g. Sarah Johnson"/>
        <Fld label="Parent / Guardian Phone" value={lcFields?.parentPhone||""} onChange={e=>setLcFields(p=>({...p,parentPhone:e.target.value}))} ph="(608) 555-1234"/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)",opacity:(!lcFields?.age||!lcFields?.lastSeen||!lcFields?.assembly)?0.5:1}}
          disabled={!lcFields?.age||!lcFields?.lastSeen||!lcFields?.assembly}
          onClick={()=>{
            const lcMsg=`🧒 LOST CHILD 🧒\n\nLOCATION: ${lcFields?.lastSeen}\nDESCRIPTION: ${lcFields?.gender||"Child"}, approx ${lcFields?.age}${lcFields?.hair?" · "+lcFields.hair:""}${lcFields?.top?" · "+lcFields.top:""}\nLast seen: ${lcFields?.lastSeenTime||""}\nMeet Reporting Party / Parent: ${lcFields?.assembly}\nParent: ${lcFields?.parentName||"Unknown"} · ${lcFields?.parentPhone||""}\nDATE/TIME: ${new Date().toLocaleString()}`;
            const newCall={id:Date.now(),type:"lost_child",location:lcFields?.lastSeen,problem:`${lcFields?.gender||"Child"}, approx ${lcFields?.age}. ${lcFields?.hair||""} ${lcFields?.top||""} ${lcFields?.bottom||""}. Last seen: ${lcFields?.lastSeenTime} near ${lcFields?.lastSeen}. Assembly: ${lcFields?.assembly}. Parent: ${lcFields?.parentName||"Unknown"} ${lcFields?.parentPhone||""}`,requestedBy:"Admin",status:"new_call",acknowledged:false,history:[{status:"new_call",ts:tShort()}],unit:null,firedAt:Date.now()};
            setCalls(p=>[newCall,...p]);
            sendGroupMe(lcMsg,["all_staff","admin","medical","bar_stage","financial","restock","maintenance"]);
            fetch("/.netlify/functions/send-broadcast",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:lcMsg,recipients:[{name:"Admin",phone:"+16082289692"}],includeVoice:true,voiceScript:`Lost child alert at Fete de Marquette. ${lcFields?.gender||"Child"}, approximately ${lcFields?.age} years old. Last seen near ${lcFields?.lastSeen}. Assembly point is ${lcFields?.assembly}. Parent name ${lcFields?.parentName||"unknown"}. All staff please be on alert.`})}).catch(e=>console.log(e));
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
            <div style={{fontSize:13,color:"#94a3b8"}}>{lfClaimView.description}</div>
            <Fld label="Claimed By (Name) *" value={lfClaimBy} onChange={e=>setLfClaimBy(e.target.value)} ph="Full name of person claiming"/>
            <Fld label="ID Verification" value={lfClaimID} onChange={e=>setLfClaimID(e.target.value)} ph="e.g. DL #123456"/>
            <Fld label="Phone Number" value={lfClaimPhone} onChange={e=>setLfClaimPhone(e.target.value)} ph="(608) 555-1234"/>
            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)",opacity:!lfClaimBy?0.5:1}} disabled={!lfClaimBy}
              onClick={async()=>{
                await fetch("/.netlify/functions/update-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:lfClaimView.id,claimedBy:lfClaimBy,claimedByID:lfClaimID,claimedByPhone:lfClaimPhone})});
                setLfClaimView(null);setLfClaimBy("");setLfClaimID("");setLfClaimPhone("");
                fetchLostFound();
              }}>✅ Mark as Claimed</button>
            <button style={{...S.sendBtn,background:"rgba(255,255,255,0.06)",color:"#94a3b8"}} onClick={()=>setLfClaimView(null)}>Cancel</button>
          </div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:"#64748b"}}>{lfItems.length} items · {lfItems.filter(i=>i.status==="Unclaimed").length} unclaimed</div>
            </div>
            {lfLoading&&<div style={{textAlign:"center",color:"#64748b",padding:"20px"}}>Loading...</div>}
            {!lfLoading&&lfItems.length===0&&<div style={{textAlign:"center",color:"#64748b",padding:"20px"}}>No lost & found items yet.</div>}
            {lfItems.map(item=>(
              <div key={item.id} style={{borderRadius:12,border:`1px solid ${item.status==="Claimed"?"rgba(16,185,129,0.3)":"rgba(139,92,246,0.4)"}`,background:item.status==="Claimed"?"rgba(16,185,129,0.05)":"rgba(139,92,246,0.08)",padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:14,fontWeight:900,color:item.status==="Claimed"?"#10b981":"#a78bfa"}}>#{item.itemNumber}</div>
                  <div style={{fontSize:11,fontWeight:700,color:item.status==="Claimed"?"#10b981":"#f59e0b",background:item.status==="Claimed"?"rgba(16,185,129,0.1)":"rgba(245,158,11,0.1)",padding:"3px 8px",borderRadius:6}}>{item.status}</div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{item.description}</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>📍 {item.location} · Found by {item.foundBy} · {item.foundAt?new Date(item.foundAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):""}</div>
                {item.narrative&&<div style={{fontSize:12,color:"#64748b",fontStyle:"italic"}}>{item.narrative}</div>}
                {item.status==="Claimed"&&<div style={{fontSize:12,color:"#10b981"}}>Claimed by {item.claimedBy}{item.claimedByID?` (${item.claimedByID})`:""}</div>}
                {item.status==="Unclaimed"&&<button style={{marginTop:4,padding:"10px",borderRadius:8,border:"1px solid rgba(139,92,246,0.4)",background:"rgba(139,92,246,0.1)",color:"#a78bfa",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>setLfClaimView(item)}>Mark as Claimed</button>}
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
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{a.label}</div><div style={{fontSize:11,color:"#64748b"}}>{a.date}</div></div>
              <button style={{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#fca5a5",fontSize:11,borderRadius:6,padding:"4px 8px",cursor:"pointer"}} onClick={()=>setBroadcastAlerts(p=>p.filter((_,j)=>j!==i))}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{flex:1,height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#10b981,#059669)",borderRadius:3,width:`${pct}%`,transition:"width 0.4s"}}/></div>
              <span style={{fontSize:12,color:"#94a3b8"}}>{conf}/{tot}</span>
            </div>
            {ALL_LOCS.map(loc=>{const t=a.acks?.[loc];return(<div key={loc} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",borderRadius:8,border:`1px solid ${t?"#10b981":"rgba(239,68,68,0.2)"}`,background:t?"rgba(16,185,129,0.06)":"rgba(239,68,68,0.03)",marginBottom:3}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:t?"#10b981":"#ef4444",display:"inline-block",flexShrink:0}}/>
              <span style={{flex:1,fontSize:12,color:"#cbd5e1"}}>{loc}</span>
              {t?<span style={{fontSize:11,color:"#10b981",fontWeight:600}}>{t}</span>:<button style={{fontSize:10,background:"rgba(255,255,255,0.06)",border:"none",color:"#94a3b8",borderRadius:4,padding:"2px 6px",cursor:"pointer"}} onClick={()=>setBroadcastAlerts(prev=>prev.map((al,j)=>j!==i?al:{...al,acks:{...al.acks,[loc]:"Override"}}))}>Override</button>}
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
          const typeEmoji={medical:"🩺",walk_in:"🏥",fire:"🔥",security:"🛡️",lost_child:"🧒",supplies:"📦",maintenance:"🔧",resource:"📋",broadcast:"📢",ack:"✅",clear:"✅","911":"🚨",weather:"⛈️",general:"💬"}[e.type]||"📋";
          return(
            <div key={i} style={{background:isOpen?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.03)",borderRadius:12,border:`1px solid ${isOpen?typeColor+"55":"rgba(255,255,255,0.07)"}`,overflow:"hidden",transition:"border-color 0.2s",marginBottom:4}}>
              {/* HEADER ROW — always visible, tap to expand */}
              <button style={{display:"flex",alignItems:"center",gap:10,padding:"12px",width:"100%",background:"none",border:"none",cursor:"pointer",textAlign:"left"}} onClick={()=>setExpandedLog(isOpen?null:i)}>
                <span style={{fontSize:18,minWidth:24,textAlign:"center"}}>{typeEmoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{e.date||e.ts}</div>
                </div>
                <span style={{fontSize:11,color:typeColor,fontWeight:700,flexShrink:0}}>{e.ts}</span>
                <span style={{fontSize:12,color:"#475569",flexShrink:0,marginLeft:4}}>{isOpen?"▲":"▼"}</span>
              </button>
              {/* EXPANDED DETAIL */}
              {isOpen&&(
                <div style={{padding:"0 12px 14px",display:"flex",flexDirection:"column",gap:8,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:10}}>
                    {e.type&&<span style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:`${typeColor}22`,color:typeColor,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{e.type.replace("_"," ")}</span>}
                    {e.ts&&<span style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:"rgba(255,255,255,0.06)",color:"#94a3b8",fontWeight:600}}>⏰ {e.ts}</span>}
                    {e.date&&e.date!==e.ts&&<span style={{fontSize:11,padding:"3px 8px",borderRadius:6,background:"rgba(255,255,255,0.06)",color:"#64748b"}}>📅 {e.date}</span>}
                  </div>
                  {e.location&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:"#64748b",minWidth:60,fontWeight:600}}>Location</span><span style={{fontSize:13,color:"#f1f5f9",fontWeight:700}}>📍 {e.location}</span></div>}
                  {e.msg&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:12,color:"#64748b",minWidth:60,fontWeight:600,flexShrink:0}}>Details</span><span style={{fontSize:13,color:"#e2e8f0",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{e.msg}</span></div>}
                  {e.unit&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#64748b",minWidth:60,fontWeight:600}}>Unit</span><span style={{fontSize:13,color:"#f1f5f9"}}>👤 {e.unit}</span></div>}
                  {e.requestedBy&&<div style={{display:"flex",gap:8}}><span style={{fontSize:12,color:"#64748b",minWidth:60,fontWeight:600}}>From</span><span style={{fontSize:13,color:"#f1f5f9"}}>{e.requestedBy}</span></div>}
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
          <div style={{fontSize:13,color:"#94a3b8"}}>Date: {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{[...calls,...completed].length}</div><div style={{fontSize:11,color:"#64748b"}}>Total Calls</div></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{lfItems.length}</div><div style={{fontSize:11,color:"#64748b"}}>L&F Items</div></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{broadcastAlerts.length}</div><div style={{fontSize:11,color:"#64748b"}}>Broadcasts</div></div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:900,color:"#f1f5f9"}}>{activityLog.length}</div><div style={{fontSize:11,color:"#64748b"}}>Log Entries</div></div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Call Breakdown</div>
          {[["medical","🩺 Medical"],["fire","🔥 Fire/Safety"],["security","🛡️ Security"],["supplies","📦 Supplies"],["maintenance","🔧 Maintenance"],["lost_child","🧒 Lost Child"]].map(([type,label])=>{
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

        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#6366f1,#4f46e5)"}}
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
            fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:summary})}).catch(e=>console.log(e));
            sendGroupMe(summary,["admin"]);
            setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"report",label:"End of Night Report Generated",msg:`${report.totalCalls} calls · ${lfItems.length} L&F items`},...p]);
            alert("✅ End of Night Report sent to Admin via SMS and GroupMe!");
            setView("home");
          }}>
          📧 Generate & Send Report
        </button>
      </div>
    </div></div>
  );

  if(view==="911") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      {/* FULL SCREEN ALERT HEADER */}
      <div style={{background:"linear-gradient(135deg,#dc2626,#991b1b)",padding:"16px",display:"flex",flexDirection:"column",gap:4,textAlign:"center",boxShadow:"0 0 24px rgba(239,68,68,0.4)"}}>
        <div style={{fontSize:40}}>🚨</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"0.04em"}}>EMS INBOUND</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.7)"}}>911 Active · Initiated by {nineOneOne.by} · {nineOneOne.at}</div>
      </div>

      <div style={S.panelHd}><span style={S.panelTitle}>911 Incident Details</span><BB onClick={()=>setView("home")} label="← Back"/></div>

      <div style={S.cWrap}>
        {/* ALL INCIDENT INFO */}
        {[["location","Location","e.g. Near Moon Stage 1"],["nature","Nature of Call","e.g. Unresponsive adult"],["patients","Number of Patients","e.g. 1"],["age_sex","Age / Sex","e.g. 40s Male"],["conscious","Conscious / Breathing","e.g. Unconscious, breathing"],["interventions","Interventions in Progress","e.g. CPR in progress"],["entry","EMS Entry Point","e.g. Main Gate on Willy St"],["meeting","Who's Meeting EMS","e.g. Med 1 at gate"]].map(([k,l,p])=><Fld key={k} label={l} value={nineOneOne.info?.[k]||""} onChange={e=>set911(prev=>({...prev,info:{...prev.info,[k]:e.target.value}}))} ph={p}/>)}

        <label style={S.lbl}>🏥 MFD Staging Location</label>
        <select style={S.sel} value={emsForm.staging} onChange={e=>setEmsForm(p=>({...p,staging:e.target.value}))}>
          <option value="">Select...</option>
          {EMS_STAGING.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <Fld label="⏱️ EMS ETA" value={emsForm.eta} onChange={e=>setEmsForm(p=>({...p,eta:e.target.value}))} ph="e.g. 8 minutes"/>

        {/* SEND DISPATCH ALERT */}
        {!emsDispatched
          ?<button style={{...S.sendBtn,background:"linear-gradient(135deg,#dc2626,#991b1b)",opacity:(!emsForm.staging||!emsForm.eta)?0.5:1}} disabled={!emsForm.staging||!emsForm.eta} onClick={()=>setEmsDispatched(true)}>🚑 SEND EMS DISPATCH ALERT</button>
          :<div style={{background:"rgba(16,185,129,0.1)",border:"1px solid #10b981",borderRadius:10,padding:"12px",fontSize:13,color:"#10b981",fontWeight:700}}>✅ EMS Dispatch Alert Sent · {EMS_STAGING.find(s=>s.id===emsForm.staging)?.label} · ETA: {emsForm.eta}</div>
        }

        {/* ACKNOWLEDGE BUTTON — marks EMS as inbound, shows banner on home until cleared */}
        {!emsAcked
          ?<button style={{...S.sendBtn,background:"linear-gradient(135deg,#f59e0b,#d97706)",fontSize:16,fontWeight:900}} onClick={()=>{setEmsAcked(true);setEmsAlertDismissed(false);setView("home");}}>
            ✅ ACKNOWLEDGE — EMS INBOUND
          </button>
          :<div style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.4)",borderRadius:10,padding:"12px",fontSize:13,color:"#f59e0b",fontWeight:700}}>✅ Acknowledged — EMS Inbound banner active on home screen</div>
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
              <div style={{fontSize:15,fontWeight:900,color:"#ef4444",letterSpacing:"0.06em",textTransform:"uppercase"}}>🚨 EMS INBOUND — ACTIVE</div>
              {nineOneOne.info?.location&&<div style={{fontSize:14,fontWeight:700,color:"#fff"}}>📍 {nineOneOne.info.location}</div>}
              {nineOneOne.info?.nature&&<div style={{fontSize:13,color:"#fca5a5"}}>{nineOneOne.info.nature}</div>}
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Initiated by {nineOneOne.by} · {nineOneOne.at}</div>
              <button style={{padding:"10px",borderRadius:8,border:"1px solid rgba(239,68,68,0.5)",background:"rgba(239,68,68,0.15)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>setView("911")}>Update / View Details →</button>
            </div>
            <button style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid rgba(180,0,0,0.6)",background:"linear-gradient(135deg,rgba(180,0,0,0.25),rgba(120,0,0,0.1))",color:"#fff",fontSize:14,fontWeight:900,cursor:"pointer",textAlign:"center"}}
              onClick={()=>{
                // Archive current incident and start new one
                setNineOneOneHistory(p=>[...p,{...nineOneOne,closedAt:now()}]);
                set911({active:true,by:role,at:now(),info:{}});
                setView("911");
                sendGroupMe(`🚨 ADDITIONAL 911 INCIDENT by ${role}\nNew EMS activation — separate incident.`,["admin","medical"]);
                fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:`🚨 ADDITIONAL 911 INCIDENT by ${role} at Fete de Marquette. New separate incident.`})}).catch(e=>console.log(e));
              }}>
              ➕ New Separate 911 Incident
            </button>
          </div>
        ):(
          <button style={{width:"100%",padding:"18px",borderRadius:12,border:"2px solid rgba(180,0,0,0.8)",background:"linear-gradient(135deg,rgba(180,0,0,0.4),rgba(120,0,0,0.2))",color:"#fff",fontSize:17,fontWeight:900,cursor:"pointer",textAlign:"center",boxShadow:"0 0 14px rgba(200,0,0,0.3)",letterSpacing:"0.04em"}}
            onClick={()=>{
              // Auto-populate from active call if one exists
              const activeCall=myActive?.[0]||unassigned?.[0];
              set911({active:true,by:role,at:now(),info:{
                location:activeCall?.location||"",
                nature:activeCall?.problem||"",
                patients:activeCall?.details||"",
              }});
              setView("911");
              sendGroupMe(`🚨 911 ACTIVATED by ${role}\nEMS has been called. Stand by.`,["admin","medical"]);
              fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:`🚨 911 ACTIVATED by ${role} at Fete de Marquette.`})}).catch(e=>console.log(e));
            }}>
            🚨 ACTIVATE 911
          </button>
        )}
      </div>
      <MedHome role={role} calls={activeCalls} setCalls={setCalls} completed={completed} setCompleted={setCompleted} medSt={medSt} setMedSt={setMedSt} myActive={myActive} unassigned={unassigned} set911={set911} setView={setView} resourceView={resourceView} setResourceView={setResourceView} nineOneOne={nineOneOne} triggerIncident={(call)=>{setIncidentView(call);setIncFields({respondingUnit:role,disposition:"",interventions:"",narrative:"",notes:""});}} sendGroupMe={sendGroupMe} liveMode={liveMode}/>
    </div></div>
  );

  // ADMIN HOME
  const pendingAcks=broadcastAlerts.filter(a=>a.requiresAck).reduce((s,a)=>s+ALL_LOCS.filter(l=>!a.acks?.[l]).length,0);
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

      {/* 911 INBOUND BANNER — Admin home — shows full info when acknowledged, stays until incident closed */}
      {nineOneOne?.active&&emsAcked&&(
        <div style={{borderRadius:12,border:"2px solid rgba(239,68,68,0.8)",background:"linear-gradient(135deg,rgba(180,0,0,0.28),rgba(120,0,0,0.15))",padding:"16px",display:"flex",flexDirection:"column",gap:8,boxShadow:"0 0 20px rgba(239,68,68,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#ef4444",letterSpacing:"0.08em",textTransform:"uppercase"}}>🚨 EMS INBOUND — ACTIVE INCIDENT</div>
            <button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",fontWeight:600}} onClick={()=>setView("911")}>Details →</button>
          </div>
          {nineOneOne.info?.location&&<div style={{fontSize:22,fontWeight:900,color:"#fff"}}>📍 {nineOneOne.info.location}</div>}
          {nineOneOne.info?.nature&&<div style={{fontSize:14,fontWeight:700,color:"#fca5a5"}}>{nineOneOne.info.nature}</div>}
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {nineOneOne.info?.patients&&<div style={{fontSize:12,color:"#94a3b8"}}>👤 {nineOneOne.info.patients} patient{nineOneOne.info.patients!=="1"?"s":""}</div>}
            {nineOneOne.info?.age_sex&&<div style={{fontSize:12,color:"#94a3b8"}}>{nineOneOne.info.age_sex}</div>}
            {nineOneOne.info?.conscious&&<div style={{fontSize:12,color:"#94a3b8"}}>{nineOneOne.info.conscious}</div>}
            {emsForm.eta&&<div style={{fontSize:12,color:"#fbbf24",fontWeight:700}}>⏱️ ETA: {emsForm.eta}</div>}
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
            {c.details&&<div style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{c.details}</div>}
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:2}}>
              {c.unit&&<div style={{fontSize:12,color:"#94a3b8"}}>👤 Unit: <span style={{color:"#f1f5f9",fontWeight:700}}>{c.unit}</span></div>}
              {c.requestedBy&&<div style={{fontSize:12,color:"#94a3b8"}}>From: <span style={{color:"#f1f5f9",fontWeight:700}}>{c.requestedBy}</span></div>}
              <div style={{fontSize:12,color:"#94a3b8"}}>⏰ <span style={{color:"#f1f5f9",fontWeight:700}}>{c.ackedAt}</span></div>
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
          <div style={{fontSize:13,color:"#fbbf24",fontWeight:700}}>⚠️ Tap to view full details and acknowledge</div>
        </div>
      )}

      {/* LIVE/DEMO MODE INDICATOR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:liveMode?"rgba(16,185,129,0.08)":"rgba(245,158,11,0.08)",border:`1px solid ${liveMode?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.3)"}`,borderRadius:10,padding:"10px 14px"}}>
        <div style={{fontSize:13,fontWeight:700,color:liveMode?"#10b981":"#f59e0b"}}>{liveMode?"⚡ LIVE MODE — Real calls from staff":"🎭 DEMO MODE — Showing sample data"}</div>
        <button style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"4px 10px",color:"#64748b",fontSize:11,cursor:"pointer",fontWeight:600}} onClick={()=>setLiveMode(p=>!p)}>Switch</button>
      </div>

      {/* NWS WEATHER ALERT BANNER */}
      {weatherAlertBanner&&isAdmin&&(
        <div style={{borderRadius:14,border:"3px solid #ef4444",background:"linear-gradient(135deg,rgba(239,68,68,0.18),rgba(37,99,235,0.12))",padding:"16px",display:"flex",flexDirection:"column",gap:10,boxShadow:"0 0 24px rgba(239,68,68,0.35),0 0 48px rgba(37,99,235,0.15)",animation:"pulse 2s infinite"}}>
          <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 24px rgba(239,68,68,0.35),0 0 48px rgba(37,99,235,0.15);}50%{box-shadow:0 0 40px rgba(239,68,68,0.6),0 0 80px rgba(37,99,235,0.3);}}`}</style>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:24}}>🚨</span>
              <div>
                <div style={{fontSize:15,fontWeight:900,color:"#ef4444",letterSpacing:"0.06em",textTransform:"uppercase",lineHeight:1.2}}>NWS WEATHER ALERT</div>
                <div style={{fontSize:13,fontWeight:800,color:"#93c5fd"}}>{weatherAlertBanner.event}</div>
              </div>
            </div>
            <button style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"#64748b",fontSize:12,cursor:"pointer",fontWeight:600,padding:"4px 10px"}} onClick={()=>{setWeatherDismissed(p=>[...p,weatherAlertBanner.id]);setWeatherAlertBanner(null);}}>Dismiss</button>
          </div>
          {weatherAlertBanner.headline&&<div style={{fontSize:14,fontWeight:700,color:"#fca5a5",lineHeight:1.5,borderLeft:"3px solid #ef4444",paddingLeft:10}}>{weatherAlertBanner.headline}</div>}
          {weatherAlertBanner.description&&<div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>{weatherAlertBanner.description}...</div>}
          <button style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#dc2626,#1d4ed8)",color:"#fff",fontSize:15,fontWeight:900,cursor:"pointer",letterSpacing:"0.04em"}}
            onClick={()=>{setAlertView("weather_imminent");setView("alert");setAlertFields({_weatherAlert:weatherAlertBanner});}}>
            🚨 SEND WEATHER ALERT NOW
          </button>
        </div>
      )}

      {/* CURRENT WEATHER WIDGET */}
      {currentWeather&&isAdmin&&(
        <div style={{borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",padding:"12px 16px",display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:32,fontWeight:900,color:"#f1f5f9"}}>{currentWeather.temp!=null?`${currentWeather.temp}°F`:"--"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{currentWeather.desc||"Madison, WI"}</div>
            <div style={{fontSize:12,color:"#64748b"}}>
              {currentWeather.wind!=null?`Wind: ${currentWeather.wind} mph · `:""}
              {currentWeather.humidity!=null?`Humidity: ${currentWeather.humidity}%`:""}
            </div>
          </div>
          <button style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer"}} onClick={()=>setRadarVisible(p=>!p)}>
            {radarVisible?"Hide":"Radar"}
          </button>
        </div>
      )}

      {/* LIVE RADAR */}
      {radarVisible&&isAdmin&&(
        <div style={{borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
          <iframe
            src="https://radar.weather.gov/station/KMKX/standard"
            style={{width:"100%",height:300,border:"none"}}
            title="NWS Radar"
          />
        </div>
      )}

      {/* SECTION 1: COMMAND */}
      <div style={{background:"rgba(255,255,255,0.03)",borderRadius:14,border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
        <div style={{...S.sectionHdr,fontSize:13,fontWeight:900,padding:"8px 12px 6px"}}>📡 Command</div>
        {/* ROW 1: Activate 911 + Lost Child side by side */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:"10px 10px 6px"}}>
          <button style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"16px 8px",borderRadius:12,border:"2px solid rgba(180,0,0,0.6)",background:"linear-gradient(135deg,rgba(180,0,0,0.25),rgba(120,0,0,0.1))",cursor:"pointer",boxShadow:"0 0 10px rgba(200,0,0,0.2)",minHeight:90}} onClick={()=>{set911({active:true,by:"Admin",at:now(),info:{}});setView("911");}}>
            <span style={{fontSize:28}}>🚨</span>
            <span style={{fontSize:14,fontWeight:900,color:"#fff",textAlign:"center",lineHeight:1.2}}>Activate 911</span>
          </button>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <button style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"10px 8px",borderRadius:12,border:`2px solid ${lostChildCalls.length>0?"rgba(234,179,8,0.7)":"rgba(245,158,11,0.3)"}`,background:lostChildCalls.length>0?"linear-gradient(135deg,rgba(234,179,8,0.2),rgba(202,138,4,0.1))":"rgba(255,255,255,0.03)",cursor:"pointer",position:"relative",minHeight:60}} onClick={()=>{setCallFilter(["lost_child"]);setCallFilterTitle("Lost Child");setCallTab("active");setView("callqueue");}}>
              <span style={{fontSize:22}}>🧒</span>
              <span style={{fontSize:14,fontWeight:800,color:lostChildCalls.length>0?"#fcd34d":"#94a3b8",textAlign:"center"}}>Lost Child{lostChildCalls.length>0?` (${lostChildCalls.length})`:""}</span>
              {lostChildCalls.length>0&&<div style={{position:"absolute",top:6,right:6,background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{lostChildCalls.length}</div>}
            </button>
            <button style={{padding:"7px",borderRadius:8,border:"1px solid rgba(234,179,8,0.4)",background:"rgba(234,179,8,0.08)",color:"#fcd34d",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>setLcView(true)}>➕ Report Lost Child</button>
          </div>
        </div>
        {/* ROW 2: Request Resources full width */}
        <div style={{padding:"0 10px 10px"}}>
          <button style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"14px",borderRadius:12,border:"1px solid rgba(124,58,237,0.4)",background:"rgba(124,58,237,0.08)",cursor:"pointer"}} onClick={()=>setResourceView(true)}>
            <span style={{fontSize:22}}>📋</span>
            <span style={{fontSize:18,fontWeight:900,color:"#a78bfa"}}>Request Resources</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: SAFETY + BROADCAST side by side */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* SAFETY */}
        <div style={{background:"linear-gradient(160deg,rgba(220,38,38,0.15),rgba(37,99,235,0.15))",borderRadius:14,border:"1px solid rgba(220,38,38,0.3)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{...S.sectionHdr,background:"linear-gradient(135deg,rgba(220,38,38,0.3),rgba(37,99,235,0.3))",fontSize:16,fontWeight:900}}>🚨 Safety</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,padding:"8px"}}>
            {[
              {types:["medical","walk_in"],label:"Medical",icon:"🩺",color:ALERT_COLORS.medical,calls:medCalls,title:"Medical Calls"},
              {types:["fire"],label:"Fire/Life",icon:"🔥",color:ALERT_COLORS.fire,calls:fireCalls,title:"Fire / Life Safety"},
              {types:["security"],label:"Security",icon:"🛡️",color:ALERT_COLORS.security,calls:secCalls,title:"Security"},
            ].map(({types,label,icon,color,calls:tc,title})=>(
              <button key={label} style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:10,border:`1px solid ${color.border||"rgba(255,255,255,0.1)"}`,background:color.bg||"rgba(255,255,255,0.03)",cursor:"pointer",textAlign:"left",position:"relative"}}
                onClick={()=>{setCallFilter(types);setCallFilterTitle(title);setCallTab("active");setView("callqueue");}}>
                <span style={{fontSize:20}}>{icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{label}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{tc.length>0?`${tc.length} active`:"Clear"}</div>
                </div>
                {tc.filter(c=>!c.acknowledged).length>0&&<div style={{background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{tc.filter(c=>!c.acknowledged).length}</div>}
              </button>
            ))}
          <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:10,border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.1)",cursor:"pointer",textAlign:"left",margin:"0 8px 8px"}} onClick={()=>setResourceView(true)}>
              <span style={{fontSize:18}}>📡</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800,color:"#a5b4fc"}}>Request Resources</div><div style={{fontSize:10,color:"#64748b"}}>MFD, Police, etc.</div></div>
            </button>
          </div>
        </div>

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
            <button style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",cursor:"pointer"}} onClick={()=>setView("acks")}>
              <span style={{fontSize:11,fontWeight:600,color:"#f59e0b",flex:1}}>✅ Acknowledgments {pendingAcks>0&&`(${pendingAcks} pending)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: SUPPLIES & MAINTENANCE */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {/* SUPPLIES */}
        <div style={{background:"rgba(120,53,15,0.18)",borderRadius:14,border:"1px solid rgba(146,64,14,0.5)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{...S.sectionHdr,background:"rgba(120,53,15,0.35)",fontSize:13,fontWeight:900}}>📦 Supplies</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,padding:"8px"}}>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:10,border:`1px solid ${ALERT_COLORS.supplies.border}`,background:ALERT_COLORS.supplies.bg,cursor:"pointer",textAlign:"left"}}
              onClick={()=>{setCallFilter(["supplies"]);setCallFilterTitle("Supplies & Restock");setCallTab("active");setView("callqueue");}}>
              <span style={{fontSize:18}}>📋</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>View Requests</div>
                <div style={{fontSize:10,color:"#64748b"}}>{suppCalls.length>0?`${suppCalls.length} active`:"Clear"}</div>
              </div>
              {suppCalls.filter(c=>!c.acknowledged).length>0&&<div style={{background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{suppCalls.filter(c=>!c.acknowledged).length}</div>}
            </button>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left"}}
              onClick={()=>{setResourceType("supplies");setResourceFields({});setResourceView(true);}}>
              <span style={{fontSize:18}}>➕</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Request</div></div>
            </button>
          </div>
        </div>

        {/* MAINTENANCE */}
        <div style={{background:"rgba(16,185,129,0.12)",borderRadius:14,border:"1px solid rgba(22,101,52,0.5)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{...S.sectionHdr,background:"rgba(16,185,129,0.25)",fontSize:13,fontWeight:900}}>🔧 Maintenance</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,padding:"8px"}}>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:10,border:`1px solid ${ALERT_COLORS.maintenance.border}`,background:ALERT_COLORS.maintenance.bg,cursor:"pointer",textAlign:"left"}}
              onClick={()=>{setCallFilter(["maintenance"]);setCallFilterTitle("Maintenance");setCallTab("active");setView("callqueue");}}>
              <span style={{fontSize:18}}>📋</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9"}}>View Requests</div>
                <div style={{fontSize:10,color:"#64748b"}}>{maintCalls.length>0?`${maintCalls.length} active`:"Clear"}</div>
              </div>
              {maintCalls.filter(c=>!c.acknowledged).length>0&&<div style={{background:"#ef4444",color:"#fff",fontSize:10,fontWeight:700,borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{maintCalls.filter(c=>!c.acknowledged).length}</div>}
            </button>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left"}}
              onClick={()=>{setResourceType("maintenance");setResourceFields({});setResourceView(true);}}>
              <span style={{fontSize:18}}>➕</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Request</div></div>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: EQUIPMENT TRACKER */}
      <div style={{background:"rgba(234,179,8,0.1)",borderRadius:14,border:"1px solid rgba(234,179,8,0.4)",overflow:"hidden"}}>
        <div style={{...S.sectionHdr,background:"rgba(234,179,8,0.25)",borderBottom:"1px solid rgba(234,179,8,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fcd34d"}} onClick={()=>window.open("/equipment","_blank")}>
          <span>📻 Equipment Tracker</span>
          <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>Radios · Readers · Bundles →</span>
        </div>
        <div style={{padding:"10px 12px",display:"flex",gap:8}}>
          <div style={{flex:1,background:"rgba(239,68,68,0.1)",borderRadius:8,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#f87171"}}>—</div>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",fontWeight:700,marginTop:2}}>Out</div>
          </div>
          <div style={{flex:1,background:"rgba(16,185,129,0.1)",borderRadius:8,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#6ee7b7"}}>—</div>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",fontWeight:700,marginTop:2}}>Available</div>
          </div>
          <div style={{flex:2,display:"flex",alignItems:"center",padding:"0 8px"}}>
            <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>Live data loads from Equipment Tracker when deployed. Tap → to open tracker.</div>
          </div>
        </div>
      </div>

      {/* SECTION 5: LOST & FOUND */}
      <div style={{background:"rgba(249,115,22,0.12)",borderRadius:14,border:"1px solid rgba(249,115,22,0.45)",overflow:"hidden"}}>
        <div style={{...S.sectionHdr,background:"rgba(249,115,22,0.2)",borderBottom:"1px solid rgba(249,115,22,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>{setView("lostfound");fetchLostFound();}}>
          <span>📦 Lost & Found</span>
          <span style={{fontSize:11,color:"#a78bfa",fontWeight:400}}>{lfItems.length} items · {lfItems.filter(i=>i.status==="Unclaimed").length} unclaimed →</span>
        </div>
        <div style={{padding:"8px"}}>
          {lfItems.length===0
            ?<div style={{fontSize:13,color:"#64748b",padding:"8px 4px"}}>No items logged yet. Workers can log items from the Field App.</div>
            :lfItems.slice(0,3).map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:item.status==="Claimed"?"#10b981":"#a78bfa",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>#{item.itemNumber} — {item.description}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>📍 {item.location} · {item.status}</div>
                </div>
              </div>
            ))
          }
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid rgba(139,92,246,0.3)",background:"rgba(139,92,246,0.08)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>{setView("lostfound");fetchLostFound();}}>View All →</button>
            <button style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid rgba(139,92,246,0.5)",background:"rgba(139,92,246,0.15)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>setLfAddMode(p=>!p)}>+ Log Item</button>
          </div>
          {lfAddMode&&(
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8,padding:"12px",background:"rgba(139,92,246,0.08)",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)"}}>
              <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="Description of item *" value={lfNewDesc} onChange={e=>setLfNewDesc(e.target.value)}/>
              <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="Where found *" value={lfNewLoc} onChange={e=>setLfNewLoc(e.target.value)}/>
              <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="Narrative (optional)" value={lfNewNarrative} onChange={e=>setLfNewNarrative(e.target.value)}/>
              <button style={{padding:"10px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",opacity:(!lfNewDesc||!lfNewLoc||lfSubmitting)?0.5:1}}
                disabled={!lfNewDesc||!lfNewLoc||lfSubmitting}
                onClick={async()=>{
                  setLfSubmitting(true);
                  try{
                    const res=await fetch("/.netlify/functions/submit-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:lfNewDesc,location:lfNewLoc,foundBy:"Admin",narrative:lfNewNarrative})});
                    const data=await res.json();
                    if(data.success){
                      setActivityLog(p=>[{id:Date.now(),ts:tShort(),date:now(),type:"lostfound",label:`L&F #${data.itemNumber}`,msg:lfNewDesc},...p]);
                      setLfNewDesc("");setLfNewLoc("");setLfNewNarrative("");setLfAddMode(false);
                      fetchLostFound();
                      alert(`✅ Item logged! Item #${data.itemNumber} — Bring to Festival Office`);
                    }
                  }catch(e){console.log(e);}
                  setLfSubmitting(false);
                }}>
                {lfSubmitting?"Saving...":"📦 Save Item"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* END OF NIGHT REPORT */}
      <div style={{background:"rgba(99,102,241,0.08)",borderRadius:14,border:"1px solid rgba(99,102,241,0.25)",overflow:"hidden"}}>
        <div style={{...S.sectionHdr,background:"rgba(99,102,241,0.2)",borderBottom:"1px solid rgba(99,102,241,0.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>setView("endofnight")}>
          <span>🌙 End of Night Report</span>
          <span style={{fontSize:11,color:"#a5b4fc",fontWeight:400}}>Generate & Email →</span>
        </div>
        <div style={{padding:"10px 14px",fontSize:13,color:"#64748b"}}>
          Tap to generate tonight's summary — all calls, incidents, L&F, broadcasts.
        </div>
      </div>

      {/* SECTION 6: ACTIVITY LOG */}
      <div style={{background:"rgba(255,255,255,0.03)",borderRadius:14,border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
        <div style={{...S.sectionHdr,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}} onClick={()=>setView("log")}>
          <span>📋 Activity Log</span>
          <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>{activityLog.length} entries →</span>
        </div>
        <div style={{padding:"8px"}}>
          {activityLog.slice(0,3).map((e,i)=>(
            <div key={i} style={{display:"flex",gap:8,padding:"6px 4px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <span style={{fontSize:11,color:"#f59e0b",fontWeight:600,minWidth:48,flexShrink:0}}>{e.ts}</span>
              <span style={{fontSize:11,color:"#94a3b8",lineHeight:1.3}}>{e.label}</span>
            </div>
          ))}
          <button style={{width:"100%",padding:"8px",background:"none",border:"none",color:"#6366f1",fontSize:12,cursor:"pointer",marginTop:4}} onClick={()=>setView("log")}>View full log →</button>
        </div>
      </div>

    </div>
  </div></div>);
}

// ─── MED HOME ─────────────────────────────────────────────────────────────────
// ─── SECURITY ACK PANEL ───────────────────────────────────────────────────────
function SecurityAckPanel({alertCall,role,ackCall,tick}){
  const [mpdCancelled,setMpdCancelled]=useState(false);
  const [mpdFired,setMpdFired]=useState(false);
  const COUNTDOWN=30;
  const elapsed=Math.min(Math.round((Date.now()-alertCall.firedAt)/1000),COUNTDOWN);
  const remaining=Math.max(0,COUNTDOWN-elapsed);
  useEffect(()=>{if(remaining===0&&!mpdCancelled&&!mpdFired)setMpdFired(true);},[remaining]);
  return(<div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:380,alignItems:"center"}}>
    <button style={{background:"rgba(16,185,129,0.35)",border:"3px solid rgba(16,185,129,0.8)",borderRadius:14,padding:"20px",color:"#fff",fontSize:18,fontWeight:900,cursor:"pointer",width:"100%"}} onClick={()=>ackCall(alertCall.id,role||"Admin")}>✅ ACKNOWLEDGE</button>
    {!mpdFired&&!mpdCancelled&&(<div style={{width:"100%",background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"12px 20px",display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)"}}>👮 MPD auto-notify in</span>
        <span style={{fontSize:22,fontWeight:900,color:remaining<=5?"#fca5a5":"#f59e0b"}}>{remaining}s</span>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,0.15)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:remaining<=5?"#ef4444":"#f59e0b",borderRadius:2,width:`${(remaining/COUNTDOWN)*100}%`,transition:"width 1s"}}/></div>
      <button style={{padding:"10px",borderRadius:10,border:"2px solid rgba(239,68,68,0.6)",background:"rgba(239,68,68,0.15)",color:"#fca5a5",fontSize:14,fontWeight:800,cursor:"pointer"}} onClick={()=>setMpdCancelled(true)}>❌ Cancel MPD Notification</button>
    </div>)}
    {mpdFired&&!mpdCancelled&&(<div style={{width:"100%",background:"rgba(29,78,216,0.2)",borderRadius:12,padding:"12px 20px",display:"flex",flexDirection:"column",gap:8,border:"1px solid rgba(59,130,246,0.4)"}}>
      <div style={{fontSize:13,fontWeight:800,color:"#93c5fd"}}>👮 MPD Notified — SMS + Voice Call Sent</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontStyle:"italic",lineHeight:1.6}}>"{MPD_VOICE_SCRIPT(alertCall.location,alertCall.problem)}"</div>
      <button style={{padding:"10px",borderRadius:10,border:"2px solid rgba(16,185,129,0.5)",background:"rgba(16,185,129,0.12)",color:"#6ee7b7",fontSize:13,fontWeight:800,cursor:"pointer"}} onClick={()=>setMpdCancelled(true)}>✅ Stand Down MPD — Send All Clear</button>
    </div>)}
    {mpdCancelled&&(<div style={{width:"100%",background:"rgba(16,185,129,0.1)",borderRadius:12,padding:"12px 20px",border:"1px solid rgba(16,185,129,0.3)"}}>
      {mpdFired?(<><div style={{fontSize:13,fontWeight:800,color:"#10b981",marginBottom:6}}>✅ Stand Down Sent to MPD</div><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontStyle:"italic",lineHeight:1.6}}>"{MPD_STANDDOWN_VOICE(alertCall.location)}"</div></>):(
      <div style={{fontSize:13,fontWeight:800,color:"#10b981"}}>✅ MPD Notification Cancelled — Handling internally</div>)}
    </div>)}
  </div>);
}

function MedHome({role,calls,setCalls,completed,setCompleted,medSt,setMedSt,myActive,unassigned,set911,setView,setResourceView,nineOneOne,triggerIncident,sendGroupMe,liveMode}){
  const [tab,setTab]=useState("calls");
  const [wiComplaint,setWiComplaint]=useState("");
  const [wiDetails,setWiDetails]=useState("");
  const [medReqView,setMedReqView]=useState(false);
  const [medReqType,setMedReqType]=useState("");
  const [medReqLocation,setMedReqLocation]=useState("");
  const [medReqProblem,setMedReqProblem]=useState("");
  const [medReqDetails,setMedReqDetails]=useState("");
  const walkIns=(calls||[]).filter(c=>c.type==="walk_in"&&c.unit===role);
  const allActive=[...myActive];

  const doWalkIn=()=>{
    if(!wiComplaint)return;
    const c={id:Date.now(),type:"walk_in",location:"Medical Tent",problem:wiComplaint,details:wiDetails,requestedBy:role,status:"on_scene",acknowledged:true,history:[{status:"walk_in",ts:new Date().toLocaleTimeString()},{status:"on_scene",ts:new Date().toLocaleTimeString(),unit:role}],unit:role,firedAt:Date.now()};
    setCalls(p=>[c,...p]);
    playAlert("walk_in");
    setMedSt(p=>({...p,[role==="Med 1"?"med1":"med2"]:{status:"on_scene",since:new Date().toLocaleTimeString()}}));
    setWiComplaint("");setWiDetails("");setTab("calls");
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:0}}>
    {/* ACTIVE CALL — top, always open */}
    {allActive.length>0&&<div style={{padding:"0 16px 10px"}}>
      {allActive.map(c=>{
        const isAcked=c.acknowledged||c.status==="acknowledged";
        const isOnScene=c.status==="on_scene";
        const tc=ALERT_COLORS[c.type]||ALERT_COLORS.medical;
        return(<div key={c.id} style={{borderRadius:16,border:`2px solid ${tc.border}`,padding:"18px",display:"flex",flexDirection:"column",gap:12,background:tc.bg}}>
          <div style={{fontSize:12,fontWeight:800,color:"#ec4899",letterSpacing:"0.08em",textTransform:"uppercase"}}>{tc.icon} Current Call — {role}</div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Location</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>📍 {c.location}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Reason for Request</div>
            <div style={{fontSize:16,fontWeight:700,color:"#e2e8f0",lineHeight:1.5}}>{c.problem}</div>
          </div>
          {c.details&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Patient Description</div>
            <div style={{fontSize:14,color:"#cbd5e1",lineHeight:1.5}}>{c.details}</div>
          </div>}
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Sent By</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{c.requestedBy}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Time</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{c.history[0]?.ts}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Date</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button style={{padding:"14px",borderRadius:12,border:isAcked?"none":"2px solid #10b981",cursor:"pointer",fontSize:14,fontWeight:800,background:isAcked?"#059669":"rgba(16,185,129,0.2)",color:"#fff"}}
              onClick={()=>setCalls(p=>p.map(x=>x.id===c.id?{...x,acknowledged:true,status:"acknowledged",history:[...x.history,{status:"acknowledged",ts:new Date().toLocaleTimeString(),unit:role}]}:x))}>
              ✅ {isAcked?"Acknowledged":"Acknowledge"}
            </button>
            <button style={{padding:"14px",borderRadius:12,border:isOnScene?"none":"2px solid #ef4444",cursor:"pointer",fontSize:14,fontWeight:800,background:isOnScene?"#dc2626":"rgba(239,68,68,0.2)",color:"#fff"}}
              onClick={()=>setCalls(p=>p.map(x=>x.id===c.id?{...x,status:"on_scene",history:[...x.history,{status:"on_scene",ts:new Date().toLocaleTimeString(),unit:role}]}:x))}>
              🔴 On Scene
            </button>
            <button style={{padding:"14px",borderRadius:12,border:"2px solid rgba(16,185,129,0.4)",cursor:"pointer",fontSize:14,fontWeight:800,background:"rgba(16,185,129,0.15)",color:"#6ee7b7"}}
              onClick={()=>{
                setCalls(p=>p.filter(x=>x.id!==c.id));
                setCompleted(p=>[{...c,status:"cleared",clearedBy:role,clearedAt:new Date().toLocaleTimeString()},...p]);
                setMedSt(p=>({...p,[role==="Med 1"?"med1":"med2"]:{status:"available",since:null}}));
                if(liveMode) fetch("/.netlify/functions/update-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:c.id,status:"Cleared",unit:role})}).catch(e=>console.log(e));
                if(["medical","walk_in","fire","security"].includes(c.type)&&triggerIncident) triggerIncident({...c,timestamp:c.history?.[0]?.ts||new Date().toISOString()});
              }}>
              ✅ Clear
            </button>
            <button style={{padding:"14px",borderRadius:12,border:"2px solid rgba(16,185,129,0.5)",cursor:"pointer",fontSize:14,fontWeight:800,background:"rgba(16,185,129,0.3)",color:"#fff"}}
              onClick={()=>{setCalls(p=>p.filter(x=>x.id!==c.id));setMedSt(p=>({...p,[role==="Med 1"?"med1":"med2"]:{status:"available",since:null}}));}}>
              🟢 Ready
            </button>
          </div>
        </div>);
      })}
    </div>}

    {/* 911 INBOUND BANNER — shows when 911 is active */}
    {nineOneOne?.active&&(
      <div style={{margin:"0 16px 10px",borderRadius:12,border:"2px solid rgba(239,68,68,0.8)",background:"linear-gradient(135deg,rgba(180,0,0,0.3),rgba(120,0,0,0.15))",padding:"14px 16px",display:"flex",flexDirection:"column",gap:6,boxShadow:"0 0 16px rgba(239,68,68,0.3)"}}>
        <div style={{fontSize:13,fontWeight:900,color:"#ef4444",letterSpacing:"0.08em",textTransform:"uppercase"}}>🚨 911 INBOUND — EMS EN ROUTE</div>
        {nineOneOne.info?.location&&<div style={{fontSize:18,fontWeight:800,color:"#fff"}}>📍 {nineOneOne.info.location}</div>}
        {nineOneOne.info?.nature&&<div style={{fontSize:14,color:"#fca5a5"}}>{nineOneOne.info.nature}</div>}
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Initiated by {nineOneOne.by} · {nineOneOne.at}</div>
        <div style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>⚠️ Prepare to meet EMS at entry point</div>
      </div>
    )}

    {/* TABS — Walk-In only */}
    <div style={{display:"flex",margin:"0 16px 8px",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4,gap:4}}>
      <button style={{flex:1,padding:"10px",borderRadius:9,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:tab==="walkin"?"rgba(249,115,22,0.4)":"none",color:tab==="walkin"?"#fff":"#64748b"}} onClick={()=>setTab("walkin")}>🚶 Walk-In {walkIns.length>0&&`(${walkIns.length})`}</button>
    </div>

    {tab==="calls"&&<div style={{display:"flex",flexDirection:"column",gap:10,padding:"0 20px"}}>
      {unassigned.map(c=>(
        <div key={c.id} style={{borderRadius:12,border:"2px solid #ef4444",padding:"14px",display:"flex",flexDirection:"column",gap:10,background:"rgba(239,68,68,0.1)"}}>
          <div style={{fontSize:13,fontWeight:900,color:"#ef4444",letterSpacing:"0.06em"}}>🆕 INCOMING — UNASSIGNED</div>
          {/* LOCATION */}
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Location</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>📍 {c.location}</div>
          </div>
          {/* REASON */}
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Reason for Request</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",lineHeight:1.5}}>{c.problem}</div>
          </div>
          {/* PATIENT DESCRIPTION */}
          {c.details&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Patient Description</div>
            <div style={{fontSize:14,color:"#cbd5e1",lineHeight:1.5}}>{c.details}</div>
          </div>}
          {/* WHO + WHEN */}
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Sent By</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{c.requestedBy}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Time</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{c.history[0]?.ts}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Date</div>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
            </div>
          </div>
          <button style={{background:"linear-gradient(135deg,#059669,#047857)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"}}
            onClick={()=>setCalls(p=>p.map(x=>x.id===c.id?{...x,acknowledged:true,unit:role,status:"acknowledged",history:[...x.history,{status:"acknowledged",ts:new Date().toLocaleTimeString(),unit:role}]}:x))}>
            ✅ ASSIGN TO ME — {role}
          </button>
        </div>
      ))}
      {allActive.length===0&&unassigned.length===0&&<div style={{textAlign:"center",color:"#475569",padding:"24px 0",fontSize:14}}>No active calls — standing by</div>}

      {/* MED REQUEST BUTTON */}
      <button style={{display:"flex",alignItems:"center",gap:10,padding:"12px",borderRadius:12,border:"1px solid rgba(219,39,119,0.4)",background:"rgba(219,39,119,0.08)",cursor:"pointer"}} onClick={()=>setMedReqView(p=>!p)}>
        <span style={{fontSize:18}}>📋</span>
        <div><div style={{fontSize:13,fontWeight:800,color:"#f9a8d4"}}>Send a Request</div><div style={{fontSize:11,color:"#64748b"}}>Medical, Security, Supplies</div></div>
      </button>

      {medReqView&&(
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:12,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}>Request Type</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[{id:"medical",label:"🩺 Medical",color:"#db2777"},{id:"security",label:"🛡️ Security",color:"#2563eb"},{id:"supplies",label:"📦 Supplies",color:"#10b981"},{id:"maintenance",label:"🔧 Maintenance",color:"#f59e0b"}].map(t=>(
              <button key={t.id} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${medReqType===t.id?t.color+"aa":"rgba(255,255,255,0.1)"}`,background:medReqType===t.id?t.color+"22":"rgba(255,255,255,0.03)",color:medReqType===t.id?"#f1f5f9":"#64748b",fontSize:13,fontWeight:medReqType===t.id?700:400,cursor:"pointer"}} onClick={()=>setMedReqType(t.id)}>{t.label}</button>
            ))}
          </div>
          <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="Location *" value={medReqLocation} onChange={e=>setMedReqLocation(e.target.value)}/>
          <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="What's the problem? *" value={medReqProblem} onChange={e=>setMedReqProblem(e.target.value)}/>
          <input style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="Additional details (optional)" value={medReqDetails} onChange={e=>setMedReqDetails(e.target.value)}/>
          <button style={{padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#db2777,#9d174d)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",opacity:(!medReqType||!medReqLocation||!medReqProblem)?0.5:1}}
            disabled={!medReqType||!medReqLocation||!medReqProblem}
            onClick={()=>{
              const newCall={id:Date.now(),type:medReqType,location:medReqLocation,problem:medReqProblem,details:medReqDetails,requestedBy:role,status:"acknowledged",acknowledged:true,history:[{status:"new_call",ts:new Date().toLocaleTimeString()},{status:"acknowledged",ts:new Date().toLocaleTimeString(),unit:role}],unit:role,firedAt:Date.now()};
              setCalls(p=>[newCall,...p]);
              if(liveMode) fetch("/.netlify/functions/submit-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:medReqType,location:medReqLocation,problem:medReqProblem,details:medReqDetails,requestedBy:role})}).catch(e=>console.log(e));
              if(sendGroupMe){
                const channelMap={medical:"medical",security:"admin",supplies:"restock",maintenance:"maintenance"};
                sendGroupMe(`${medReqType==="medical"?"🩺":medReqType==="security"?"🛡️":medReqType==="supplies"?"📦":"🔧"} REQUEST from ${role}\nLOCATION: ${medReqLocation}\nPROBLEM: ${medReqProblem}${medReqDetails?"\n"+medReqDetails:""}\nDATE/TIME: ${new Date().toLocaleString()}`,[channelMap[medReqType]||"admin","admin"]);
              }
              setMedReqType("");setMedReqLocation("");setMedReqProblem("");setMedReqDetails("");setMedReqView(false);
            }}>
            📤 Send Request — Self Assigned to {role}
          </button>
        </div>
      )}

      <button style={{display:"flex",alignItems:"center",gap:10,padding:"12px",borderRadius:12,border:"1px solid rgba(124,58,237,0.4)",background:"rgba(124,58,237,0.08)",cursor:"pointer"}} onClick={()=>setResourceView(true)}>
        <span style={{fontSize:18}}>📋</span><span style={{fontSize:13,fontWeight:700,color:"#a78bfa"}}>Request Resources</span>
      </button>
    </div>}

    {tab==="walkin"&&<div style={{display:"flex",flexDirection:"column",gap:12,padding:"0 20px"}}>
      <div style={{fontSize:13,color:"#94a3b8",background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 12px",lineHeight:1.5}}>Log a walk-in patient at the Medical Tent.</div>
      <Fld label="Chief Complaint *" value={wiComplaint} onChange={e=>setWiComplaint(e.target.value)} ph="e.g. Chest pain, heat exhaustion, laceration" large/>
      <div style={{fontSize:15,fontWeight:800,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:4}}>Patient Description</div>
      <Fld label="" value={wiDetails} onChange={e=>setWiDetails(e.target.value)} ph="Approx age, gender, conscious/unconscious, visible injuries, condition details..." multi/>
      <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)",opacity:!wiComplaint?0.5:1}} disabled={!wiComplaint} onClick={doWalkIn}>🚶 LOG WALK-IN PATIENT</button>
      {walkIns.length>0&&<>
        <div style={{fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",padding:"8px 0 4px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>Active Walk-Ins</div>
        {walkIns.map(c=>(
          <div key={c.id} style={{borderRadius:10,border:"1px solid rgba(249,115,22,0.4)",padding:"12px",background:"rgba(249,115,22,0.06)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>{c.problem}</div>
            {c.details&&<div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{c.details}</div>}
          </div>
        ))}
      </>}
    </div>}
  </div>);
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
