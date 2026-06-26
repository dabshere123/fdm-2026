const {useState,useEffect,useRef}=React;

const API='/.netlify/functions';

const CHANNEL_GROUPS=[
  {id:'general',label:'General',channels:[
    {id:'AllStaff',label:'All Staff',emoji:'📢'},
    {id:'Hospitality',label:'Hospitality',emoji:'🎪'},
  ]},
  {id:'bars',label:'Bars',channels:[
    {id:'Bars',label:'All Bars',emoji:'🍺'},
    {id:'MoonBar',label:'Moon Bar',emoji:'🌙'},
    {id:'SunBarL',label:'Sun Bar Left',emoji:'☀️'},
    {id:'SunBarR',label:'Sun Bar Right',emoji:'☀️'},
    {id:'LafBar',label:'Lafayette Bar',emoji:'🎸'},
    {id:'LagBar',label:'Lagniappe Bar',emoji:'🎺'},
    {id:'FamilyBar',label:'Family Bar',emoji:'👨‍👩‍👧'},
    {id:'CabBar',label:'Cabaret Bar',emoji:'🎭'},
    {id:'EverythingBar',label:'EEC',emoji:'☕'},
  ]},
  {id:'stages',label:'Stages',channels:[
    {id:'MoonST',label:'Moon Stage',emoji:'🌙'},
    {id:'SunST',label:'Sun Stage',emoji:'☀️'},
    {id:'LafST',label:'Lafayette Stage',emoji:'🎸'},
    {id:'LagST',label:'Lagniappe Stage',emoji:'🎺'},
  ]},
  {id:'admin',label:'Admin',channels:[
    {id:'Admin',label:'Admin',emoji:'⚡'},
    {id:'AdminMed',label:'Medical',emoji:'🏥'},
  ]},
];
const CHANNELS=CHANNEL_GROUPS.flatMap(g=>g.channels);

const ROLE_CHANNEL={
  a1:'Admin',a2:'Admin',a3:'Admin',
  m1:'AdminMed',m2:'AdminMed',
  msb1:'MoonBar',msb2:'MoonBar',
  ssbl:'SunBarL',ssbr:'SunBarR',
  lafb:'LafBar',lagb:'LagBar',
  ffb:'FamilyBar',cb:'CabBar',
  etecm:'EverythingBar',
  msm:'MoonST',ssm:'SunST',lafm:'LafST',lagm:'LagST',
  mtm:'EverythingBar',
  hosp:'Hospitality',hospitality:'Hospitality',
  maint:'AllStaff',maintenance:'AllStaff',
};
function roleChannel(r){return ROLE_CHANNEL[(r||'').toLowerCase()]||'AllStaff';}

const bg='#0a0a14';
const S={
  root:{minHeight:'100vh',background:bg,fontFamily:"'DM Sans',sans-serif",color:'#f1f5f9'},
  hdr:{background:'rgba(10,10,20,0.97)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10},
  body:{padding:'14px 16px',display:'flex',flexDirection:'column',gap:12},
  inp:{width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#f1f5f9',fontSize:16,fontFamily:'inherit',outline:'none'},
  card:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12},
  backBtn:{background:'rgba(14,165,233,0.08)',border:'1px solid rgba(14,165,233,0.25)',borderRadius:8,color:'#38bdf8',fontSize:14,fontWeight:700,cursor:'pointer',padding:'6px 14px'},
};

function BackBtn({onBack}){
  return <button style={S.backBtn} onClick={onBack}>← Back</button>;
}

// ── LOGIN ────────────────────────────────────────────────────
function LoginView({onLogin}){
  const [query,setQuery]=useState('');
  const [staff,setStaff]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    fetch(`${API}/get-staff-list`)
      .then(r=>r.json())
      .then(d=>setStaff(d.staff||[]))
      .catch(()=>setError('Could not load staff list.'))
      .finally(()=>setLoading(false));
  },[]);

  const matches=query.length>=2?staff.filter(s=>(s.name||'').toLowerCase().includes(query.toLowerCase())):[];

  return(
    <div style={S.root}>
      <div style={{...S.hdr,justifyContent:'center'}}>
        <div style={{fontSize:18,fontWeight:900}}>🎶 Fête de Marquette 2026</div>
      </div>
      <div style={S.body}>
        <div style={{textAlign:'center',padding:'20px 0 8px'}}>
          <div style={{fontSize:22,fontWeight:900,marginBottom:4}}>Staff Sign In</div>
          <div style={{fontSize:14,color:'#64748b'}}>Enter your first or last name</div>
        </div>
        {loading&&<div style={{textAlign:'center',color:'#475569',padding:20}}>Loading...</div>}
        {error&&<div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:14,color:'#fca5a5',fontSize:14}}>{error}</div>}
        {!loading&&!error&&<>
          <input style={{...S.inp,fontSize:18,padding:'14px'}} placeholder="First or last name..." value={query} onChange={e=>setQuery(e.target.value)} autoFocus/>
          {query.length>=2&&matches.length===0&&<div style={{textAlign:'center',color:'#475569',fontSize:14,padding:'12px 0'}}>No one found for "{query}"</div>}
          {matches.map(s=>(
            <button key={s.id} style={{...S.card,padding:'14px 16px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:12,border:'1px solid rgba(255,255,255,0.08)'}} onClick={()=>{
              const r=(s.role||'').toLowerCase();
              if(r==='m1') {window.location.href='/hub?role=med1';return;}
              if(r==='m2') {window.location.href='/hub?role=med2';return;}
              if(r==='a1'||r==='a2'||r==='a3') {window.location.href='/hub';return;}
              onLogin(s);
            }}>
              <div style={{width:42,height:42,borderRadius:10,background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#38bdf8',flexShrink:0}}>
                {(s.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700}}>{s.name}</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{s.role}{s.location?` · ${s.location}`:''}</div>
              </div>
            </button>
          ))}
        </>}
      </div>
    </div>
  );
}

// ── NEW CALL ─────────────────────────────────────────────────
function NewCallView({user,callType,onBack}){
  const [type,setType]=useState(callType||'');
  const [location,setLocation]=useState(user.location||'');
  const [problem,setProblem]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);

  const TYPES=[
    {id:'medical',label:'Medical',color:'rgba(147,51,234,0.8)'},
    {id:'fire',label:'Fire / Life Safety',color:'rgba(220,38,38,0.8)'},
    {id:'security',label:'Security',color:'rgba(37,99,235,0.8)'},
    {id:'supplies',label:'Supplies',color:'rgba(120,53,15,0.9)'},
    {id:'maintenance',label:'Maintenance',color:'rgba(22,163,74,0.8)'},
    {id:'lost_child',label:'Lost Child',color:'rgba(234,179,8,0.8)'},
  ];

  async function submit(){
    if(!type||!location||!problem) return;
    setSending(true);
    try{
      await fetch(`${API}/submit-call`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,location,problem,submittedBy:user.name,role:user.role})});
      setSent(true);
      setTimeout(onBack,2000);
    }catch(e){setSending(false);}
  }

  if(sent) return(
    <div style={{...S.root,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,padding:32}}>
      <div style={{fontSize:56}}>✅</div>
      <div style={{fontSize:20,fontWeight:900}}>Call Submitted</div>
      <div style={{fontSize:14,color:'#64748b'}}>Admin and relevant units notified</div>
    </div>
  );

  return(
    <div style={S.root}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{fontSize:16,fontWeight:900}}>Submit a Call</div>
      </div>
      <div style={S.body}>
        {!callType&&<>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em'}}>Call Type</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {TYPES.map(ct=>(
              <button key={ct.id} style={{padding:'14px 10px',borderRadius:12,border:`2px solid ${type===ct.id?ct.color:'rgba(255,255,255,0.08)'}`,background:type===ct.id?`${ct.color}22`:'rgba(255,255,255,0.03)',cursor:'pointer',fontSize:14,fontWeight:700,color:type===ct.id?'#f1f5f9':'#64748b'}} onClick={()=>setType(ct.id)}>{ct.label}</button>
            ))}
          </div>
        </>}
        {callType&&<div style={{background:`rgba(255,255,255,0.04)`,border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'12px 14px',fontSize:15,fontWeight:700,color:'#f1f5f9'}}>{TYPES.find(t=>t.id===callType)?.label||callType}</div>}
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Location</div>
          <input style={S.inp} placeholder="Where is this happening?" value={location} onChange={e=>setLocation(e.target.value)}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Description</div>
          <textarea style={{...S.inp,minHeight:90,resize:'none'}} placeholder="Describe the situation..." value={problem} onChange={e=>setProblem(e.target.value)}/>
        </div>
        <button style={{padding:'16px',borderRadius:12,border:'none',background:'rgba(220,38,38,0.8)',color:'#fff',fontSize:16,fontWeight:900,cursor:'pointer',opacity:(!type||!location||!problem||sending)?0.4:1}} disabled={!type||!location||!problem||sending} onClick={submit}>
          {sending?'Submitting...':'Submit Call'}
        </button>
      </div>
    </div>
  );
}

// ── CHAT ─────────────────────────────────────────────────────
function ChatView({user,onBack}){
  const [tab,setTab]=useState('channels');
  const [channel,setChannel]=useState(roleChannel(user.role));
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [sending,setSending]=useState(false);
  const [dmThread,setDmThread]=useState(null);
  const [dmList,setDmList]=useState([]);
  const [staffList,setStaffList]=useState([]);
  const msgEnd=useRef(null);

  useEffect(()=>{
    fetch(`${API}/get-staff-list`).then(r=>r.json()).then(d=>setStaffList(d.staff||[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    fetchMessages();
    const iv=setInterval(fetchMessages,8000);
    return()=>clearInterval(iv);
  },[channel,dmThread]);

  async function fetchMessages(){
    try{
      const url=dmThread?`${API}/get-messages?dmThread=${encodeURIComponent(dmThread.threadId)}`:`${API}/get-messages?channel=${channel}&myName=${encodeURIComponent(user.name)}&limit=60`;
      const res=await fetch(url);
      const data=await res.json();
      if(data.messages) setMessages(data.messages);
      if(data.dmThreads) setDmList(data.dmThreads);
      setTimeout(()=>msgEnd.current?.scrollIntoView({behavior:'smooth'}),100);
    }catch(e){}
  }

  async function send(){
    if(!input.trim()||sending) return;
    setSending(true);
    try{
      const body=dmThread
        ?{fromName:user.name,fromRole:user.role,channel:`DM_${[user.name,dmThread.otherName].sort().join('_')}`,message:input.trim(),isDM:true,toName:dmThread.otherName,threadId:dmThread.threadId}
        :{fromName:user.name,fromRole:user.role,channel,message:input.trim()};
      await fetch(`${API}/send-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      setInput('');
      await fetchMessages();
    }catch(e){}
    setSending(false);
  }

  const chanObj=CHANNELS.find(c=>c.id===channel);

  return(
    <div style={{...S.root,display:'flex',flexDirection:'column',height:'100vh'}}>
      <div style={S.hdr}>
        <BackBtn onBack={()=>{if(dmThread){setDmThread(null);setMessages([]);}else onBack();}}/>
        <div style={{flex:1,fontSize:15,fontWeight:800}}>
          {dmThread?`${dmThread.otherName}`:`${chanObj?chanObj.label:channel}`}
        </div>
      </div>
      {!dmThread&&<div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        {[['channels','Channels'],['dms','Direct Messages']].map(([t,l])=>(
          <button key={t} style={{flex:1,padding:'10px',background:'none',border:'none',borderBottom:`2px solid ${tab===t?'#38bdf8':'transparent'}`,color:tab===t?'#38bdf8':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer'}} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>}
      {!dmThread&&tab==='channels'&&(
        <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',overflowY:'auto',maxHeight:180}}>
          {CHANNEL_GROUPS.map(group=>(
            <div key={group.id} style={{padding:'6px 14px 4px'}}>
              <div style={{fontSize:10,fontWeight:900,color:'#374151',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>{group.label}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:4}}>
                {group.channels.map(ch=>{
                  const active=channel===ch.id;
                  return <button key={ch.id} style={{padding:'5px 11px',borderRadius:16,border:`1px solid ${active?'rgba(14,165,233,0.6)':'rgba(255,255,255,0.08)'}`,background:active?'rgba(14,165,233,0.12)':'rgba(255,255,255,0.02)',color:active?'#38bdf8':'#64748b',fontSize:12,fontWeight:active?700:400,cursor:'pointer'}} onClick={()=>{setChannel(ch.id);setMessages([]);}}>{ch.label}</button>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {!dmThread&&tab==='dms'&&(
        <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',overflowY:'auto',maxHeight:200}}>
          <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8}}>NEW MESSAGE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
            {staffList.filter(s=>s.name!==user.name).map(s=>(
              <button key={s.id} style={{padding:'4px 10px',borderRadius:14,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'#94a3b8',fontSize:12,cursor:'pointer'}} onClick={()=>{setDmThread({otherName:s.name,threadId:`DM_${[user.name,s.name].sort().join('_')}`});setMessages([]);}}>{s.name}</button>
            ))}
          </div>
          {dmList.map(dm=>(
            <button key={dm.threadId} style={{width:'100%',padding:'8px 0',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer',textAlign:'left',display:'flex',gap:10,alignItems:'center'}} onClick={()=>{setDmThread({otherName:dm.otherName,threadId:dm.threadId});setMessages([]);}}>
              <div style={{fontSize:13,fontWeight:700,color:'#f1f5f9',flex:1}}>{dm.otherName}</div>
              <div style={{fontSize:11,color:'#64748b',maxWidth:120,textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>{dm.lastMessage}</div>
            </button>
          ))}
        </div>
      )}
      {(tab==='channels'||dmThread)&&<>
        <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8,minHeight:0}}>
          {messages.length===0&&<div style={{textAlign:'center',color:'#374151',fontSize:13,padding:'24px 0'}}>No messages yet</div>}
          {messages.map(msg=>{
            const isMe=msg.fromName===user.name;
            const isAlert=msg.isAlert;
            const time=msg.sentAt?new Date(msg.sentAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}):'';
            if(isAlert) return(
              <div key={msg.id} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'8px 12px'}}>
                <div style={{fontSize:10,fontWeight:800,color:'#fca5a5',marginBottom:2}}>🚨 ALERT · {time}</div>
                <div style={{fontSize:13,color:'#fecaca'}}>{msg.message}</div>
              </div>
            );
            return(
              <div key={msg.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',gap:2}}>
                {!isMe&&<div style={{fontSize:10,color:'#64748b',marginLeft:4}}>{msg.fromName} · {time}</div>}
                <div style={{maxWidth:'82%',background:isMe?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.06)',border:`1px solid ${isMe?'rgba(14,165,233,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'9px 13px'}}>
                  <div style={{fontSize:14,lineHeight:1.5}}>{msg.message}</div>
                </div>
                {isMe&&<div style={{fontSize:10,color:'#374151',marginRight:4}}>{time}</div>}
              </div>
            );
          })}
          <div ref={msgEnd}/>
        </div>
        <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:8,background:'rgba(10,10,20,0.95)'}}>
          <input style={{...S.inp,flex:1}} placeholder={dmThread?`Message ${dmThread.otherName}...`:`Message ${chanObj?chanObj.label:channel}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();send();}}}/>
          <button style={{padding:'10px 16px',borderRadius:10,border:'none',background:input.trim()?'linear-gradient(135deg,#0ea5e9,#0284c7)':'rgba(255,255,255,0.06)',color:input.trim()?'#fff':'#475569',fontSize:14,fontWeight:800,cursor:input.trim()?'pointer':'not-allowed',flexShrink:0}} onClick={send} disabled={!input.trim()||sending}>{sending?'...':'Send'}</button>
        </div>
      </>}
    </div>
  );
}

// ── LOST & FOUND FORM ────────────────────────────────────────
function LFView({user,onBack}){
  const [description,setDescription]=useState('');
  const [location,setLocation]=useState('');
  const [currentLoc,setCurrentLoc]=useState(user.location||'');
  const [day,setDay]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [itemNumber,setItemNumber]=useState('');

  async function submit(){
    if(!description||!location) return;
    setSending(true);
    try{
      const res=await fetch(`${API}/submit-lost-found`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description,foundAt:location,currentLocation:currentLoc,dayFound:day,foundBy:user.name,role:user.role})});
      const data=await res.json();
      setItemNumber(data.itemNumber||'');
      setSent(true);
    }catch(e){setSending(false);}
  }

  if(sent) return(
    <div style={{...S.root,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:32}}>
      <div style={{fontSize:56}}>📦</div>
      <div style={{fontSize:20,fontWeight:900}}>Item Logged</div>
      {itemNumber&&<div style={{background:'rgba(249,115,22,0.12)',border:'2px solid rgba(249,115,22,0.5)',borderRadius:14,padding:'16px 28px',textAlign:'center'}}>
        <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',letterSpacing:'0.08em',marginBottom:6}}>ITEM NUMBER</div>
        <div style={{fontSize:30,fontWeight:900,color:'#fb923c'}}>{itemNumber}</div>
        <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Write on tag and attach to item</div>
      </div>}
      <button style={{padding:'12px 24px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#94a3b8',fontSize:14,fontWeight:700,cursor:'pointer'}} onClick={onBack}>← Back</button>
    </div>
  );

  return(
    <div style={S.root}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{fontSize:16,fontWeight:900}}>Log Found Item</div>
      </div>
      <div style={S.body}>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Day Found</div>
          <div style={{display:'flex',gap:6}}>
            {[['Thu','Blue'],['Fri','Orange'],['Sat','Green'],['Sun','Purple']].map(([d,c])=>(
              <button key={d} style={{flex:1,padding:'10px 4px',borderRadius:8,border:`1px solid ${day===d?'rgba(14,165,233,0.5)':'rgba(255,255,255,0.1)'}`,background:day===d?'rgba(14,165,233,0.1)':'rgba(255,255,255,0.03)',color:day===d?'#38bdf8':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer'}} onClick={()=>setDay(d)}>{d}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Where Was It Found?</div>
          <input style={S.inp} placeholder="e.g. Near Moon Stage Left" value={location} onChange={e=>setLocation(e.target.value)}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Where Is It Now?</div>
          <input style={S.inp} placeholder="e.g. Behind the bar counter" value={currentLoc} onChange={e=>setCurrentLoc(e.target.value)}/>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Description</div>
          <textarea style={{...S.inp,minHeight:80,resize:'none'}} placeholder="Describe the item..." value={description} onChange={e=>setDescription(e.target.value)}/>
        </div>
        <button style={{padding:'16px',borderRadius:12,border:'none',background:'rgba(249,115,22,0.8)',color:'#fff',fontSize:16,fontWeight:900,cursor:'pointer',opacity:(!description||!location||sending)?0.4:1}} disabled={!description||!location||sending} onClick={submit}>
          {sending?'Logging...':'Log Item'}
        </button>
      </div>
    </div>
  );
}


// ── OVERNIGHT VIEW ───────────────────────────────────────────
function OvernightView({user,onLogout}){
  const [tab,setTab]=useState('home');
  const [arrived,setArrived]=useState(false);
  const [logs,setLogs]=useState([]);

  // Log form state
  const [logType,setLogType]=useState('');
  const [logTime,setLogTime]=useState('');
  const [logWhat,setLogWhat]=useState('');
  const [logSending,setLogSending]=useState(false);
  const [logSent,setLogSent]=useState(false);

  // EOD report state
  const [eodNotes,setEodNotes]=useState('');
  const [eodIncidents,setEodIncidents]=useState('');
  const [eodLF,setEodLF]=useState('');
  const [eodSending,setEodSending]=useState(false);
  const [eodSent,setEodSent]=useState(false);

  // L&F view
  const [view,setView]=useState('home');
  if(view==='lf') return <LFView user={user} onBack={()=>setView('home')}/>;

  async function sendArrival(){
    const ts=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const msg=`✅ OVERNIGHT CREW ONSITE

${user.name} has arrived at McPike Park.
Time: ${ts}

Fête de Marquette 2026 Operations`;
    await fetch(`${API}/send-sms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'+16082289692',message:msg})}).catch(()=>{});
    setArrived(true);
  }

  async function submitLog(){
    if(!logType||!logWhat) return;
    setLogSending(true);
    const ts=logTime||new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const entry={id:Date.now(),type:logType,time:ts,what:logWhat};
    const msg=`📋 OVERNIGHT LOG — ${logType.toUpperCase()}

Time: ${ts}
Logged by: ${user.name}

${logWhat}

Fête de Marquette 2026`;
    await fetch(`${API}/send-sms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'+16082289692',message:msg})}).catch(()=>{});
    setLogs(p=>[entry,...p]);
    setLogType('');setLogTime('');setLogWhat('');
    setLogSent(true);
    setTimeout(()=>setLogSent(false),2000);
    setLogSending(false);
  }

  async function submitEOD(){
    if(!eodNotes) return;
    setEodSending(true);
    const msg=`🌙 OVERNIGHT EOD REPORT

Crew: ${user.name}
Date: ${new Date().toLocaleDateString()}

INCIDENTS:
${eodIncidents||'None'}

LOST & FOUND:
${eodLF||'None'}

GENERAL NOTES:
${eodNotes}

Fête de Marquette 2026`;
    await fetch(`${API}/send-sms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'+16082289692',message:msg})}).catch(()=>{});
    setEodSent(true);
    setEodSending(false);
  }

  const LOG_TYPES=[
    {id:'Police Called',color:'rgba(37,99,235,0.7)',label:'🚔 Police Called'},
    {id:'Medical Called',color:'rgba(147,51,234,0.7)',label:'🏥 Medical Called'},
    {id:'Fire / Life Safety',color:'rgba(220,38,38,0.7)',label:'🔥 Fire / Life Safety'},
    {id:'Lost & Found',color:'rgba(249,115,22,0.7)',label:'📦 Lost & Found'},
    {id:'Other',color:'rgba(100,116,139,0.7)',label:'📋 Other'},
  ];

  return(
    <div style={S.root}>
      <div style={S.hdr}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:900}}>{user.name.split(' ')[0]} — Overnight</div>
          <div style={{fontSize:11,color:'#64748b'}}>{user.location||'McPike Park'}</div>
        </div>
        <button style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',padding:'6px 12px'}} onClick={onLogout}>Sign Out</button>
      </div>

      <div style={S.body}>

        {/* I AM HERE BUTTON */}
        {!arrived?(
          <button style={{padding:'20px',borderRadius:14,border:'2px solid rgba(34,197,94,0.6)',background:'linear-gradient(135deg,rgba(22,163,74,0.2),rgba(16,185,129,0.1))',cursor:'pointer',textAlign:'center',boxShadow:'0 0 20px rgba(34,197,94,0.2)'}} onClick={sendArrival}>
            <div style={{fontSize:26,marginBottom:6}}>✋</div>
            <div style={{fontSize:18,fontWeight:900,color:'#4ade80'}}>I Am Here</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Tap to notify admin you have arrived</div>
          </button>
        ):(
          <div style={{padding:'14px 16px',borderRadius:12,border:'1px solid rgba(34,197,94,0.4)',background:'rgba(22,163,74,0.08)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontSize:20}}>✅</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#4ade80'}}>Admin Notified — You Are Onsite</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div>
            </div>
          </div>
        )}

        {/* TABS */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.08)',marginTop:4}}>
          {[['log','Log Event'],['lf','Lost & Found'],['eod','EOD Report'],['history','History']].map(([t,l])=>(
            <button key={t} style={{flex:1,padding:'9px 4px',background:'none',border:'none',borderBottom:`2px solid ${tab===t?'#38bdf8':'transparent'}`,color:tab===t?'#38bdf8':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',lineHeight:1.3}} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {/* LOG EVENT TAB */}
        {tab==='log'&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {logSent&&<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'10px 14px',color:'#4ade80',fontSize:13,fontWeight:700,textAlign:'center'}}>✅ Logged & sent to admin</div>}
            <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em'}}>What happened?</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {LOG_TYPES.map(lt=>(
                <button key={lt.id} style={{padding:'13px 14px',borderRadius:10,border:`1.5px solid ${logType===lt.id?lt.color:'rgba(255,255,255,0.08)'}`,background:logType===lt.id?`${lt.color.replace('0.7','0.15')}`:'rgba(255,255,255,0.03)',cursor:'pointer',textAlign:'left',fontSize:14,fontWeight:logType===lt.id?700:400,color:logType===lt.id?'#f1f5f9':'#94a3b8'}} onClick={()=>setLogType(lt.id)}>{lt.label}</button>
              ))}
            </div>
            {logType&&<>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Time of Event</div>
                <input type="time" style={{...S.inp}} value={logTime} onChange={e=>setLogTime(e.target.value)} placeholder="Leave blank for now"/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>What Happened?</div>
                <textarea style={{...S.inp,minHeight:100,resize:'none'}} placeholder="Describe what happened..." value={logWhat} onChange={e=>setLogWhat(e.target.value)}/>
              </div>
              <button style={{padding:'15px',borderRadius:12,border:'none',background:'rgba(14,165,233,0.8)',color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',opacity:(!logWhat||logSending)?0.4:1}} disabled={!logWhat||logSending} onClick={submitLog}>
                {logSending?'Logging...':'Log Event — Notify Admin'}
              </button>
            </>}
          </div>
        )}

        {/* LOST & FOUND TAB */}
        {tab==='lf'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button style={{...S.card,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,border:'1px solid rgba(249,115,22,0.2)',background:'rgba(249,115,22,0.06)'}} onClick={()=>setView('lf')}>
              <span style={{fontSize:22}}>📦</span>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#fb923c'}}>Log Found Item</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Add item to Lost & Found</div>
              </div>
              <div style={{marginLeft:'auto',color:'#fb923c'}}>→</div>
            </button>
            <a href="https://fdm2026.netlify.app/lostfound" target="_blank" style={{...S.card,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,border:'1px solid rgba(139,92,246,0.2)',background:'rgba(139,92,246,0.06)',textDecoration:'none'}}>
              <span style={{fontSize:22}}>🔍</span>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'#c4b5fd'}}>L&F Lookup</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Search all items</div>
              </div>
              <div style={{marginLeft:'auto',color:'#c4b5fd'}}>→</div>
            </a>
          </div>
        )}

        {/* EOD REPORT TAB */}
        {tab==='eod'&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {eodSent?(
              <div style={{textAlign:'center',padding:'30px 0'}}>
                <div style={{fontSize:48,marginBottom:12}}>🌙</div>
                <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>EOD Report Sent</div>
                <div style={{fontSize:13,color:'#64748b'}}>Admin has been notified. Good night!</div>
              </div>
            ):<>
              <div style={{fontSize:12,color:'#64748b',lineHeight:1.6}}>Fill out before leaving for the night. Sends directly to admin.</div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Incidents (police, medical, fire)</div>
                <textarea style={{...S.inp,minHeight:80,resize:'none'}} placeholder="List any incidents that occurred..." value={eodIncidents} onChange={e=>setEodIncidents(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Lost & Found Items</div>
                <textarea style={{...S.inp,minHeight:70,resize:'none'}} placeholder="List any L&F items found overnight..." value={eodLF} onChange={e=>setEodLF(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>General Notes *</div>
                <textarea style={{...S.inp,minHeight:90,resize:'none'}} placeholder="Overall how did the night go? Any concerns?" value={eodNotes} onChange={e=>setEodNotes(e.target.value)}/>
              </div>
              <button style={{padding:'16px',borderRadius:12,border:'none',background:'linear-gradient(135deg,rgba(99,102,241,0.8),rgba(79,70,229,0.8))',color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer',opacity:(!eodNotes||eodSending)?0.4:1}} disabled={!eodNotes||eodSending} onClick={submitEOD}>
                {eodSending?'Sending...':'🌙 Submit EOD Report'}
              </button>
            </>}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab==='history'&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Events logged this session</div>
            {logs.length===0&&<div style={{textAlign:'center',color:'#374151',fontSize:13,padding:'24px 0'}}>No events logged yet</div>}
            {logs.map(log=>(
              <div key={log.id} style={{...S.card,padding:'10px 14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>{log.type}</div>
                  <div style={{fontSize:11,color:'#64748b'}}>{log.time}</div>
                </div>
                <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.5}}>{log.what}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── HOME ─────────────────────────────────────────────────────
function HomeView({user,onLogout}){
  const [view,setView]=useState('home');
  const [callType,setCallType]=useState('');

  function goCall(type){setCallType(type);setView('call');}

  if(view==='call') return <NewCallView user={user} callType={callType} onBack={()=>{setView('home');setCallType('');}}/>;
  if(view==='chat') return <ChatView user={user} onBack={()=>setView('home')}/>;
  if(view==='lf') return <LFView user={user} onBack={()=>setView('home')}/>;

  const isHospitality=(user.role||'').toLowerCase().includes('hosp');

  return(
    <div style={S.root}>
      {/* HEADER */}
      <div style={S.hdr}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:900}}>{user.name.split(' ')[0]}</div>
          <div style={{fontSize:11,color:'#64748b'}}>{user.role}{user.location?` · ${user.location}`:''}</div>
        </div>
        <button style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',padding:'6px 12px'}} onClick={onLogout}>Sign Out</button>
      </div>

      <div style={S.body}>

        {/* FESTIVAL CHAT — full width top */}
        <button style={{...S.card,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left',border:'1px solid rgba(14,165,233,0.2)',background:'rgba(14,165,233,0.06)'}} onClick={()=>setView('chat')}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>💬</div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:'#38bdf8'}}>Festival Chat</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Channels · Direct Messages · Alerts</div>
          </div>
          <div style={{color:'#38bdf8',fontSize:18}}>→</div>
        </button>

        {/* TWO COLUMN LAYOUT */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>

          {/* LEFT — SAFETY */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:10,fontWeight:900,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em'}}>Safety</div>

            {/* Lost Child */}
            <button style={{padding:'14px 10px',borderRadius:12,border:'2px solid rgba(234,179,8,0.6)',background:'linear-gradient(135deg,rgba(202,138,4,0.2),rgba(161,98,7,0.1))',cursor:'pointer',textAlign:'left'}} onClick={()=>goCall('lost_child')}>
              <div style={{fontSize:13,fontWeight:900,color:'#fcd34d'}}>Lost Child</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Report immediately</div>
            </button>

            {/* Medical */}
            <button style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(147,51,234,0.5)',background:'rgba(147,51,234,0.08)',cursor:'pointer',textAlign:'left'}} onClick={()=>goCall('medical')}>
              <div style={{fontSize:13,fontWeight:800,color:'#d8b4fe'}}>Medical</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Request medical</div>
            </button>

            {/* Fire / Life Safety */}
            <button style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(220,38,38,0.5)',background:'rgba(220,38,38,0.08)',cursor:'pointer',textAlign:'left'}} onClick={()=>goCall('fire')}>
              <div style={{fontSize:13,fontWeight:800,color:'#fca5a5'}}>Fire / Life Safety</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Fire or life threat</div>
            </button>

            {/* Security */}
            <button style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(37,99,235,0.5)',background:'rgba(37,99,235,0.08)',cursor:'pointer',textAlign:'left'}} onClick={()=>goCall('security')}>
              <div style={{fontSize:13,fontWeight:800,color:'#93c5fd'}}>Security</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Disturbance or threat</div>
            </button>
          </div>

          {/* RIGHT — SUPPLIES + L&F + MAINTENANCE */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>

            {/* Supplies (hidden for hospitality) */}
            {!isHospitality&&<>
              <div style={{fontSize:10,fontWeight:900,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em'}}>Requests</div>
              <button style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(180,83,9,0.5)',background:'rgba(120,53,15,0.08)',cursor:'pointer',textAlign:'left'}} onClick={()=>goCall('supplies')}>
                <div style={{fontSize:13,fontWeight:800,color:'#d97706'}}>Supplies</div>
                <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Request restock</div>
              </button>
            </>}

            {/* Lost & Found Section */}
            <div style={{fontSize:10,fontWeight:900,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:isHospitality?0:4}}>Lost & Found</div>
            <button style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(249,115,22,0.4)',background:'rgba(249,115,22,0.06)',cursor:'pointer',textAlign:'left'}} onClick={()=>setView('lf')}>
              <div style={{fontSize:13,fontWeight:800,color:'#fb923c'}}>Log Found Item</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Add to L&F</div>
            </button>
            <a href="https://fdm2026.netlify.app/lostfound" target="_blank" style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(139,92,246,0.4)',background:'rgba(139,92,246,0.06)',cursor:'pointer',textDecoration:'none',display:'block'}}>
              <div style={{fontSize:13,fontWeight:800,color:'#c4b5fd'}}>L&F Lookup</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Search all items</div>
            </a>

            {/* Maintenance */}
            <div style={{fontSize:10,fontWeight:900,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.1em',marginTop:4}}>Maintenance</div>
            <button style={{padding:'14px 10px',borderRadius:12,border:'1px solid rgba(22,163,74,0.5)',background:'rgba(22,163,74,0.08)',cursor:'pointer',textAlign:'left'}} onClick={()=>goCall('maintenance')}>
              <div style={{fontSize:13,fontWeight:800,color:'#86efac'}}>Maintenance</div>
              <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Report an issue</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
function FieldApp(){
  const [user,setUser]=useState(null);
  if(!user) return <LoginView onLogin={setUser}/>;
  const r=(user.role||'').toLowerCase();
  if(r.includes('overnight')) return <OvernightView user={user} onLogout={()=>setUser(null)}/>;
  return <HomeView user={user} onLogout={()=>setUser(null)}/>;
}
