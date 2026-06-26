const {useState,useEffect,useRef}=React;

// ─── CONSTANTS ───────────────────────────────────────────────
const API='/.netlify/functions';
const CHANNEL_GROUPS=[
  {
    id:'general',label:'General',
    channels:[
      {id:'AllStaff',label:'All Staff',emoji:'📢'},
      {id:'Hospitality',label:'Hospitality',emoji:'🎪'},
    ]
  },
  {
    id:'bars',label:'Bars',
    channels:[
      {id:'Bars',label:'All Bars',emoji:'🍺'},
      {id:'MoonBar',label:'Moon Bar',emoji:'🌙'},
      {id:'SunBarL',label:'Sun Bar Left',emoji:'☀️'},
      {id:'SunBarR',label:'Sun Bar Right',emoji:'☀️'},
      {id:'LafBar',label:'Lafayette Bar',emoji:'🎸'},
      {id:'LagBar',label:'Lagniappe Bar',emoji:'🎺'},
      {id:'FamilyBar',label:'Family Bar',emoji:'👨‍👩‍👧'},
      {id:'CabBar',label:'Cabaret Bar',emoji:'🎭'},
      {id:'EverythingBar',label:'EEC',emoji:'☕'},
    ]
  },
  {
    id:'stages',label:'Stages',
    channels:[
      {id:'MoonST',label:'Moon Stage',emoji:'🌙'},
      {id:'SunST',label:'Sun Stage',emoji:'☀️'},
      {id:'LafST',label:'Lafayette Stage',emoji:'🎸'},
      {id:'LagST',label:'Lagniappe Stage',emoji:'🎺'},
    ]
  },
  {
    id:'admin',label:'Admin',
    channels:[
      {id:'Admin',label:'Admin',emoji:'⚡'},
    ]
  },
  {
    id:'medical',label:'Medical',
    channels:[
      {id:'AdminMed',label:'Medical',emoji:'🏥'},
    ]
  },
];

// Flat list for lookups
const CHANNELS=CHANNEL_GROUPS.flatMap(g=>g.channels);

const CALL_TYPES=[
  {id:'medical',label:'Medical',emoji:'🏥',color:'rgba(147,51,234,0.8)'},
  {id:'security',label:'Security',emoji:'🛡',color:'rgba(37,99,235,0.8)'},
  {id:'maintenance',label:'Maintenance',emoji:'🔧',color:'rgba(22,163,74,0.8)'},
  {id:'supplies',label:'Supplies',emoji:'📦',color:'rgba(120,53,15,0.9)',noRoles:['hosp','hospitality']},
  {id:'fire',label:'Fire/Life Safety',emoji:'🔥',color:'rgba(220,38,38,0.8)'},
];

const ROLE_CHANNEL={
  a1:'Admin',a2:'Admin',
  m1:'AdminMed',m2:'AdminMed',
  msb1:'MoonBar',msb2:'MoonBar',
  ssbl:'SunBarL',ssbr:'SunBarR',
  lafb:'LafBar',lagb:'LagBar',
  ffb:'FamilyBar',cb:'CabBar',
  etecm:'EverythingBar',
  msm:'MoonST',ssm:'SunST',lafm:'LafST',lagm:'LagST',
  mtm:'EverythingBar',
};

function roleChannel(r){return ROLE_CHANNEL[(r||'').toLowerCase()]||'AllStaff';}

// ─── STYLES ──────────────────────────────────────────────────
const bg='#0a0a14';
const card={background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14};
const S={
  root:{minHeight:'100vh',background:bg,fontFamily:"'DM Sans',sans-serif",color:'#f1f5f9'},
  hdr:{background:'rgba(10,10,20,0.95)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'14px 16px',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10},
  body:{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10},
  btn:(c='#0ea5e9')=>({padding:'14px',borderRadius:12,border:'none',background:c,color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',width:'100%'}),
  outBtn:(c='rgba(255,255,255,0.08)')=>({padding:'12px',borderRadius:10,border:'1px solid rgba(255,255,255,0.12)',background:c,color:'#f1f5f9',fontSize:14,fontWeight:700,cursor:'pointer',width:'100%'}),
  inp:{width:'100%',padding:'12px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#f1f5f9',fontSize:16,fontFamily:'inherit',outline:'none'},
  label:{fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4},
  section:{...card,overflow:'hidden'},
  sectionHdr:{padding:'10px 14px',fontSize:12,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'1px solid rgba(255,255,255,0.06)'},
};

// ─── SMALL COMPONENTS ────────────────────────────────────────
function Spinner(){return <div style={{textAlign:'center',padding:40,color:'#475569'}}>Loading...</div>;}

function BackBtn({onBack,label='← Back'}){
  return <button style={{background:'rgba(14,165,233,0.08)',border:'1px solid rgba(14,165,233,0.2)',borderRadius:8,color:'#38bdf8',fontSize:14,fontWeight:700,cursor:'pointer',padding:'6px 14px'}} onClick={onBack}>{label}</button>;
}

// ─── LOGIN VIEW ──────────────────────────────────────────────
function LoginView({onLogin}){
  const [query,setQuery]=useState('');
  const [staff,setStaff]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    fetch(`${API}/get-staff-list`)
      .then(r=>r.json())
      .then(d=>setStaff(d.staff||[]))
      .catch(()=>setError('Could not load staff list. Check connection.'))
      .finally(()=>setLoading(false));
  },[]);

  const matches=query.length>=2
    ? staff.filter(s=>(s.name||'').toLowerCase().includes(query.toLowerCase()))
    : [];

  return(
    <div style={S.root}>
      <div style={{...S.hdr,justifyContent:'center'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#f1f5f9'}}>🎶 FDM 2026</div>
      </div>
      <div style={S.body}>
        <div style={{textAlign:'center',padding:'24px 0 8px'}}>
          <div style={{fontSize:22,fontWeight:900,color:'#f1f5f9',marginBottom:4}}>Staff Sign In</div>
          <div style={{fontSize:14,color:'#64748b'}}>Enter your last name to find your account</div>
        </div>

        {loading&&<Spinner/>}
        {error&&<div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:14,color:'#fca5a5',fontSize:14}}>{error}</div>}

        {!loading&&!error&&<>
          <input
            style={{...S.inp,fontSize:18,padding:'14px'}}
            placeholder="Last name..."
            value={query}
            onChange={e=>setQuery(e.target.value)}
            autoFocus
          />
          {query.length>=2&&matches.length===0&&
            <div style={{textAlign:'center',color:'#475569',fontSize:14,padding:'12px 0'}}>No staff found for "{query}"</div>
          }
          {matches.map(s=>(
            <button key={s.id} style={{...card,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:12}} onClick={()=>{
              // Admin + Med go to hub
              const r=(s.role||'').toLowerCase();
              if(r==='m1'||r==='m2'){
                window.location.href=`/hub?role=${r==='m1'?'med1':'med2'}`;
                return;
              }
              if(r==='a1'||r==='a2'){
                window.location.href='/hub';
                return;
              }
              onLogin(s);
            }}>
              <div style={{width:40,height:40,borderRadius:10,background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'#38bdf8',flexShrink:0}}>
                {(s.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#f1f5f9'}}>{s.name}</div>
                <div style={{fontSize:12,color:'#64748b'}}>{s.role} · {s.location}</div>
              </div>
            </button>
          ))}
        </>}
      </div>
    </div>
  );
}

// ─── NEW CALL VIEW ───────────────────────────────────────────
function NewCallView({user,onBack,onSubmit}){
  const [type,setType]=useState('');
  const [location,setLocation]=useState(user.location||'');
  const [problem,setProblem]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);

  async function submit(){
    if(!type||!location||!problem) return;
    setSending(true);
    try{
      await fetch(`${API}/submit-call`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type,location,problem,submittedBy:user.name,role:user.role})
      });
      setSent(true);
      setTimeout(onBack,2000);
    }catch(e){setSending(false);}
  }

  if(sent) return(
    <div style={{...S.root,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{fontSize:48}}>✅</div>
      <div style={{fontSize:20,fontWeight:900,color:'#f1f5f9'}}>Call Submitted</div>
      <div style={{fontSize:14,color:'#64748b'}}>Admin and med units have been notified</div>
    </div>
  );

  return(
    <div style={S.root}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{fontSize:16,fontWeight:900,color:'#f1f5f9'}}>New Call</div>
      </div>
      <div style={S.body}>
        <div>
          <div style={S.label}>Call Type</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {CALL_TYPES.filter(ct=>!(ct.noRoles&&ct.noRoles.includes((user.role||'').toLowerCase()))).map(ct=>(
              <button key={ct.id} style={{padding:'14px 8px',borderRadius:12,border:`2px solid ${type===ct.id?ct.color:'rgba(255,255,255,0.08)'}`,background:type===ct.id?`${ct.color}22`:'rgba(255,255,255,0.03)',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4}} onClick={()=>setType(ct.id)}>
                <span style={{fontSize:22}}>{ct.emoji}</span>
                <span style={{fontSize:11,fontWeight:800,color:type===ct.id?'#f1f5f9':'#64748b'}}>{ct.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={S.label}>Location</div>
          <input style={S.inp} placeholder="Where is this happening?" value={location} onChange={e=>setLocation(e.target.value)}/>
        </div>
        <div>
          <div style={S.label}>What's happening?</div>
          <textarea style={{...S.inp,minHeight:90,resize:'none'}} placeholder="Describe the situation..." value={problem} onChange={e=>setProblem(e.target.value)}/>
        </div>
        <button style={{...S.btn('rgba(220,38,38,0.9)'),opacity:(!type||!location||!problem||sending)?0.5:1}} disabled={!type||!location||!problem||sending} onClick={submit}>
          {sending?'Submitting...':'🚨 Submit Call'}
        </button>
      </div>
    </div>
  );
}

// ─── CHAT VIEW ───────────────────────────────────────────────
function ChatView({user,onBack}){
  const [tab,setTab]=useState('channels'); // channels | dms
  const userChannels=roleChannels(user.role, user.secondaryRole);
  const [channel,setChannel]=useState(userChannels[0]||'AllStaff');
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [sending,setSending]=useState(false);
  const [dmThread,setDmThread]=useState(null); // {otherName, threadId}
  const [dmList,setDmList]=useState([]);
  const [staffList,setStaffList]=useState([]);
  const msgEnd=useRef(null);

  useEffect(()=>{
    fetch(`${API}/get-staff-list`).then(r=>r.json()).then(d=>setStaffList(d.staff||[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    fetchMessages();
    const iv=setInterval(fetchMessages,6000);
    return()=>clearInterval(iv);
  },[channel,dmThread]);

  async function fetchMessages(){
    try{
      let url;
      if(dmThread) url=`${API}/get-messages?dmThread=${encodeURIComponent(dmThread.threadId)}`;
      else url=`${API}/get-messages?channel=${channel}&myName=${encodeURIComponent(user.name)}&limit=60`;
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
        ? {fromName:user.name,fromRole:user.role,channel:`DM_${[user.name,dmThread.otherName].sort().join('_')}`,message:input.trim(),isDM:true,toName:dmThread.otherName,threadId:dmThread.threadId}
        : {fromName:user.name,fromRole:user.role,channel,message:input.trim()};
      await fetch(`${API}/send-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      setInput('');
      await fetchMessages();
    }catch(e){}
    setSending(false);
  }

  function startDM(s){
    const threadId=`DM_${[user.name,s.name].sort().join('_')}`;
    setDmThread({otherName:s.name,threadId});
    setMessages([]);
  }

  const chanObj=CHANNELS.find(c=>c.id===channel);

  return(
    <div style={{...S.root,display:'flex',flexDirection:'column',height:'100vh'}}>
      {/* Header */}
      <div style={S.hdr}>
        <BackBtn onBack={()=>{if(dmThread){setDmThread(null);setMessages([]);}else onBack();}}/>
        <div style={{flex:1,fontSize:15,fontWeight:800,color:'#f1f5f9'}}>
          {dmThread?`💬 ${dmThread.otherName}`:`💬 ${chanObj?chanObj.emoji+' '+chanObj.label:channel}`}
        </div>
      </div>

      {/* Tabs (only when not in DM) */}
      {!dmThread&&<div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        {[['channels','Channels'],['dms','Direct Messages']].map(([t,l])=>(
          <button key={t} style={{flex:1,padding:'10px',background:'none',border:'none',borderBottom:`2px solid ${tab===t?'#38bdf8':'transparent'}`,color:tab===t?'#38bdf8':'#64748b',fontSize:13,fontWeight:700,cursor:'pointer'}} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>}

      {/* Channel picker — grouped sections */}
      {!dmThread&&tab==='channels'&&(
        <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',overflowY:'auto',maxHeight:200}}>
          {CHANNEL_GROUPS.map(group=>(
            <div key={group.id} style={{padding:'6px 12px 4px'}}>
              <div style={{fontSize:10,fontWeight:900,color:'#374151',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>{group.label}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:4}}>
                {group.channels.map(ch=>{
                  const active=channel===ch.id;
                  return(
                    <button key={ch.id} style={{padding:'5px 11px',borderRadius:16,border:`1px solid ${active?'rgba(14,165,233,0.6)':'rgba(255,255,255,0.08)'}`,background:active?'rgba(14,165,233,0.12)':'rgba(255,255,255,0.02)',color:active?'#38bdf8':'#64748b',fontSize:12,fontWeight:active?700:400,cursor:'pointer'}} onClick={()=>{setChannel(ch.id);setMessages([]);}}>
                      {ch.emoji} {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DM list */}
      {!dmThread&&tab==='dms'&&(
        <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8}}>START A NEW MESSAGE</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:dmList.length>0?12:0}}>
            {staffList.filter(s=>s.name!==user.name).map(s=>(
              <button key={s.id} style={{padding:'4px 10px',borderRadius:16,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'#94a3b8',fontSize:11,cursor:'pointer'}} onClick={()=>startDM(s)}>{s.name}</button>
            ))}
          </div>
          {dmList.map(dm=>(
            <button key={dm.threadId} style={{width:'100%',padding:'10px 0',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer',textAlign:'left',display:'flex',gap:10,alignItems:'center'}} onClick={()=>setDmThread({otherName:dm.otherName,threadId:dm.threadId})}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(14,165,233,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#38bdf8',flexShrink:0}}>{dm.otherName.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>{dm.otherName}</div>
                <div style={{fontSize:11,color:'#64748b',textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>{dm.lastMessage}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {(tab==='channels'||dmThread)&&<div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
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
                <div style={{fontSize:14,color:'#f1f5f9',lineHeight:1.5}}>{msg.message}</div>
              </div>
              {isMe&&<div style={{fontSize:10,color:'#374151',marginRight:4}}>{time}</div>}
            </div>
          );
        })}
        <div ref={msgEnd}/>
      </div>}

      {/* Input */}
      {(tab==='channels'||dmThread)&&<div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:8,background:'rgba(10,10,20,0.95)'}}>
        <input style={{...S.inp,flex:1}} placeholder={dmThread?`Message ${dmThread.otherName}...`:`Message ${chanObj?chanObj.label:channel}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();send();}}}/>
        <button style={{padding:'10px 16px',borderRadius:10,border:'none',background:input.trim()?'linear-gradient(135deg,#0ea5e9,#0284c7)':'rgba(255,255,255,0.06)',color:input.trim()?'#fff':'#475569',fontSize:14,fontWeight:800,cursor:input.trim()?'pointer':'not-allowed',flexShrink:0}} onClick={send} disabled={!input.trim()||sending}>{sending?'...':'Send'}</button>
      </div>}
    </div>
  );
}

// ─── LOST & FOUND FORM ───────────────────────────────────────
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
      const res=await fetch(`${API}/submit-lost-found`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({description,foundAt:location,currentLocation:currentLoc,dayFound:day,foundBy:user.name,role:user.role})
      });
      const data=await res.json();
      setItemNumber(data.itemNumber||data.id||'');
      setSent(true);
    }catch(e){setSending(false);}
  }

  if(sent) return(
    <div style={{...S.root,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:32}}>
      <div style={{fontSize:48}}>📦</div>
      <div style={{fontSize:20,fontWeight:900,color:'#f1f5f9'}}>Item Logged</div>
      {itemNumber&&(
        <div style={{background:'rgba(249,115,22,0.12)',border:'2px solid rgba(249,115,22,0.5)',borderRadius:14,padding:'18px 28px',textAlign:'center'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#94a3b8',letterSpacing:'0.08em',marginBottom:6}}>ITEM NUMBER</div>
          <div style={{fontSize:32,fontWeight:900,color:'#fb923c',letterSpacing:'0.05em'}}>{itemNumber}</div>
          <div style={{fontSize:12,color:'#64748b',marginTop:6}}>Write this on the tag and attach to item</div>
        </div>
      )}
      <div style={{fontSize:14,color:'#64748b'}}>Lost & Found updated · Hub notified</div>
    </div>
  );

  return(
    <div style={S.root}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{fontSize:16,fontWeight:900,color:'#f1f5f9'}}>Log Lost Item</div>
      </div>
      <div style={S.body}>
        <div>
          <div style={S.label}>Day Found</div>
          <div style={{display:'flex',gap:6}}>
            {[['Thu','🔵 Thu'],['Fri','🟠 Fri'],['Sat','🟢 Sat'],['Sun','🟣 Sun']].map(([v,l])=>(
              <button key={v} style={{flex:1,padding:'10px 4px',borderRadius:8,border:`1px solid ${day===v?'rgba(14,165,233,0.5)':'rgba(255,255,255,0.1)'}`,background:day===v?'rgba(14,165,233,0.1)':'rgba(255,255,255,0.03)',color:day===v?'#38bdf8':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer'}} onClick={()=>setDay(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={S.label}>Where was it found?</div>
          <input style={S.inp} placeholder="e.g. Near Moon Stage Left" value={location} onChange={e=>setLocation(e.target.value)}/>
        </div>
        <div>
          <div style={S.label}>Where is it now?</div>
          <input style={S.inp} placeholder="e.g. Behind Moon Bar counter" value={currentLoc} onChange={e=>setCurrentLoc(e.target.value)}/>
        </div>
        <div>
          <div style={S.label}>Description</div>
          <textarea style={{...S.inp,minHeight:80,resize:'none'}} placeholder="Describe the item..." value={description} onChange={e=>setDescription(e.target.value)}/>
        </div>
        <button style={{...S.btn('rgba(249,115,22,0.9)'),opacity:(!description||!location||sending)?0.5:1}} disabled={!description||!location||sending} onClick={submit}>
          {sending?'Logging...':'📦 Log Item'}
        </button>
      </div>
    </div>
  );
}

// ─── HOME VIEW ───────────────────────────────────────────────
function HomeView({user,onLogout}){
  const [view,setView]=useState('home'); // home | call | chat | lf

  if(view==='call') return <NewCallView user={user} onBack={()=>setView('home')} onSubmit={()=>setView('home')}/>;
  if(view==='chat') return <ChatView user={user} onBack={()=>setView('home')}/>;
  if(view==='lf') return <LFView user={user} onBack={()=>setView('home')}/>;

  return(
    <div style={S.root}>
      <div style={S.hdr}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:900,color:'#f1f5f9'}}>👋 {user.name.split(' ')[0]}</div>
          <div style={{fontSize:12,color:'#64748b'}}>{user.role}{user.secondaryRole?` · ${user.secondaryRole}`:''} · {user.location}</div>
        </div>
        <button style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',padding:'6px 12px'}} onClick={onLogout}>Sign Out</button>
      </div>

      <div style={S.body}>
        {/* New Call */}
        <div>
          <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Submit a Call</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {CALL_TYPES.filter(ct=>!(ct.noRoles&&ct.noRoles.includes((user.role||'').toLowerCase()))).map(ct=>(
              <button key={ct.id} style={{padding:'16px 8px',borderRadius:14,border:`2px solid ${ct.color}`,background:`${ct.color}18`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5}} onClick={()=>setView('call')}>
                <span style={{fontSize:24}}>{ct.emoji}</span>
                <span style={{fontSize:11,fontWeight:900,color:'#f1f5f9',textAlign:'center',lineHeight:1.2}}>{ct.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <button style={{...S.section,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left'}} onClick={()=>setView('chat')}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>💬</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#38bdf8'}}>Festival Chat</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Groups · Direct Messages · Alerts</div>
          </div>
          <div style={{marginLeft:'auto',color:'#38bdf8',fontSize:16}}>→</div>
        </button>

        {/* Lost & Found */}
        <button style={{...S.section,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left'}} onClick={()=>setView('lf')}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(249,115,22,0.15)',border:'1px solid rgba(249,115,22,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📦</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#fb923c'}}>Lost & Found</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Log a found item</div>
          </div>
          <div style={{marginLeft:'auto',color:'#fb923c',fontSize:16}}>→</div>
        </button>

        {/* L&F Lookup */}
        <a href="https://fdm2026.netlify.app/lostfound" target="_blank" style={{...S.section,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textDecoration:'none'}}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🔍</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:'#c4b5fd'}}>L&F Lookup</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Search all logged items</div>
          </div>
          <div style={{marginLeft:'auto',color:'#c4b5fd',fontSize:16}}>→</div>
        </a>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
function FieldApp(){
  const [user,setUser]=useState(null);

  return user
    ? <HomeView user={user} onLogout={()=>setUser(null)}/>
    : <LoginView onLogin={setUser}/>;
}
