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
  // Admin & Med
  a1:'Admin',a2:'Admin',a3:'Admin',
  m1:'AdminMed',m2:'AdminMed',
  // Bars — new codes
  mb1:'MoonBar',
  lagb:'LagBar',
  lafb:'LafBar',
  slb:'SunBarL',
  srb:'SunBarR',
  cb:'CabBar',
  ffb:'FamilyBar',
  etb:'EverythingBar',
  // Bars — old codes (backward compat)
  msb1:'MoonBar',msb2:'MoonBar',
  ssbl:'SunBarL',ssbr:'SunBarR',
  etecm:'EverythingBar',mtm:'EverythingBar',
  // Stages — new codes
  ms:'MoonST',
  lags:'LagST',
  lafs:'LafST',
  sst:'SunST',
  cst:'CabST',
  ffs:'FamST',
  // Stages — old codes (backward compat)
  msm:'MoonST',ssm:'SunST',lafm:'LafST',lagm:'LagST',
  // Misc
  hos:'Hospitality',hosp:'Hospitality',hospitality:'Hospitality',
  mt:'AllStaff',  // Merch Tent
  ovn:'AllStaff', // Overnight — handled separately by role name check
  misc:'AllStaff',
  gil:'AllStaff',gir:'AllStaff',gf:'AllStaff', // Greeters
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
              // Overnight role check (by name or code)
              if(r==='ovn'||r.includes('overnight')) {onLogin({...s,role:'Overnight Team'});return;}
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
const CHANNEL_LABELS={
  AllStaff:'All Staff',Hospitality:'Hospitality',
  Bars:'All Bars',MoonBar:'Moon Bar',SunBarL:'Sun Bar Left',SunBarR:'Sun Bar Right',
  LafBar:'Lafayette Bar',LagBar:'Lagniappe Bar',FamilyBar:'Family Bar',
  CabBar:'Cabaret Bar',EverythingBar:'EEC',
  MoonST:'Moon Stage',SunST:'Sun Stage',LafST:'Lafayette Stage',
  LagST:'Lagniappe Stage',FamST:'Family Fete Stage',CabST:'Cabaret Stage',
  Admin:'Admin',AdminMed:'Medical',
};

function ChatInbox({user,onBack}){
  const [convos,setConvos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [openConvo,setOpenConvo]=useState(null);
  const [newMsg,setNewMsg]=useState(false);

  useEffect(()=>{
    fetchConvos();
    const iv=setInterval(fetchConvos,10000);
    return()=>clearInterval(iv);
  },[]);

  async function fetchConvos(){
    try{
      const res=await fetch(`${API}/get-conversations?myName=${encodeURIComponent(user.name)}&myRole=${encodeURIComponent(user.role||'')}`);
      const data=await res.json();
      setConvos(data.conversations||[]);
    }catch(e){}
    setLoading(false);
  }

  if(openConvo) return <ConversationView user={user} convo={openConvo} onBack={()=>{setOpenConvo(null);fetchConvos();}}/>;
  if(newMsg) return <NewMessageView user={user} onBack={()=>setNewMsg(false)} onOpen={c=>{setNewMsg(false);setOpenConvo(c);}}/>;

  function timeAgo(ts){
    if(!ts) return '';
    const d=new Date(ts);
    const now=new Date();
    const diff=(now-d)/1000;
    if(diff<60) return 'now';
    if(diff<3600) return Math.floor(diff/60)+'m';
    if(diff<86400) return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'});
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }

  const myChannel=roleChannel(user.role);

  return(
    <div style={{...S.root,display:'flex',flexDirection:'column',height:'100vh'}}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{flex:1,fontSize:16,fontWeight:900,color:'#f1f5f9'}}>Messages</div>
        <button style={{padding:'7px 14px',borderRadius:10,border:'1px solid rgba(14,165,233,0.3)',background:'rgba(14,165,233,0.08)',color:'#38bdf8',fontSize:13,fontWeight:700,cursor:'pointer'}} onClick={()=>setNewMsg(true)}>✏️ New</button>
      </div>

      {loading&&<div style={{textAlign:'center',color:'#475569',padding:32}}>Loading...</div>}
      <div style={{flex:1,overflowY:'auto'}}>
        {!loading&&convos.length===0&&(
          <div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:32,marginBottom:12}}>💬</div>
            <div style={{fontSize:16,fontWeight:700,color:'#f1f5f9',marginBottom:4}}>No messages yet</div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>Start a conversation or join a channel</div>
            <button style={{padding:'12px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#0ea5e9,#0284c7)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}} onClick={()=>setNewMsg(true)}>Start a Conversation</button>
          </div>
        )}
        {convos.map(c=>{
          const label=c.isDM?(c.otherName||'Direct Message'):(CHANNEL_LABELS[c.channel]||c.channel);
          const isMyChannel=c.channel===myChannel||c.channel==='AllStaff';
          return(
            <button key={c.id} style={{width:'100%',padding:'14px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer',textAlign:'left',display:'flex',gap:12,alignItems:'center'}} onClick={()=>setOpenConvo(c)}>
              <div style={{width:46,height:46,borderRadius:'50%',background:c.isDM?'rgba(99,102,241,0.2)':isMyChannel?'rgba(14,165,233,0.2)':'rgba(255,255,255,0.08)',border:`1px solid ${c.isDM?'rgba(99,102,241,0.4)':isMyChannel?'rgba(14,165,233,0.4)':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:c.isDM?14:18,flexShrink:0,color:c.isDM?'#a5b4fc':isMyChannel?'#38bdf8':'#64748b'}}>
                {c.isDM?(c.otherName||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase():'#'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3}}>
                  <div style={{fontSize:15,fontWeight:700,color:'#f1f5f9',textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap',maxWidth:'70%'}}>{label}</div>
                  <div style={{fontSize:11,color:'#475569',flexShrink:0,marginLeft:8}}>{timeAgo(c.lastAt)}</div>
                </div>
                <div style={{fontSize:13,color:'#64748b',textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>
                  {c.lastFrom&&c.lastFrom!==user.role&&c.lastFrom!==user.name?`${c.lastFrom}: `:''}{c.lastMessage}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConversationView({user,convo,onBack}){
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [sending,setSending]=useState(false);
  const msgEnd=useRef(null);
  const label=convo.isDM?(convo.otherName||'Direct Message'):(CHANNEL_LABELS[convo.channel]||convo.channel);

  useEffect(()=>{
    fetchMsgs();
    const iv=setInterval(fetchMsgs,6000);
    return()=>clearInterval(iv);
  },[]);

  async function fetchMsgs(){
    try{
      const url=convo.isDM
        ?`${API}/get-messages?dmThread=${encodeURIComponent(convo.id)}`
        :`${API}/get-messages?channel=${convo.channel}&limit=80`;
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
        ?{fromName:user.name,fromRole:user.role,channel:`DM_${[user.name,convo.otherName].sort().join('_')}`,message:input.trim(),isDM:true,toName:convo.otherName,threadId:convo.id}
        :{fromName:user.name,fromRole:user.role,channel:convo.channel,message:input.trim()};
      await fetch(`${API}/send-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      setInput('');
      await fetchMsgs();
    }catch(e){}
    setSending(false);
  }

  return(
    <div style={{...S.root,display:'flex',flexDirection:'column',height:'100vh',maxHeight:'100vh'}}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:900,color:'#f1f5f9'}}>{label}</div>
          {!convo.isDM&&<div style={{fontSize:11,color:'#64748b'}}>Group channel</div>}
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8,minHeight:0}}>
        {messages.length===0&&<div style={{textAlign:'center',color:'#374151',fontSize:13,padding:'24px 0'}}>No messages yet — say something!</div>}
        {messages.map(msg=>{
          const isMe=msg.fromName===user.name||(msg.fromRole&&msg.fromRole===user.role);
          const isAlert=msg.isAlert;
          const time=msg.sentAt?new Date(msg.sentAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}):'';
          const sentToMultiple=msg.recipients&&msg.recipients.includes(',');
          if(isAlert) return(
            <div key={msg.id} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'8px 12px'}}>
              <div style={{fontSize:10,fontWeight:800,color:'#fca5a5',marginBottom:2}}>🚨 ALERT · {time}</div>
              <div style={{fontSize:13,color:'#fecaca'}}>{msg.message}</div>
            </div>
          );
          return(
            <div key={msg.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',gap:2}}>
              {!isMe&&<div style={{fontSize:10,color:'#64748b',marginLeft:4}}>{msg.fromRole||msg.fromName} · {time}</div>}
              <div style={{maxWidth:'82%',background:isMe?'rgba(14,165,233,0.25)':'rgba(255,255,255,0.07)',border:`1px solid ${isMe?'rgba(14,165,233,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'9px 13px'}}>
                <div style={{fontSize:14,color:'#f1f5f9',lineHeight:1.5}}>{msg.message}</div>
                {sentToMultiple&&!isMe&&<div style={{fontSize:10,color:'#475569',marginTop:3}}>sent to multiple</div>}
              </div>
              {isMe&&<div style={{fontSize:10,color:'#374151',marginRight:4}}>{time}</div>}
            </div>
          );
        })}
        <div ref={msgEnd}/>
      </div>
      <div style={{padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:8,background:'rgba(10,10,20,0.95)'}}>
        <input style={{...S.inp,flex:1}} placeholder={`Message ${label}...`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();send();}}}/>
        <button style={{padding:'10px 16px',borderRadius:10,border:'none',background:input.trim()?'linear-gradient(135deg,#0ea5e9,#0284c7)':'rgba(255,255,255,0.06)',color:input.trim()?'#fff':'#475569',fontSize:14,fontWeight:800,cursor:input.trim()?'pointer':'not-allowed',flexShrink:0}} onClick={send} disabled={!input.trim()||sending}>{sending?'...':'Send'}</button>
      </div>
    </div>
  );
}

function NewMessageView({user,onBack,onOpen}){
  const [staffList,setStaffList]=useState([]);
  const [search,setSearch]=useState('');

  useEffect(()=>{
    fetch(`${API}/get-staff-list`).then(r=>r.json()).then(d=>setStaffList(d.staff||[])).catch(()=>{});
  },[]);

  const myChannel=roleChannel(user.role);

  function openChannel(ch){
    onOpen({id:ch,isDM:false,channel:ch,lastMessage:'',lastFrom:'',lastAt:'',recipients:ch});
  }
  function openDM(s){
    const threadId=`DM_${[user.name,s.name].sort().join('_')}`;
    onOpen({id:threadId,isDM:true,channel:`DM_${[user.name,s.name].sort().join('_')}`,otherName:s.name,lastMessage:'',lastFrom:'',lastAt:'',recipients:''});
  }

  const filteredStaff=search.length>=2?staffList.filter(s=>s.name!==user.name&&((s.name||'').toLowerCase().includes(search.toLowerCase())||(s.role||'').toLowerCase().includes(search.toLowerCase()))):staffList.filter(s=>s.name!==user.name);

  return(
    <div style={{...S.root,display:'flex',flexDirection:'column',height:'100vh'}}>
      <div style={S.hdr}>
        <BackBtn onBack={onBack}/>
        <div style={{fontSize:16,fontWeight:900,color:'#f1f5f9'}}>New Message</div>
      </div>
      <div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <input style={{...S.inp}} placeholder="Search by name or role..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {/* Group channels */}
        {!search&&<>
          <div style={{padding:'8px 16px 4px',fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em'}}>Channels</div>
          {CHANNEL_GROUPS.flatMap(g=>g.channels).map(ch=>(
            <button key={ch.id} style={{width:'100%',padding:'12px 16px',background:ch.id===myChannel||ch.id==='AllStaff'?'rgba(14,165,233,0.04)':'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:12}} onClick={()=>openChannel(ch.id)}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#64748b',flexShrink:0}}>#</div>
              <div style={{fontSize:14,fontWeight:ch.id===myChannel?700:400,color:ch.id===myChannel?'#38bdf8':'#f1f5f9'}}>{ch.label}</div>
            </button>
          ))}
          <div style={{padding:'8px 16px 4px',fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em'}}>Direct Messages</div>
        </>}
        {filteredStaff.map(s=>(
          <button key={s.id} style={{width:'100%',padding:'12px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:12}} onClick={()=>openDM(s)}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#a5b4fc',flexShrink:0}}>{(s.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'#f1f5f9'}}>{s.role||s.name}</div>
              {s.role&&s.name&&<div style={{fontSize:11,color:'#64748b',marginTop:1}}>{s.name}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Wrap ChatInbox as ChatView for backward compat
function ChatView({user,onBack}){
  return <ChatInbox user={user} onBack={onBack}/>;
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
  const [arrived,setArrived]=useState(false);
  const [arrivedTime,setArrivedTime]=useState('');
  const [tab,setTab]=useState('police');
  const [logs,setLogs]=useState([]);
  const [view,setView]=useState('home');

  // Per-tab form state
  const [time,setTime]=useState('');
  const [what,setWhat]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);

  // EOD state
  const [eodIncidents,setEodIncidents]=useState('');
  const [eodLF,setEodLF]=useState('');
  const [eodNotes,setEodNotes]=useState('');
  const [eodSending,setEodSending]=useState(false);
  const [eodSent,setEodSent]=useState(false);

  if(view==='lf') return <LFView user={user} onBack={()=>setView('home')}/>;

  const TABS=[
    {id:'police',label:'Police Called',color:'rgba(37,99,235,0.7)',icon:'🚔'},
    {id:'medical',label:'Medical Called',color:'rgba(147,51,234,0.7)',icon:'🏥'},
    {id:'fire',label:'Fire / Life Safety',color:'rgba(220,38,38,0.7)',icon:'🔥'},
    {id:'lf',label:'Lost & Found',color:'rgba(249,115,22,0.7)',icon:'📦'},
    {id:'other',label:'Other',color:'rgba(100,116,139,0.7)',icon:'📋'},
    {id:'eod',label:'EOD Report',color:'rgba(99,102,241,0.7)',icon:'🌙'},
  ];

  const activeTab=TABS.find(t=>t.id===tab);

  function resetForm(){setTime('');setWhat('');setSent(false);}
  function handleTabChange(t){setTab(t);resetForm();}

  async function sendArrival(){
    const ts=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const msg=`✅ OVERNIGHT CREW ONSITE

${user.name} has arrived at McPike Park.
Time: ${ts}

Fête de Marquette 2026 Operations`;
    await fetch(`${API}/send-sms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'+16082289692',message:msg})}).catch(()=>{});
    setArrived(true);
    setArrivedTime(ts);
  }

  async function submitLog(){
    if(!what.trim()) return;
    setSending(true);
    const ts=time||new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const label=activeTab?.label||tab;
    const msg=`📋 OVERNIGHT LOG — ${label.toUpperCase()}

Time: ${ts}
Logged by: ${user.name}

${what}

Fête de Marquette 2026`;
    await fetch(`${API}/send-sms`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:'+16082289692',message:msg})}).catch(()=>{});
    setLogs(p=>[{id:Date.now(),type:label,time:ts,what,icon:activeTab?.icon||'📋'},...p]);
    setSent(true);
    setTime('');setWhat('');
    setSending(false);
  }

  async function submitEOD(){
    if(!eodNotes.trim()) return;
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

  return(
    <div style={S.root}>
      {/* HEADER */}
      <div style={S.hdr}>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:900}}>{user.name.split(' ')[0]} — Overnight</div>
          <div style={{fontSize:11,color:'#64748b'}}>McPike Park · FDM 2026</div>
        </div>
        <button style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',padding:'6px 12px'}} onClick={onLogout}>Sign Out</button>
      </div>

      {/* I AM HERE */}
      <div style={{padding:'12px 16px 0'}}>
        {!arrived?(
          <button style={{width:'100%',padding:'18px',borderRadius:14,border:'2px solid rgba(34,197,94,0.6)',background:'linear-gradient(135deg,rgba(22,163,74,0.2),rgba(16,185,129,0.1))',cursor:'pointer',display:'flex',alignItems:'center',gap:14,boxShadow:'0 0 20px rgba(34,197,94,0.15)'}} onClick={sendArrival}>
            <span style={{fontSize:28}}>✋</span>
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:17,fontWeight:900,color:'#4ade80'}}>I Am Here</div>
              <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Tap to notify admin you have arrived</div>
            </div>
          </button>
        ):(
          <div style={{padding:'12px 14px',borderRadius:12,border:'1px solid rgba(34,197,94,0.4)',background:'rgba(22,163,74,0.06)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:18}}>✅</span>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#4ade80'}}>Admin Notified — Onsite at {arrivedTime}</div>
            </div>
          </div>
        )}
      </div>

      {/* TABS - scrollable row */}
      <div style={{overflowX:'auto',display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,0.08)',margin:'12px 0 0',padding:'0 16px',WebkitOverflowScrolling:'touch'}}>
        {TABS.map(t=>(
          <button key={t.id} style={{flexShrink:0,padding:'10px 14px',background:'none',border:'none',borderBottom:`2px solid ${tab===t.id?'#38bdf8':'transparent'}`,color:tab===t.id?'#38bdf8':'#64748b',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}} onClick={()=>handleTabChange(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{...S.body,paddingTop:12}}>

        {/* POLICE / MEDICAL / FIRE / OTHER LOG TABS */}
        {['police','medical','fire','other'].includes(tab)&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {sent&&<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:'10px 14px',color:'#4ade80',fontSize:13,fontWeight:700,textAlign:'center'}}>✅ Logged and sent to admin</div>}
            <div style={{background:`${activeTab?.color?.replace('0.7','0.08')}`,border:`1px solid ${activeTab?.color?.replace('0.7','0.3')}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#f1f5f9',marginBottom:2}}>{activeTab?.icon} {activeTab?.label}</div>
              <div style={{fontSize:12,color:'#64748b'}}>Log this event — admin notified immediately</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Time of Call / Event</div>
              <input type="time" style={{...S.inp}} value={time} onChange={e=>setTime(e.target.value)}/>
              <div style={{fontSize:11,color:'#374151',marginTop:4}}>Leave blank to use current time</div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>What Happened?</div>
              <textarea style={{...S.inp,minHeight:110,resize:'none'}} placeholder="Describe what happened in detail..." value={what} onChange={e=>setWhat(e.target.value)}/>
            </div>
            <button style={{padding:'16px',borderRadius:12,border:'none',background:'rgba(14,165,233,0.8)',color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer',opacity:(!what.trim()||sending)?0.4:1}} disabled={!what.trim()||sending} onClick={submitLog}>
              {sending?'Logging...':'Log Event — Notify Admin'}
            </button>
            {/* Recent logs for this type */}
            {logs.filter(l=>l.type===activeTab?.label).length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Logged Tonight</div>
                {logs.filter(l=>l.type===activeTab?.label).map(log=>(
                  <div key={log.id} style={{...S.card,padding:'10px 12px',marginBottom:6}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:3}}>{log.time}</div>
                    <div style={{fontSize:13,color:'#f1f5f9'}}>{log.what}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOST & FOUND TAB */}
        {tab==='lf'&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.25)',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fb923c',marginBottom:2}}>📦 Lost & Found</div>
              <div style={{fontSize:12,color:'#64748b'}}>Log items found overnight</div>
            </div>
            <button style={{...S.card,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,border:'1px solid rgba(249,115,22,0.2)',background:'rgba(249,115,22,0.06)'}} onClick={()=>setView('lf')}>
              <span style={{fontSize:20}}>📦</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:'#fb923c'}}>Log Found Item</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Add to Lost & Found system</div>
              </div>
              <span style={{color:'#fb923c'}}>→</span>
            </button>
            <a href="https://fdm2026.netlify.app/lostfound" target="_blank" style={{...S.card,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,textDecoration:'none',border:'1px solid rgba(139,92,246,0.2)',background:'rgba(139,92,246,0.06)'}}>
              <span style={{fontSize:20}}>🔍</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:'#c4b5fd'}}>L&F Lookup</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Search all items</div>
              </div>
              <span style={{color:'#c4b5fd'}}>→</span>
            </a>
            {/* Also log as an event */}
            <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:4}}>Or log a note about L&F</div>
            <textarea style={{...S.inp,minHeight:80,resize:'none'}} placeholder="e.g. Found backpack near Moon Stage at midnight..." value={what} onChange={e=>setWhat(e.target.value)}/>
            {what.trim()&&<button style={{padding:'14px',borderRadius:12,border:'none',background:'rgba(249,115,22,0.7)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer'}} onClick={submitLog}>Log Note — Notify Admin</button>}
          </div>
        )}

        {/* EOD REPORT TAB */}
        {tab==='eod'&&(
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {eodSent?(
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{fontSize:52,marginBottom:12}}>🌙</div>
                <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>EOD Report Sent</div>
                <div style={{fontSize:13,color:'#64748b'}}>Admin notified. Good night!</div>
              </div>
            ):<>
              <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:16,fontWeight:900,color:'#a5b4fc',marginBottom:2}}>🌙 End of Night Report</div>
                <div style={{fontSize:12,color:'#64748b'}}>Complete before leaving. Sends to admin.</div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Incidents (Police / Medical / Fire)</div>
                <textarea style={{...S.inp,minHeight:80,resize:'none'}} placeholder="List any incidents that occurred tonight..." value={eodIncidents} onChange={e=>setEodIncidents(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Lost & Found Items</div>
                <textarea style={{...S.inp,minHeight:70,resize:'none'}} placeholder="List any items found overnight..." value={eodLF} onChange={e=>setEodLF(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>General Notes <span style={{color:'#ef4444'}}>*</span></div>
                <textarea style={{...S.inp,minHeight:100,resize:'none'}} placeholder="How did the night go? Any concerns or follow-ups?" value={eodNotes} onChange={e=>setEodNotes(e.target.value)}/>
              </div>
              <button style={{padding:'17px',borderRadius:12,border:'none',background:eodNotes.trim()?'linear-gradient(135deg,rgba(99,102,241,0.9),rgba(79,70,229,0.9))':'rgba(255,255,255,0.06)',color:eodNotes.trim()?'#fff':'#475569',fontSize:16,fontWeight:900,cursor:eodNotes.trim()?'pointer':'not-allowed',opacity:eodSending?0.6:1}} disabled={!eodNotes.trim()||eodSending} onClick={submitEOD}>
                {eodSending?'Sending...':'🌙 Submit EOD Report'}
              </button>
            </>}
          </div>
        )}

        {/* TONIGHT'S LOG — always at bottom */}
        {logs.length>0&&tab!=='eod'&&(
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Tonight's Full Log ({logs.length})</div>
            {logs.map(log=>(
              <div key={log.id} style={{...S.card,padding:'9px 12px',marginBottom:5,display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:14,flexShrink:0}}>{log.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#94a3b8'}}>{log.type}</div>
                    <div style={{fontSize:11,color:'#475569'}}>{log.time}</div>
                  </div>
                  <div style={{fontSize:12,color:'#f1f5f9',lineHeight:1.4}}>{log.what.slice(0,80)}{log.what.length>80?'...':''}</div>
                </div>
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
  const [unread,setUnread]=useState(0);
  const [notifQueue,setNotifQueue]=useState([]); // array of {from, message, channel, id}
  const [notifIdx,setNotifIdx]=useState(0);       // which one we're viewing
  const [quickReply,setQuickReply]=useState('');
  const [replySending,setReplySending]=useState(false);
  const seenIds=React.useRef(new Set());

  // Poll for new messages every 15 seconds when on home screen
  React.useEffect(()=>{
    if(view!=='home') return;
    const poll=async()=>{
      try{
        const ch=roleChannel(user.role);
        const res=await fetch(`${API}/get-messages?channel=${ch}&limit=5`);
        const data=await res.json();
        const msgs=data.messages||[];
        if(msgs.length===0) return;
        const latest=msgs[msgs.length-1];
        if(latest.id&&!seenIds.current.has(latest.id)&&latest.fromName!==user.name){
          if(seenIds.current.size>0){
            // New message from someone else
            setUnread(p=>p+1);
            setNotif({from:latest.fromName,message:latest.message,channel:ch,fromRole:latest.fromRole});
            // Banner stays until dismissed or replied to
          }
          seenIds.current.add(latest.id);
        }
      }catch(e){}
    };
    poll();
    const iv=setInterval(poll,15000);
    return()=>clearInterval(iv);
  },[view]);

  const currentNotif=notifQueue[notifIdx]||null;
  async function sendQuickReply(){
    if(!quickReply.trim()||replySending||!currentNotif) return;
    setReplySending(true);
    // Reply to all original channels if available
    const replyChannels=currentNotif.recipients?currentNotif.recipients.split(',').filter(Boolean):[currentNotif.channel];
    await fetch(`${API}/send-message`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fromName:user.name,fromRole:user.role,channels:replyChannels,message:quickReply.trim()})}).catch(()=>{});
    setQuickReply('');
    setReplySending(false);
    dismissNotif();
  }
  function dismissNotif(){
    setNotifQueue(q=>q.filter((_,i)=>i!==notifIdx));
    setNotifIdx(0);
    setQuickReply('');
  }

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

        {/* MESSAGE NOTIFICATION BANNER */}
        {currentNotif&&(
          <div style={{borderRadius:14,border:'2px solid rgba(249,115,22,0.8)',background:'linear-gradient(135deg,rgba(249,115,22,0.2),rgba(234,88,12,0.15))',padding:'12px 14px',display:'flex',flexDirection:'column',gap:8,boxShadow:'0 0 20px rgba(249,115,22,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#fb923c',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                💬 {currentNotif.channel}
                {notifQueue.length>1&&<span style={{marginLeft:8,background:'rgba(249,115,22,0.3)',borderRadius:10,padding:'1px 7px',fontSize:10}}>{notifIdx+1} of {notifQueue.length}</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                {notifQueue.length>1&&<>
                  <button style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:6,color:'#f1f5f9',fontSize:12,cursor:'pointer',padding:'3px 8px'}} onClick={()=>setNotifIdx(p=>Math.max(0,p-1))} disabled={notifIdx===0}>←</button>
                  <button style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:6,color:'#f1f5f9',fontSize:12,cursor:'pointer',padding:'3px 8px'}} onClick={()=>setNotifIdx(p=>Math.min(notifQueue.length-1,p+1))} disabled={notifIdx===notifQueue.length-1}>→</button>
                </>}
                <button style={{background:'none',border:'none',color:'#475569',fontSize:16,cursor:'pointer',padding:0}} onClick={()=>dismissNotif()}>✕</button>
              </div>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:'#94a3b8'}}>{currentNotif.fromRole||currentNotif.from}</div>
            <div style={{fontSize:15,color:'#f1f5f9',lineHeight:1.4}}>{currentNotif.message}</div>
            {false&&<div style={{fontSize:14,fontWeight:800,color:'#4ade80'}}>✅ Reply sent!</div>}
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <div style={{fontSize:11,fontWeight:800,color:'#fb923c',textTransform:'uppercase',letterSpacing:'0.06em'}}>↩ Reply to {currentNotif.channel}</div>
              <textarea style={{...S.inp,minHeight:70,resize:'none',fontSize:15,borderColor:'rgba(249,115,22,0.4)'}} placeholder="Type your reply here..." value={quickReply} onChange={e=>setQuickReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendQuickReply();}}} autoFocus/>
              <div style={{display:'flex',gap:8}}>
                <button style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:quickReply.trim()?'linear-gradient(135deg,rgba(249,115,22,0.9),rgba(234,88,12,0.9))':'rgba(255,255,255,0.06)',color:quickReply.trim()?'#fff':'#475569',fontSize:14,fontWeight:900,cursor:'pointer'}} onClick={sendQuickReply} disabled={!quickReply.trim()||replySending}>{replySending?'Sending...':'Send Reply'}</button>
                <button style={{padding:'12px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#64748b',fontSize:13,fontWeight:700,cursor:'pointer'}} onClick={()=>{setView('chat');dismissNotif();setUnread(0);}}>Open Chat</button>
              </div>
            </div>
          </div>
        )}

        {/* FESTIVAL CHAT — full width top */}
        <button style={{...S.card,padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left',border:`1px solid ${unread>0?'rgba(14,165,233,0.5)':'rgba(14,165,233,0.2)'}`,background:unread>0?'rgba(14,165,233,0.1)':'rgba(14,165,233,0.06)'}} onClick={()=>{setView('chat');setUnread(0);}}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,position:'relative'}}>
            💬
            {unread>0&&<div style={{position:'absolute',top:-6,right:-6,background:'#ef4444',color:'#fff',fontSize:10,fontWeight:900,borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{unread>9?'9+':unread}</div>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:'#38bdf8'}}>Festival Chat</div>
            <div style={{fontSize:12,color:unread>0?'#38bdf8':'#64748b',marginTop:2}}>{unread>0?`${unread} new message${unread>1?'s':''}`:' Channels · Direct Messages · Alerts'}</div>
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
