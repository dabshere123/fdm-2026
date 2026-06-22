const {useState,useRef,useEffect}=React;

function Bg(){return(<div style={{position:"fixed",inset:0,zIndex:0,background:"radial-gradient(ellipse at 20% 20%, #1a0a2e 0%, #0d0d1a 60%)",overflow:"hidden",pointerEvents:"none"}}><div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(255,255,255,0.012) 1px, transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none"}}/></div>);}
function BB({onClick,label="← Back"}){return(<button style={{background:"rgba(255,255,255,0.1)",border:"2px solid rgba(255,255,255,0.25)",color:"#f1f5f9",padding:"10px 18px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:800}} onClick={onClick}>{label}</button>);}
function Fld({label,value,onChange,ph,multi,required,large}){return(<div style={{display:"flex",flexDirection:"column",gap:6}}><label style={S.lbl}>{label}{required&&<span style={{color:"#ef4444",marginLeft:4}}>*</span>}</label>{multi?<textarea style={S.ta} rows={3} placeholder={ph} value={value} onChange={onChange}/>:<input style={{...S.inp,fontSize:large?18:14,padding:large?"14px":"10px 12px",fontWeight:large?700:400}} placeholder={ph} value={value} onChange={onChange}/>}</div>);}

function FieldApp(){
  const onBack=()=>{};

  // OVERNIGHT STATES
  const [overnightRecordId,setOvernightRecordId]=useState(null);
  const [overnightCheckedIn,setOvernightCheckedIn]=useState(false);
  const [overnightIncidents,setOvernightIncidents]=useState([]);
  const [overnightEncounters,setOvernightEncounters]=useState([]);
  const [overnightNarrative,setOvernightNarrative]=useState("");
  const [overnightSubmitted,setOvernightSubmitted]=useState(false);

  // STAFF / LOGIN STATES
  const [loggedIn,setLoggedIn]=useState(false);
  const [staffList,setStaffList]=useState([]);
  const [staffLoading,setStaffLoading]=useState(true);
  const [staffSearch,setStaffSearch]=useState("");

  // APP STATES
  const [roleType,setRoleType]=useState("bar_manager");
  const [name,setName]=useState("Moon Stage 1");
  const [staffName,setStaffName]=useState("");
  const [currentStaff,setCurrentStaff]=useState(null);
  const [photoCapturing,setPhotoCapturing]=useState(false); // AI photo analysis in progress
  const [photoPreview,setPhotoPreview]=useState(null); // base64 preview of captured photo
  const [view,setView]=useState("home");
  const [roleLocked,setRoleLocked]=useState(false);
  const [reqType,setReqType]=useState(null);
  const [fields,setFields]=useState({});
  const [restockItem,setRestockItem]=useState(null);
  const [restockQty,setRestockQty]=useState(null);
  const [restockOther,setRestockOther]=useState("");
  const [done,setDone]=useState(false);

  // FETCH STAFF LIST ON LOAD
  useEffect(()=>{
    fetch("/.netlify/functions/get-staff-list")
      .then(r=>r.json())
      .then(d=>{setStaffList(d.staff||[]);setStaffLoading(false);})
      .catch(()=>setStaffLoading(false));
  },[]);

  // ROLE TYPES
  const ROLE_TYPES={
    bar_manager:    {label:"Bar Manager",           requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    stage_manager:  {label:"Stage Manager",          requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    tent_manager:   {label:"Tent Manager",           requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    merch_manager:  {label:"Merch Tent Manager",     requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    greeter_sup:    {label:"Greeter Supervisor",     requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    greeter_few:    {label:"Greeter — Few",          requests:["lost_child","emergency","security"],simplified:true},
    greeter_ing_l:  {label:"Greeter — Ingersoll Left", requests:["lost_child","emergency","security"],simplified:true},
    greeter_ing_r:  {label:"Greeter — Ingersoll Right",requests:["lost_child","emergency","security"],simplified:true},
    med1:           {label:"Med Unit 1",             requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    med2:           {label:"Med Unit 2",             requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    admin1:         {label:"Admin 1",                requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    admin2:         {label:"Admin 2",                requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    financial1:     {label:"Financial 1",            requests:["lost_child","emergency","security","lost_found","general"]},
    financial2:     {label:"Financial 2",            requests:["lost_child","emergency","security","lost_found","general"]},
    financial3:     {label:"Financial 3",            requests:["lost_child","emergency","security","lost_found","general"]},
    financial4:     {label:"Financial 4",            requests:["lost_child","emergency","security","lost_found","general"]},
    marketing:      {label:"Marketing",              requests:["lost_child","emergency","security","lost_found","general"]},
    vendor:         {label:"Vendor",                 requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    misc:           {label:"MISC",                   requests:["lost_child","emergency","security","supplies","lost_found","general"]},
    overnight:      {label:"Overnight Crew",          requests:[],overnight:true},
  };

  const REQUEST_TYPES=[
    {id:"lost_child",label:"Lost Child",emoji:"🧒",color:"#f97316",desc:"Child separated from parent or guardian"},
    {id:"emergency",label:"Emergency",emoji:"🩺🔥",color:"#db2777",desc:"EMS / Medical or Fire / Life Safety"},
    {id:"security",label:"Security",emoji:"🛡️",color:"#2563eb",desc:"Fight, unruly patron, harassment, threatening behavior"},
    {id:"supplies",label:"Supplies & Maintenance",emoji:"📦🔧",color:"#10b981",desc:"Restock supplies or report a maintenance issue"},
    {id:"lost_found",label:"Lost & Found",emoji:"📦",color:"#8b5cf6",desc:"Found an item — log it here"},
    {id:"general",label:"General",emoji:"💬",color:"#64748b",desc:"Anything else — operations will respond"},
  ];

  const rt=ROLE_TYPES[roleType]||ROLE_TYPES.bar_manager;
  const visibleTypes=REQUEST_TYPES.filter(t=>rt.requests?.includes(t.id));
  const setF=(k)=>(e)=>setFields(p=>({...p,[k]:typeof e==="string"?e:e.target.value}));
  const f=(k)=>fields[k]||"";

  const canSubmit=()=>{
    if(reqType==="emergency") return fields.subtype==="medical"?(f("location")&&f("problem")):fields.subtype==="fire"?(f("location")&&f("problem")):false;
    if(reqType==="supplies") return fields.subtype==="maintenance"?(f("location")&&f("problem")):fields.subtype==="restock"?(restockItem&&restockQty&&(restockItem!=="other"||restockOther)):false;
    if(reqType==="lost_child") return f("age")&&f("last_seen")&&f("assembly_point");
    if(reqType==="security"||reqType==="general") return f("location")&&f("problem");
    if(reqType==="lost_found") return f("lf_description")&&f("lf_location")&&f("lf_now");
    return false;
  };

  // AI PHOTO CAPTURE — opens camera, sends image to server, auto-fills description
  // Staff just takes a photo — no Claude app needed, runs on our server
  const capturePhoto = async(targetField, mode) => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // opens rear camera directly
      input.onchange = async(e) => {
        const file = e.target.files[0];
        if(!file){ resolve(null); return; }
        setPhotoCapturing(true);
        try {
          // Read image as base64
          const base64 = await new Promise((res) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
          });
          setPhotoPreview('data:'+file.type+';base64,'+base64);
          // Send to our server — AI analysis happens there, not on their phone
          const resp = await fetch('/.netlify/functions/analyze-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: base64, mediaType: file.type||'image/jpeg', mode })
          });
          const data = await resp.json();
          if(data.description){
            setFields(p => ({ ...p, [targetField]: data.description }));
          }
          resolve(data.description||null);
        } catch(e) {
          console.log('Photo capture error:', e.message);
          resolve(null);
        } finally {
          setPhotoCapturing(false);
        }
      };
      input.click();
    });
  };

  const doSubmit=async()=>{
    setRoleLocked(true);
    if(reqType==="lost_child"){
      // Fire notifications BEFORE showing radio script
      fetch("/.netlify/functions/send-lost-child",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        location:fields.last_seen||name||"Festival Grounds",
        description:`${fields.description||"Child"}. ${fields.clothing||""}`.trim(),
        requestedBy:staffName||role||"Staff",
        assemblyPoint:fields.assembly_point||"First Aid",
      })}).catch(()=>{});
      // Also save to Airtable
      fetch("/.netlify/functions/submit-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        type:"lost_child",
        location:fields.last_seen||name||"Festival Grounds",
        problem:`${fields.description||"Child"}. ${fields.clothing||""}`.trim(),
        requestedBy:staffName||role||"Staff",
        phone:currentStaff?.phone||"",
      })}).catch(()=>{});
      setView("success");return;
    }
    // Lost & Found
    if(reqType==="lost_found"){
      try{
        const res=await fetch("/.netlify/functions/submit-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:f("lf_description"),location:f("lf_location"),currentLocation:f("lf_now"),foundBy:staffName||name||"Staff",hasPhoto:!!photoPreview})});
        const data=await res.json();
        if(data.success){setFields({...fields,_lfNumber:data.itemNumber});setPhotoPreview(null);setView("lf_confirm");return;}
      }catch(e){console.log("L&F error:",e.message);}
    }
    // Regular call
    const callData={
      type:reqType==="emergency"?(fields.subtype||reqType):reqType==="supplies"?(fields.subtype||reqType):reqType,
      location:f("location")||name,
      problem:reqType==="supplies"&&fields.subtype==="restock"?`Restock: ${restockItem==="other"?restockOther:restockItem} x${restockQty}`:f("problem"),
      details:f("details")||f("injuries")||"",
      requestedBy:staffName||"Staff",
      phone:"",
      nineOneOne:false,
    };
    try{
      await fetch("/.netlify/functions/submit-call",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(callData)});
    }catch(e){console.log("submit-call error:",e.message);}

    // SMS + GroupMe + Voice notifications
    const callType=callData.type;
    const emoji={medical:"🩺",fire:"🔥",security:"🛡",restock:"📦",maintenance:"🔧",general:"📋"}[callType]||"📋";
    const gmChannel={medical:"medical",fire:"medical",security:"admin",restock:"restock",maintenance:"maintenance",general:"admin"}[callType]||"admin";
    const gmHeaders={medical:"MEDICAL ALERT 🩺",fire:"LIFE SAFETY / FIRE ALERT 🔥",security:"SECURITY CONCERN 🛡",restock:"SUPPLY ALERT 📦",maintenance:"MAINTENANCE CONCERN 🔧",general:"GENERAL REQUEST 📋"};
    const gmHeader=gmHeaders[callType]||"REQUEST 📋";
    const notifMsg=`${gmHeader}\nFROM: ${callData.requestedBy}\nLOCATION: ${callData.location}\nPROBLEM: ${callData.problem}${callData.details?"\n"+callData.details:""}\nDATE/TIME: ${new Date().toLocaleString()}`;
    // GroupMe
    fetch("/.netlify/functions/send-groupme",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:notifMsg,channels:[gmChannel,"admin"]})}).catch(()=>{});
    // SMS to admin
    fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:notifMsg})}).catch(()=>{});
    // Voice for medical/fire/security only
    if(callType==="medical"||callType==="fire"||callType==="security"){
      fetch("/.netlify/functions/send-voice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:`${callType==="fire"?"Fire or life safety":"Medical"} request at Fete de Marquette. Location: ${callData.location}. ${callData.problem}. Please respond.`})}).catch(()=>{});
    }

    setDone(true);setReqType(null);setFields({});setRestockItem(null);setRestockQty(null);setRestockOther("");
    setTimeout(()=>{setDone(false);setView("home");},2500);
  };

  // LAST NAME LOGIN
  const [lastNameInput,setLastNameInput]=useState("");
  const [loginError,setLoginError]=useState("");

  if(!loggedIn) return(
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"'DM Sans',sans-serif",position:"relative"}}>
      <Bg/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:420,padding:"60px 24px"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:56,marginBottom:12}}>🎪</div>
          <div style={{fontSize:26,fontWeight:900,color:"#f1f5f9",marginBottom:4}}>Fête de Marquette</div>
          <div style={{fontSize:13,color:"#f59e0b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Worker App 2026</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <label style={{fontSize:13,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Enter your last name</label>
            <input
              style={{background:"rgba(255,255,255,0.08)",border:"2px solid rgba(255,255,255,0.15)",borderRadius:14,padding:"18px 20px",color:"#f1f5f9",fontSize:20,width:"100%",fontFamily:"inherit",outline:"none",textAlign:"center",fontWeight:700,letterSpacing:"0.05em"}}
              placeholder="Last name..."
              value={staffSearch}
              onChange={e=>{setStaffSearch(e.target.value);setLoginError("");}}
              onKeyDown={e=>{
                if(e.key==="Enter"){
                  const matches=staffList.filter(s=>s.name.toLowerCase().split(" ").pop()===staffSearch.toLowerCase().trim());
                  if(matches.length===1){
                    const s=matches[0];
                    const role=s.role.toLowerCase();
                    if(role.includes("admin")){window.location.href="/hub";return;}
                    if(role.includes("med unit 1")||role.includes("med 1")){window.location.href="/hub?role=med1";return;}
                    if(role.includes("med unit 2")||role.includes("med 2")){window.location.href="/hub?role=med2";return;}
                    if(role.includes("overnight")||role.includes("cleaning")||role.includes("night crew")){
                      setStaffName(s.name);setRoleType("overnight");setName(s.location||"Festival Grounds");setLoggedIn(true);return;
                    }
                    setStaffName(s.name);
                    const matched=Object.keys(ROLE_TYPES).find(k=>ROLE_TYPES[k].label.toLowerCase()===s.role.toLowerCase().trim());
                    setRoleType(matched||"bar_manager");
                    setName(s.location||"Moon Stage 1");
                    setLoggedIn(true);
                  } else if(matches.length===0){
                    setLoginError("No match found. Check spelling or register below.");
                  }
                }
              }}
            />
          </div>

          {/* MATCHES */}
          {staffSearch.length>=2&&(()=>{
            const matches=staffList.filter(s=>s.name.toLowerCase().split(" ").pop().startsWith(staffSearch.toLowerCase().trim()));
            if(matches.length===0) return <div style={{fontSize:14,color:"#ef4444",textAlign:"center",padding:"8px"}}>No match found. Check spelling or register below.</div>;
            return matches.map(s=>(
              <button key={s.id} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",borderRadius:14,border:"2px solid rgba(245,158,11,0.4)",background:"rgba(245,158,11,0.08)",cursor:"pointer",textAlign:"left",width:"100%"}}
                onClick={()=>{
                  const role=s.role.toLowerCase().trim();
                  if(role==="a1"||role==="a2"||role.includes("admin")){window.location.href="/hub";return;}
                  if(role==="m1"||role.includes("med unit 1")||role.includes("med 1")){window.location.href="/hub?role=med1";return;}
                  if(role==="m2"||role.includes("med unit 2")||role.includes("med 2")){window.location.href="/hub?role=med2";return;}
                  if(role==="oc1"||role==="oc2"||role==="oc3"||role==="oc4"||role.includes("overnight")){
                    setStaffName(s.name);setRoleType("overnight");setName(s.location||"Festival Grounds");setLoggedIn(true);return;
                  }
                  setStaffName(s.name);
                  const matched=Object.keys(ROLE_TYPES).find(k=>ROLE_TYPES[k].label.toLowerCase()===s.role.toLowerCase().trim());
                  setRoleType(matched||"bar_manager");
                  setName(s.location||"Moon Stage 1");
                  setLoggedIn(true);
                }}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#1a1a00",flexShrink:0}}>
                  {s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:"#f1f5f9"}}>{s.name}</div>
                  <div style={{fontSize:13,color:"#94a3b8"}}>{s.role} · {s.location||""}</div>
                </div>
              </button>
            ));
          })()}

          {loginError&&<div style={{fontSize:14,color:"#ef4444",textAlign:"center"}}>{loginError}</div>}
          <a href="/register" style={{textAlign:"center",fontSize:13,color:"#475569",marginTop:4,textDecoration:"none"}}>Not registered? <span style={{color:"#f59e0b",fontWeight:700}}>Register here →</span></a>
        </div>
      </div>
    </div>
  );

  // OVERNIGHT SUB-VIEWS (must be before overnight crew check)
  if(rt?.overnight&&view==="overnight_encounter") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Log Public Encounter</span><BB onClick={()=>setView("home")}/></div>
      <div style={S.cWrap}>
        <Fld label="Time" value={f("enc_time")} onChange={setF("enc_time")} ph={new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} required/>
        <Fld label="Location" value={f("enc_location")} onChange={setF("enc_location")} ph="e.g. Near Moon Stage" required/>
        <label style={S.lbl}>Type of Encounter *</label>
        <select style={S.sel} value={f("enc_type")||""} onChange={setF("enc_type")}>
          <option value="">Select...</option>
          <option>Fire/EMS Response</option>
          <option>Police Called</option>
          <option>Police Drive-By</option>
          <option>Medical Emergency</option>
          <option>Other</option>
        </select>
        <Fld label="Description *" value={f("enc_description")} onChange={setF("enc_description")} ph="What happened?" required multi/>
        <Fld label="Outcome / Disposition" value={f("enc_outcome")} onChange={setF("enc_outcome")} ph="e.g. Fire cleared, EMS transported" multi/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)",opacity:(!f("enc_time")||!f("enc_location")||!f("enc_type")||!f("enc_description"))?0.5:1}}
          disabled={!f("enc_time")||!f("enc_location")||!f("enc_type")||!f("enc_description")}
          onClick={async()=>{
            setOvernightEncounters(p=>[...p,{time:f("enc_time"),type:f("enc_type"),location:f("enc_location"),description:f("enc_description"),outcome:f("enc_outcome")||""}]);
            // Save to Airtable Incidents table
            try{
              await fetch("/.netlify/functions/submit-incident",{method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                  type:"public_encounter",
                  location:f("enc_location"),
                  problem:`${f("enc_type")}: ${f("enc_description")}`,
                  requestedBy:staffName||"Overnight Crew",
                  respondingUnit:"Overnight Crew",
                  disposition:f("enc_outcome")||"Logged",
                  notes:`Time: ${f("enc_time")} · Public Encounter (Fire/EMS/Police)`,
                  openedAt:new Date().toISOString(),
                })
              });
            }catch(e){console.log("Encounter save error:",e.message);}
            setFields({});setView("home");
          }}>✅ Save Encounter</button>
      </div>
    </div></div>
  );

  if(rt?.overnight&&view==="overnight_incident") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Log Incident</span><BB onClick={()=>setView("home")}/></div>
      <div style={S.cWrap}>
        <Fld label="Time" value={f("oi_time")} onChange={setF("oi_time")} ph={new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} required/>
        <Fld label="Location" value={f("oi_location")} onChange={setF("oi_location")} ph="e.g. Near Moon Stage" required/>
        <label style={S.lbl}>Type of Incident</label>
        <select style={S.sel} value={f("oi_type")||""} onChange={setF("oi_type")}>
          <option value="">Select...</option>
          <option>Suspicious Activity</option>
          <option>Vandalism</option>
          <option>Trespasser</option>
          <option>Equipment Issue</option>
          <option>Weather Damage</option>
          <option>All Clear Check</option>
          <option>Other</option>
        </select>
        <Fld label="Description *" value={f("oi_description")} onChange={setF("oi_description")} ph="What happened?" required multi/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)"}}
          onClick={async()=>{
            const time=f("oi_time")||new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
            const text=`[${f("oi_type")||"Incident"}] ${f("oi_location")} — ${f("oi_description")}`;
            setOvernightIncidents(p=>[...p,{time,text}]);
            // Save to Airtable Incidents table immediately
            try{
              await fetch("/.netlify/functions/submit-incident",{method:"POST",headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                  type:"overnight_"+((f("oi_type")||"incident").toLowerCase().replace(/\s+/g,"_")),
                  location:f("oi_location"),
                  problem:f("oi_description"),
                  requestedBy:staffName||"Overnight Crew",
                  respondingUnit:"Overnight Crew",
                  disposition:"Logged by Overnight Crew",
                  notes:`Time: ${time} · Overnight Incident Report`,
                  openedAt:new Date().toISOString(),
                })
              });
            }catch(e){console.log("Incident save error:",e.message);}
            setFields({});setView("home");
          }}>✅ Save Incident</button>
      </div>
    </div></div>
  );

  if(rt?.overnight&&view==="request"&&reqType==="lost_found") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>📦 Log Lost & Found</span><BB onClick={()=>{setView("home");setReqType(null);setFields({});}}/></div>
      <div style={S.cWrap}>
        <Fld label="Description of Item *" value={f("lf_description")} onChange={setF("lf_description")} ph="e.g. Black wallet, keys, phone" required large/>
        <Fld label="Where Found *" value={f("lf_location")} onChange={setF("lf_location")} ph="e.g. Near Moon Stage entrance" required large/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",opacity:(!f("lf_description")||!f("lf_location"))?0.5:1}}
          disabled={!f("lf_description")||!f("lf_location")}
          onClick={async()=>{
            try{
              const res=await fetch("/.netlify/functions/submit-lost-found",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:f("lf_description"),location:f("lf_location"),foundBy:"Overnight Crew"})});
              const data=await res.json();
              if(data.success){setFields({...fields,_lfNumber:data.itemNumber});setView("lf_overnight_confirm");}
            }catch(e){console.log(e);}
          }}>📦 Log Item</button>
      </div>
    </div></div>
  );

  if(rt?.overnight&&view==="lf_overnight_confirm") return(
    <div style={S.root}><Bg/><div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,zIndex:10,background:"#0d0d1a",padding:"32px"}}>
      <div style={{fontSize:72}}>📦</div>
      <div style={{fontSize:26,fontWeight:900,color:"#8b5cf6"}}>Item Logged!</div>
      <div style={{background:"rgba(139,92,246,0.12)",border:"2px solid rgba(139,92,246,0.5)",borderRadius:14,padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:13,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",fontWeight:700}}>Item Number</div>
        <div style={{fontSize:36,fontWeight:900,color:"#a78bfa"}}>{fields._lfNumber}</div>
      </div>
      <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",textAlign:"center"}}>Please place the item in the Lost & Found box. Operations will come and take possession of it shortly.</div>
      <button style={{...S.sendBtn,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",width:"100%",maxWidth:320}} onClick={()=>{setView("home");setReqType(null);setFields({});}}>Done</button>
    </div></div>
  );

  // OVERNIGHT CREW VIEW
  if(rt?.overnight) return(
    <div style={{...S.root,position:"relative"}}>
      <Bg/>
      <div style={{position:"relative",zIndex:2,width:"100%",maxWidth:768,minHeight:"100vh",display:"flex",flexDirection:"column"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 4px"}}>
        <div><div style={{fontSize:20,fontWeight:900,color:"#fff"}}>Fête de Marquette 2026</div><div style={{fontSize:12,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2,fontWeight:700}}>Overnight Crew</div></div>
      </div>
      <div style={{padding:"8px 20px",fontSize:15,fontWeight:700,color:"#94a3b8"}}>{staffName||"Crew Member"}</div>
      <div style={{display:"flex",flexDirection:"column",gap:12,padding:"12px 20px 32px"}}>
        {!overnightCheckedIn?(
          <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f59e0b,#d97706)",fontSize:18,padding:"20px"}}
            onClick={async()=>{
              try{
                const res=await fetch("/.netlify/functions/overnight-checkin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({crewMember:staffName,eventDay:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})})});
                const data=await res.json();
                if(data.success){setOvernightRecordId(data.id);setOvernightCheckedIn(true);}
                // Alert admin on check-in
                fetch("/.netlify/functions/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:"+16082289692",message:`🌙 OVERNIGHT CREW CHECK-IN\n${staffName||"Crew Member"} has arrived at Fest Grounds.\nTIME: ${new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}`})}).catch(()=>{});
              }catch(e){console.log(e);}
            }}>
            🌙 I'M HERE — Check In
          </button>
        ):(
          <>
            <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:12,padding:"12px 16px",fontSize:14,color:"#10b981",fontWeight:700}}>✅ Checked in — Admin has been notified. Good luck tonight!</div>

            <div style={{fontSize:13,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Incident Log</div>
            {overnightIncidents.map((inc,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px",fontSize:13,color:"#e2e8f0"}}>
                <div style={{fontWeight:700,color:"#f59e0b"}}>{inc.time}</div>
                <div>{inc.text}</div>
              </div>
            ))}
            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)",padding:"14px",fontSize:15}}
              onClick={()=>setView("overnight_incident")}>
              ➕ Log Incident
            </button>

            <div style={{fontSize:13,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:4}}>Public Encounters (Fire/EMS/Police)</div>
            {overnightEncounters.map((enc,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px",fontSize:13,color:"#e2e8f0"}}>
                <div style={{fontWeight:700,color:"#f97316"}}>{enc.time} · {enc.type}</div>
                <div style={{color:"#94a3b8"}}>{enc.location}</div>
                <div>{enc.description}</div>
                {enc.outcome&&<div style={{fontSize:12,color:"#64748b",marginTop:4}}>Outcome: {enc.outcome}</div>}
              </div>
            ))}
            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#dc2626,#991b1b)",padding:"12px",fontSize:14}}
              onClick={()=>setView("overnight_encounter")}>
              ➕ Log Public Encounter (Fire/EMS/Police)
            </button>

            <button style={{...S.sendBtn,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",padding:"12px",fontSize:14}}
              onClick={()=>{setReqType("lost_found");setView("request");}}>
              📦 Log Lost & Found Item
            </button>

            <div style={{fontSize:13,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:8}}>Shift Narrative</div>
            <textarea style={{...S.ta,minHeight:100}} placeholder="Overall summary of the night..." value={overnightNarrative} onChange={e=>setOvernightNarrative(e.target.value)}/>

            {!overnightSubmitted?(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <button style={{...S.sendBtn,background:"linear-gradient(135deg,#10b981,#059669)",padding:"16px",fontSize:16,fontWeight:900}}
                  onClick={async()=>{
                    const allIncidents=[
                      ...overnightIncidents.map(i=>`${i.time}: ${i.text}`),
                      ...overnightEncounters.map(e=>`[PUBLIC ENCOUNTER] ${e.time} · ${e.type} · ${e.location}: ${e.description}${e.outcome?" — "+e.outcome:""}`)
                    ].join("\n");
                    try{
                      await fetch("/.netlify/functions/submit-overnight-report",{method:"POST",headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({id:overnightRecordId,crewMember:staffName,incidents:allIncidents,narrative:overnightNarrative,eventDay:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})})});
                      setOvernightSubmitted(true);
                    }catch(e){console.log(e);}
                  }}>
                  📋 Submit End of Night Report
                </button>
                <button style={{...S.sendBtn,background:"linear-gradient(135deg,#ef4444,#b91c1c)",padding:"14px",fontSize:15,fontWeight:900}}
                  onClick={async()=>{
                    const allIncidents=[
                      ...overnightIncidents.map(i=>`${i.time}: ${i.text}`),
                      ...overnightEncounters.map(e=>`[PUBLIC ENCOUNTER] ${e.time} · ${e.type} · ${e.location}: ${e.description}${e.outcome?" — "+e.outcome:""}`)
                    ].join("\n");
                    try{
                      await fetch("/.netlify/functions/submit-overnight-report",{method:"POST",headers:{"Content-Type":"application/json"},
                        body:JSON.stringify({id:overnightRecordId,crewMember:staffName,incidents:allIncidents,narrative:overnightNarrative,eventDay:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),checkOut:true})});
                      setOvernightSubmitted(true);
                    }catch(e){console.log(e);}
                  }}>
                  🚪 Submit End of Night Report — Check Out
                </button>
              </div>
            ):(
              <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:12,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:8}}>☀️</div>
                <div style={{fontSize:18,fontWeight:900,color:"#10b981"}}>Report Submitted!</div>
                <div style={{fontSize:13,color:"#64748b",marginTop:4}}>Admin has been notified. Great work tonight!</div>
              </div>
            )}
          </>
        )}
      </div>
    </div></div>
  );

  // OVERNIGHT ENCOUNTER FORM (handled above for overnight crew)
  if(!rt?.overnight&&view==="overnight_encounter") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Log Public Encounter</span><BB onClick={()=>setView("home")}/></div>
      <div style={S.cWrap}>
        <Fld label="Time" value={f("enc_time")} onChange={setF("enc_time")} ph={new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} required/>
        <Fld label="Location" value={f("enc_location")} onChange={setF("enc_location")} ph="e.g. Near Moon Stage" required/>
        <label style={S.lbl}>Type of Encounter *</label>
        <select style={S.sel} value={f("enc_type")||""} onChange={setF("enc_type")}>
          <option value="">Select...</option>
          <option>Fire/EMS Response</option>
          <option>Police Called</option>
          <option>Police Drive-By</option>
          <option>Medical Emergency</option>
          <option>Other</option>
        </select>
        <Fld label="Description *" value={f("enc_description")} onChange={setF("enc_description")} ph="What happened?" required multi/>
        <Fld label="Outcome / Disposition" value={f("enc_outcome")} onChange={setF("enc_outcome")} ph="e.g. Fire cleared, EMS transported, Police took report" multi/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)",opacity:(!f("enc_time")||!f("enc_location")||!f("enc_type")||!f("enc_description"))?0.5:1}}
          disabled={!f("enc_time")||!f("enc_location")||!f("enc_type")||!f("enc_description")}
          onClick={()=>{
            setOvernightEncounters(p=>[...p,{time:f("enc_time"),type:f("enc_type"),location:f("enc_location"),description:f("enc_description"),outcome:f("enc_outcome")||""}]);
            setFields({});setView("home");
          }}>
          ✅ Save Encounter
        </button>
      </div>
    </div></div>
  );

  // OVERNIGHT INCIDENT FORM (handled above for overnight crew)
  if(!rt?.overnight&&view==="overnight_incident") return(
    <div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>Log Incident</span><BB onClick={()=>setView("home")}/></div>
      <div style={S.cWrap}>
        <Fld label="Time" value={f("oi_time")} onChange={setF("oi_time")} ph={new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})} required/>
        <Fld label="Location" value={f("oi_location")} onChange={setF("oi_location")} ph="e.g. Near Moon Stage" required/>
        <label style={S.lbl}>Type of Incident</label>
        <select style={S.sel} value={f("oi_type")||""} onChange={setF("oi_type")}>
          <option value="">Select...</option>
          <option>Suspicious Activity</option>
          <option>Vandalism</option>
          <option>Trespasser</option>
          <option>Equipment Issue</option>
          <option>Weather Damage</option>
          <option>All Clear Check</option>
          <option>Other</option>
        </select>
        <Fld label="Description" value={f("oi_description")} onChange={setF("oi_description")} ph="What happened?" required multi/>
        <button style={{...S.sendBtn,background:"linear-gradient(135deg,#f97316,#ea580c)"}}
          onClick={()=>{
            const time=f("oi_time")||new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
            const text=`[${f("oi_type")||"Incident"}] ${f("oi_location")} — ${f("oi_description")}`;
            setOvernightIncidents(p=>[...p,{time,text}]);
            setFields({});setView("home");
          }}>
          ✅ Save Incident
        </button>
      </div>
    </div></div>
  );

  // DONE SCREEN
  if(done) return(<div style={S.root}><Bg/><div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,zIndex:10,background:"#0d0d1a"}}>
    <div style={{fontSize:80}}>✅</div><div style={{fontSize:26,fontWeight:900,color:"#10b981"}}>Request Sent</div><div style={{fontSize:15,color:"#64748b"}}>Operations has been notified</div>
  </div></div>);

  // LOST & FOUND CONFIRMATION
  if(view==="lf_confirm") return(<div style={S.root}><Bg/><div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,zIndex:10,background:"#0d0d1a",padding:"32px"}}>
    <div style={{fontSize:72}}>📦</div>
    <div style={{fontSize:26,fontWeight:900,color:"#8b5cf6"}}>Item Logged!</div>
    <div style={{background:"rgba(139,92,246,0.12)",border:"2px solid rgba(139,92,246,0.5)",borderRadius:14,padding:"20px 24px",textAlign:"center",width:"100%",maxWidth:360}}>
      <div style={{fontSize:13,color:"#94a3b8",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Item Number</div>
      <div style={{fontSize:36,fontWeight:900,color:"#a78bfa"}}>{fields._lfNumber}</div>
    </div>
    <div style={{fontSize:16,fontWeight:700,color:"#f1f5f9",textAlign:"center"}}>Please place this item in the Lost &amp; Found box.</div>
    <div style={{background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.3)",borderRadius:12,padding:"14px 16px",textAlign:"center",width:"100%",maxWidth:320}}>
      <div style={{fontSize:14,color:"#c4b5fd",lineHeight:1.6}}>Operations has been notified and will come to take possession of the item shortly. Write the item number on a tag and attach it to the item before placing it in the box.</div>
    </div>
    <div style={{fontSize:13,color:"#64748b",textAlign:"center"}}>📱 Admin notified via SMS</div>
    <button style={{...S.sendBtn,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)",width:"100%",maxWidth:320,marginTop:8}} onClick={()=>{setView("home");setReqType(null);setFields({});}}>Done</button>
  </div></div>);

  // REQUEST VIEW
  if(view==="request"){
    const rtData=REQUEST_TYPES.find(x=>x.id===reqType);
    return(<div style={S.root}><Bg/><div style={S.panel}>
      <div style={S.panelHd}><span style={S.panelTitle}>{rtData?.emoji} {rtData?.label}</span><BB onClick={()=>{setView("home");setReqType(null);setFields({});setRestockItem(null);setRestockQty(null);}}/></div>
      <div style={S.cWrap}>
        <div style={{fontSize:14,color:"#f59e0b",fontWeight:700}}>📍 {name}{staffName?` · ${staffName}`:""}</div>

        {reqType==="lost_child"&&<>
          <div style={{fontSize:15,color:"#1a1a00",background:"#fde047",border:"2px solid #ca8a04",borderRadius:10,padding:"14px 16px",lineHeight:1.7,fontWeight:900}}>📋 Gather info from parent/guardian first, then enter below.</div>
          <Fld label="Child's Age *" value={f("age")} onChange={setF("age")} ph="e.g. 6" required large/>
          <Fld label="Gender" value={f("gender")} onChange={setF("gender")} ph="e.g. Girl, Boy"/>
          <Fld label="Hair Color / Style" value={f("hair")} onChange={setF("hair")} ph="e.g. Brown pigtails"/>
          <Fld label="Top / Shirt" value={f("top")} onChange={setF("top")} ph="e.g. Red shirt"/>
          <Fld label="Bottom / Pants" value={f("bottom")} onChange={setF("bottom")} ph="e.g. Blue shorts"/>
          <Fld label="Last Seen Location *" value={f("last_seen")} onChange={setF("last_seen")} ph="e.g. Near Moon Stage 1 bar" required large/>
          <Fld label="Last Seen Time" value={f("last_seen_time")} onChange={setF("last_seen_time")} ph="e.g. 5:30 PM"/>
          <Fld label="Meet Reporting Party / Parent *" value={f("assembly_point")} onChange={setF("assembly_point")} ph="e.g. First Aid" required large/>
          <Fld label="Parent / Guardian Name" value={f("parent_name")} onChange={setF("parent_name")} ph="e.g. Sarah Johnson"/>
          <Fld label="Parent / Guardian Phone" value={f("parent_phone")} onChange={setF("parent_phone")} ph="e.g. 608-xxx-xxxx"/>
          <Fld label="Any Other Details" value={f("comments")} onChange={setF("comments")} ph="e.g. Child may be scared" multi/>

        </>}

        {reqType==="emergency"&&<>
          {!fields.subtype&&<><label style={S.lbl}>What type of emergency?</label>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{id:"medical",label:"EMS / Medical",emoji:"🩺",color:"#db2777",desc:"Injury, illness, unresponsive, heat exhaustion, fall, trauma"},{id:"fire",label:"Fire / Life Safety",emoji:"🔥",color:"#dc2626",desc:"Small fire, smoke, cooking hazard, trip hazard, unsafe condition"}].map(et=><button key={et.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"18px",borderRadius:14,border:`2px solid ${et.color}`,background:`${et.color}18`,cursor:"pointer",textAlign:"left"}} onClick={()=>setFields(p=>({...p,subtype:et.id}))}>
                <span style={{fontSize:28,minWidth:36}}>{et.emoji}</span>
                <div><div style={{fontSize:18,fontWeight:800,color:"#f1f5f9"}}>{et.label}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{et.desc}</div></div>
              </button>)}
            </div></>}
          {fields.subtype==="medical"&&<>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:"#db2777"}}>🩺 EMS / Medical</span><button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}} onClick={()=>setFields(p=>({...p,subtype:null}))}>Change</button></div>
            <Fld label="Location *" value={f("location")} onChange={setF("location")} ph="e.g. Near Moon Stage 1 bar" required large/>
            <Fld label="What's the Problem *" value={f("problem")} onChange={setF("problem")} ph="e.g. Person unresponsive" required/>
            <Fld label="Any Other Details" value={f("details")} onChange={setF("details")} ph="e.g. Male, 50s, conscious but confused" multi/>
          </>}
          {fields.subtype==="fire"&&<>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:"#dc2626"}}>🔥 Fire / Life Safety</span><button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}} onClick={()=>setFields(p=>({...p,subtype:null}))}>Change</button></div>
            <div style={{fontSize:13,color:"#fca5a5",background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.3)",borderRadius:8,padding:"10px 12px",fontWeight:600}}>⚠️ Large fire — call 911 immediately and evacuate first.</div>
            <Fld label="Exact Location *" value={f("location")} onChange={setF("location")} ph="e.g. Sun Stage vendor booth" required large/>
            <Fld label="What's Happening *" value={f("problem")} onChange={setF("problem")} ph="e.g. Small fire, trip hazard" required/>
            <Fld label="Any Injuries?" value={f("injuries")} onChange={setF("injuries")} ph="e.g. None, or describe"/>
          </>}
        </>}

        {reqType==="security"&&<>
          <Fld label="Location *" value={f("location")} onChange={setF("location")} ph="e.g. Near Lafayette bar entrance" required large/>
          <Fld label="What's the Situation *" value={f("problem")} onChange={setF("problem")} ph="e.g. Altercation between two patrons" required/>
          <Fld label="Meet Reporting Party" value={f("details")} onChange={setF("details")} ph="Where should security meet you?" multi/>
        </>}

        {reqType==="supplies"&&<>
          {!fields.subtype&&<><label style={S.lbl}>What do you need?</label>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button style={{display:"flex",alignItems:"center",gap:14,padding:"18px",borderRadius:14,border:"2px solid rgba(146,64,14,0.6)",background:"rgba(92,40,4,0.15)",cursor:"pointer"}} onClick={()=>setFields(p=>({...p,subtype:"restock"}))}>
                <span style={{fontSize:28,minWidth:36}}>📦</span><div><div style={{fontSize:18,fontWeight:800,color:"#f1f5f9"}}>Restock / Supplies</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Ice, cup sleeves, towels, water</div></div>
              </button>
              <button style={{display:"flex",alignItems:"center",gap:14,padding:"18px",borderRadius:14,border:"2px solid rgba(22,101,52,0.6)",background:"rgba(20,83,45,0.15)",cursor:"pointer"}} onClick={()=>setFields(p=>({...p,subtype:"maintenance"}))}>
                <span style={{fontSize:28,minWidth:36}}>🔧</span><div><div style={{fontSize:18,fontWeight:800,color:"#f1f5f9"}}>Maintenance</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Equipment broken, structural, electrical</div></div>
              </button>
            </div></>}
          {fields.subtype==="restock"&&<>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:"#92400e"}}>📦 Restock</span><button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}} onClick={()=>setFields(p=>({...p,subtype:null}))}>Change</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[{id:"ice",label:"Ice",emoji:"🧊"},{id:"beer_cups",label:"Beer Cup Sleeves",emoji:"🍺"},{id:"wine_cups",label:"Wine Cup Sleeves",emoji:"🍷"},{id:"paper_towels",label:"Paper Towels",emoji:"🧻"},{id:"bar_towels",label:"BAR TOWELS",emoji:""},{id:"water",label:"Bottled Water (24-pack)",emoji:"💧"},{id:"other",label:"Other",emoji:"➕"}].map(item=><button key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"16px",borderRadius:12,border:`2px solid ${restockItem===item.id?"#92400e":"rgba(255,255,255,0.15)"}`,background:restockItem===item.id?"rgba(146,64,14,0.2)":"rgba(255,255,255,0.04)",cursor:"pointer",textAlign:"left"}} onClick={()=>setRestockItem(item.id)}>
                {item.emoji&&<span style={{fontSize:24,minWidth:30}}>{item.emoji}</span>}
                <span style={{fontSize:15,fontWeight:item.id==="bar_towels"?900:600,color:"#f1f5f9"}}>{item.label}</span>
              </button>)}
            </div>
            {restockItem==="other"&&<input style={S.inp} placeholder="What do you need?" value={restockOther} onChange={e=>setRestockOther(e.target.value)}/>}
            {restockItem&&<><label style={S.lbl}>How many?</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                {["1","2","3","4","5","6","7","8","9","10+"].map(q=><button key={q} style={{padding:"14px 0",borderRadius:10,border:`2px solid ${restockQty===q?"#92400e":"rgba(255,255,255,0.15)"}`,background:restockQty===q?"rgba(146,64,14,0.2)":"rgba(255,255,255,0.04)",cursor:"pointer",fontSize:16,fontWeight:700,color:"#f1f5f9",textAlign:"center"}} onClick={()=>setRestockQty(q)}>{q}</button>)}
              </div>
              {restockQty==="10+"&&<input style={{...S.inp,border:"2px solid #92400e"}} placeholder="Enter exact quantity" autoFocus onChange={e=>setRestockQty(e.target.value||"10+")}/>}
            </>}
          </>}
          {fields.subtype==="maintenance"&&<>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:"#166534"}}>🔧 Maintenance</span><button style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}} onClick={()=>setFields(p=>({...p,subtype:null}))}>Change</button></div>
            <Fld label="Location *" value={f("location")} onChange={setF("location")} ph="e.g. Moon Stage 2 bar area" required large/>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1}}><Fld label="What's the Problem *" value={f("problem")} onChange={setF("problem")} ph="e.g. Generator tripped, no power" required/></div>
              <button type="button" style={{padding:"10px 12px",borderRadius:10,border:"1px solid rgba(5,150,105,0.5)",background:"rgba(5,150,105,0.1)",color:"#6ee7b7",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,marginTop:18}} onClick={()=>capturePhoto("problem","maintenance")}>
                {photoCapturing?"⏳...":"📷"}
              </button>
            </div>
            <Fld label="Any Other Details" value={f("details")} onChange={setF("details")} ph="Optional" multi/>
          </>}
        </>}

        {reqType==="lost_found"&&<>
          <div style={{fontSize:13,color:"#8b5cf6",fontWeight:700,background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:8,padding:"10px 12px"}}>📦 Take a photo — description auto-fills. Then enter the two locations.</div>

          {/* Photo + Description */}
          <div>
            <div style={{fontSize:11,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Item Description *</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button type="button" style={{padding:"12px 14px",borderRadius:10,border:"2px solid rgba(139,92,246,0.5)",background:"rgba(139,92,246,0.12)",color:"#c4b5fd",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:6}} onClick={()=>capturePhoto("lf_description","lost_found")}>
                {photoCapturing?<>⏳ <span>Analyzing...</span></>:<>📷 <span>Photo</span></>}
              </button>
              <input style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none"}} placeholder="Or type description..." value={f("lf_description")} onChange={setF("lf_description")}/>
            </div>
            {photoPreview&&<div style={{marginTop:8,borderRadius:10,overflow:"hidden",border:"1px solid rgba(139,92,246,0.3)",maxHeight:100}}><img src={photoPreview} style={{width:"100%",objectFit:"cover",maxHeight:100}}/></div>}
          </div>

          <Fld label="Where was it found? *" value={f("lf_location")} onChange={setF("lf_location")} ph="e.g. Under chair near Lafayette Bar" required large/>
          <Fld label="Where is it now? *" value={f("lf_now")} onChange={setF("lf_now")} ph="e.g. Behind my bar counter, with stage manager" required large/>
        </>}

        {reqType==="general"&&<>
          <Fld label="Location *" value={f("location")} onChange={setF("location")} ph="e.g. Lafayette bar" required large/>
          <Fld label="What do you need? *" value={f("problem")} onChange={setF("problem")} ph="Describe what's needed" required/>
          <Fld label="Any Other Details" value={f("details")} onChange={setF("details")} ph="Optional" multi/>
        </>}

        <button style={{...S.sendBtn,background:`linear-gradient(135deg,${REQUEST_TYPES.find(x=>x.id===reqType)?.color||"#7c3aed"},${REQUEST_TYPES.find(x=>x.id===reqType)?.color||"#4f46e5"}99)`,opacity:!canSubmit()?0.5:1}} onClick={doSubmit} disabled={!canSubmit()}>
          {reqType==="lost_child"?"🧒 SUBMIT — ALERT ALL STAFF":reqType==="emergency"&&!fields.subtype?"Select Emergency Type Above":reqType==="supplies"&&!fields.subtype?"Select Type Above":"📤 SUBMIT REQUEST"}
        </button>
      </div>
    </div></div>);
  }

  // MAIN HOME
  return(<div style={S.root}><Bg/><div style={S.panel}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 4px"}}>
      <div><div style={{fontSize:20,fontWeight:900,color:"#fff"}}>Fête de Marquette 2026</div><div style={{fontSize:12,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2,fontWeight:700}}>Worker App</div></div>
      <button style={{...S.backBtn,padding:"8px 10px",fontSize:12}} onClick={()=>setLoggedIn(false)}>← Switch User</button>
    </div>
    {staffName&&(
      <div style={{margin:"8px 20px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#f59e0b,#d97706)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#1a1a00",flexShrink:0}}>{staffName.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
        <div><div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{staffName}</div><div style={{fontSize:12,color:"#64748b"}}>{ROLE_TYPES[roleType]?.label} · {name}</div></div>
      </div>
    )}
    <div style={{display:"flex",flexDirection:"column",gap:10,padding:"8px 20px"}}>
      {visibleTypes.map(t=>(
        <button key={t.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"18px",borderRadius:14,border:`2px solid ${t.color}`,background:`${t.color}18`,cursor:"pointer",textAlign:"left"}} onClick={()=>{setReqType(t.id);setFields({});setView("request");}}>
          <span style={{fontSize:28,minWidth:36,flexShrink:0,marginTop:2}}>{t.emoji}</span>
          <div><div style={{fontSize:18,fontWeight:800,color:"#f1f5f9",display:"block",marginBottom:3}}>{t.label}</div><div style={{fontSize:12,color:"#94a3b8",lineHeight:1.4,display:"block"}}>{t.desc}</div></div>
        </button>
      ))}
    </div>
    <div style={{textAlign:"center",padding:"8px 20px 24px",fontSize:11,color:"#334155",marginTop:8}}>Fête de Marquette Operations</div>
  </div></div>);
}

const S={
  root:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",background:"#0d0d1a",fontFamily:"'DM Sans',sans-serif",overflowX:"hidden"},
  panel:{position:"relative",zIndex:1,width:"100%",maxWidth:768,minHeight:"100vh",display:"flex",flexDirection:"column"},
  panelHd:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"16px 20px 8px"},
  backBtn:{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#f1f5f9",padding:"10px 18px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600},
  panelTitle:{flex:1,fontSize:17,fontWeight:700,color:"#f1f5f9"},
  cWrap:{display:"flex",flexDirection:"column",gap:14,padding:"8px 20px 32px"},
  lbl:{fontSize:11,color:"#64748b",letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700},
  inp:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
  sel:{background:"#1e293b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,width:"100%",boxSizing:"border-box"},
  ta:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 12px",color:"#f1f5f9",fontSize:14,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"},
  sendBtn:{background:"linear-gradient(135deg,#7c3aed,#4f46e5)",border:"none",borderRadius:14,padding:"16px",color:"#fff",fontSize:18,fontWeight:800,cursor:"pointer"},
  bigAckBtn:{background:"rgba(0,0,0,0.3)",border:"2px solid rgba(255,255,255,0.7)",borderRadius:14,padding:"18px",color:"#fff",fontSize:18,fontWeight:900,cursor:"pointer",width:"100%",maxWidth:380},
  persistAlert:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:16,padding:"32px 24px",textAlign:"center",position:"relative",zIndex:1,width:"100%",maxWidth:768,boxSizing:"border-box"},
};
