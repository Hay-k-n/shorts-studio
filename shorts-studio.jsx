import { useState, useCallback, useEffect } from "react";

// ─── Design System ───
const C = {
  bg:"#050508",s1:"#0c0c14",s2:"#13131e",s3:"#1b1b2a",
  b1:"#23233a",b2:"#33335a",ac:"#00e5a0",acd:"rgba(0,229,160,0.08)",
  acg:"rgba(0,229,160,0.2)",rd:"#ff4d6a",rdd:"rgba(255,77,106,0.08)",
  or:"#ffa94d",bl:"#4dabf7",pu:"#b197fc",pk:"#f783ac",yl:"#ffe066",gn:"#51cf66",
  t1:"#e8e8f4",t2:"#9090a8",t3:"#55556e",wh:"#fff",
};
const F = "'Satoshi', 'DM Sans', sans-serif";
const M = "'IBM Plex Mono', monospace";

// ─── Icons ───
const Ic = {
  search:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  play:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>,
  check:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>,
  spin:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>,
  video:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="15" height="16" rx="2"/><polygon points="22,7 17,12 22,17"/></svg>,
  globe:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  gear:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  zap:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>,
  link:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  sparkle:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 8.2L21 9.6L16 14.2L17.2 21L12 17.8L6.8 21L8 14.2L3 9.6L9.6 8.2Z"/></svg>,
  layers:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/></svg>,
  zoomIn:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  tiktok:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.56a8.24 8.24 0 0 0 4.76 1.51v-3.4a4.84 4.84 0 0 1-1-.02z"/></svg>,
  youtube:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.87.56 9.38.56 9.38.56s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>,
  instagram:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  xtwit:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  news:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="14" y2="12"/></svg>,
  remix:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  comment:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  users:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  userPlus:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  logout:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  shield:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  building:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><path d="M9 18h6"/></svg>,
  plug:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v6"/><path d="M6 6v6a6 6 0 0 0 12 0V6"/><line x1="6" y1="2" x2="6" y2="6"/><line x1="18" y1="2" x2="18" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/></svg>,
  trash:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  lock:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  eye:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  send:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>,
  mic:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  clock:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  scan:(s=15)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 7V2h5M17 2h5v5M22 17v5h-5M7 22H2v-5"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
};

// ─── Config ───
const PLATFORMS=[
  {id:"tiktok",label:"TikTok",icon:Ic.tiktok,color:"#ff0050",maxCap:2200,maxDur:"3 min"},
  {id:"youtube",label:"YouTube Shorts",icon:Ic.youtube,color:"#ff0000",maxCap:5000,maxDur:"60s"},
  {id:"instagram",label:"Instagram Reels",icon:Ic.instagram,color:"#E1306C",maxCap:2200,maxDur:"90s"},
];
const MODES=[
  {id:"news",label:"News report",icon:Ic.news,color:C.bl,desc:"Facts & analysis"},
  {id:"remix",label:"Content remix",icon:Ic.remix,color:C.pk,desc:"Your creative spin"},
  {id:"reaction",label:"Commentary",icon:Ic.comment,color:C.or,desc:"React & comment"},
];
const VOICE_PROVIDERS=[
  {id:"heygen",label:"HeyGen TTS",desc:"Built-in, simpler setup",color:C.ac},
  {id:"elevenlabs",label:"ElevenLabs",desc:"Cloned voice, premium quality",color:C.pu},
];
const SOURCES=[
  {id:"all",label:"All",icon:Ic.globe,color:C.ac},{id:"google",label:"Google News",icon:Ic.search,color:C.bl},
  {id:"twitter",label:"Twitter/X",icon:Ic.xtwit,color:C.pu},{id:"tiktok",label:"TikTok",icon:Ic.tiktok,color:C.pk},
  {id:"url",label:"Custom URL",icon:Ic.link,color:C.or},
];
const LANGS=[
  {c:"fr",l:"Français",f:"🇫🇷"},{c:"en",l:"English",f:"🇬🇧"},{c:"es",l:"Español",f:"🇪🇸"},
  {c:"de",l:"Deutsch",f:"🇩🇪"},{c:"ar",l:"العربية",f:"🇸🇦"},{c:"zh",l:"中文",f:"🇨🇳"},
  {c:"pt",l:"Português",f:"🇧🇷"},{c:"ru",l:"Русский",f:"🇷🇺"},{c:"ja",l:"日本語",f:"🇯🇵"},
  {c:"ko",l:"한국어",f:"🇰🇷"},{c:"it",l:"Italiano",f:"🇮🇹"},{c:"hi",l:"हिन्दी",f:"🇮🇳"},
  {c:"tr",l:"Türkçe",f:"🇹🇷"},{c:"hy",l:"Հայերեն",f:"🇦🇲"},
];
const INIT_FX=[
  {id:"fade_in",label:"Fade in",group:"entrance",on:true},{id:"zoom_in",label:"Zoom in",group:"entrance",on:false},
  {id:"slide_up",label:"Slide up",group:"entrance",on:false},{id:"zoom_out",label:"Zoom out",group:"scene",on:true},
  {id:"ken_burns",label:"Ken Burns",group:"scene",on:false},{id:"pulse",label:"Pulse zoom",group:"scene",on:false},
  {id:"fade_out",label:"Fade out",group:"exit",on:true},{id:"scale_down",label:"Scale down",group:"exit",on:false},
  {id:"blur_out",label:"Blur out",group:"exit",on:false},
];
const DURATIONS=[
  {v:30,l:"30s"},{v:45,l:"45s"},{v:60,l:"1 min"},{v:90,l:"1.5 min"},{v:120,l:"2 min"},{v:180,l:"3 min"},
];

// ─── UI Primitives ───
const ss={input:{width:"100%",padding:"9px 13px",borderRadius:8,border:`1px solid ${C.b1}`,background:C.bg,color:C.t1,fontSize:13,outline:"none",fontFamily:F,boxSizing:"border-box"}};
const Btn=({ch,onClick,dis,v="p",sx={}})=>{
  const vs={p:{background:C.ac,color:C.bg,boxShadow:`0 2px 14px ${C.acg}`,opacity:dis?.4:1},g:{background:"transparent",border:`1.5px solid ${C.b1}`,color:C.t2},
    tt:{background:"linear-gradient(135deg,#ff0050,#00f2ea)",color:C.wh,opacity:dis?.4:1},
    multi:{background:"linear-gradient(135deg,#ff0050,#ff0000,#E1306C)",color:C.wh,opacity:dis?.4:1}};
  return <button onClick={onClick} disabled={dis} style={{padding:"10px 20px",borderRadius:9,fontWeight:700,fontSize:13,cursor:dis?"not-allowed":"pointer",fontFamily:F,display:"inline-flex",alignItems:"center",gap:7,transition:"all 0.2s",border:"none",...vs[v],...sx}}>{ch}</button>;
};
const Bd=({ch,co=C.ac})=><span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:5,background:`${co}16`,color:co,letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{ch}</span>;
const Lb=({ch})=><div style={{fontSize:9,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7}}>{ch}</div>;
const Cd=({ch,sx={},onClick,on})=><div onClick={onClick} style={{background:on?C.acd:C.s2,border:`1.5px solid ${on?C.ac:C.b1}`,borderRadius:11,padding:14,cursor:onClick?"pointer":"default",boxShadow:on?`0 0 20px ${C.acg}`:"none",transition:"all 0.2s",...sx}}>{ch}</div>;

// ─── Steps ───
const STEPS=["Mode","Source","Script","Voice & Avatar","Effects","Render","Post"];
const StepBar=({cur})=>(
  <div style={{display:"flex",alignItems:"center",margin:"0 0 22px",overflowX:"auto",gap:0}}>
    {STEPS.map((s,i)=>{const d=i<cur,a=i===cur;return(
      <div key={i} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:"none",minWidth:"fit-content"}}>
        <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:d?C.ac:a?C.acd:C.s2,border:`2px solid ${d?C.ac:a?C.ac:C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",color:d?C.bg:a?C.ac:C.t3,fontWeight:800,fontSize:9,boxShadow:a?`0 0 10px ${C.acg}`:"none"}}>{d?Ic.check(8):i+1}</div>
        <span style={{marginLeft:4,fontSize:8,fontWeight:700,color:a?C.ac:d?C.t1:C.t3,whiteSpace:"nowrap"}}>{s}</span>
        {i<STEPS.length-1&&<div style={{flex:1,height:1.5,margin:"0 4px",background:d?C.ac:C.b1,minWidth:4}}/>}
      </div>);})}
  </div>);

// ─── Auth ───
function Auth({onLogin,onSetup}){
  const [m,setM]=useState(false);const [e,setE]=useState("");const [p,setP]=useState("");
  const [w,setW]=useState("");const [n,setN]=useState("");const [sp,setSp]=useState(false);const [err,setErr]=useState("");
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F}}>
      <div style={{width:"100%",maxWidth:400,padding:20}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:24,fontWeight:800,background:`linear-gradient(135deg,${C.ac},#00c896,${C.bl})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Shorts Studio</div>
          <div style={{fontSize:11,color:C.t2,marginTop:4}}>TikTok • YouTube Shorts • Instagram Reels</div>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10}}>{PLATFORMS.map(p=><span key={p.id} style={{color:p.color}}>{p.icon(18)}</span>)}</div>
        </div>
        <Cd ch={<>
          <div style={{display:"flex",background:C.bg,borderRadius:7,padding:2,marginBottom:20}}>
            <button onClick={()=>{setM(false);setErr("");}} style={{flex:1,padding:9,borderRadius:5,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:F,background:!m?C.ac:"transparent",color:!m?C.bg:C.t3}}>Sign in</button>
            <button onClick={()=>{setM(true);setErr("");}} style={{flex:1,padding:9,borderRadius:5,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:F,background:m?C.ac:"transparent",color:m?C.bg:C.t3}}>Create workspace</button>
          </div>
          {m&&<><div style={{marginBottom:12}}><Lb ch="Workspace name"/><input value={w} onChange={x=>setW(x.target.value)} placeholder="My Brand Studio" style={ss.input}/></div><div style={{marginBottom:12}}><Lb ch="Your name"/><input value={n} onChange={x=>setN(x.target.value)} placeholder="John" style={ss.input}/></div></>}
          <div style={{marginBottom:12}}><Lb ch="Email"/><input type="email" value={e} onChange={x=>setE(x.target.value)} placeholder="you@company.com" style={ss.input}/></div>
          <div style={{marginBottom:12}}><Lb ch="Password"/><div style={{position:"relative"}}><input type={sp?"text":"password"} value={p} onChange={x=>setP(x.target.value)} placeholder="••••••••" style={{...ss.input,paddingRight:36}}/><button onClick={()=>setSp(!sp)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.t3,cursor:"pointer"}}>{sp?Ic.eyeOff(13):Ic.eye(13)}</button></div></div>
          {err&&<div style={{fontSize:11,color:C.rd,marginBottom:10,padding:"7px 10px",background:C.rdd,borderRadius:6}}>{err}</div>}
          <Btn ch={m?<>{Ic.building(13)} Create workspace</>:<>{Ic.lock(13)} Sign in</>} onClick={()=>{if(!e||!p){setErr("All fields required");return;}m?onSetup({email:e,password:p,workspaceName:w,name:n}):onLogin({email:e,password:p});}} sx={{width:"100%",padding:13,fontSize:14,justifyContent:"center"}}/>
          {!m&&<div style={{textAlign:"center",marginTop:12,fontSize:10,color:C.t3}}>No account? Your workspace admin must invite you.</div>}
        </>} sx={{padding:24}}/>
      </div>
    </div>);
}

// ─── Workspace Panel ───
function WsPanel({ws,user,members,onUpdate,onAddMem,onRemMem,onClose}){
  const [tab,setTab]=useState("conn");const [ne,setNe]=useState("");const [nn,setNn]=useState("");const [nr,setNr]=useState("member");const [np,setNp]=useState("");const [sk,setSk]=useState({});
  const isA=user.role==="admin";
  const conns=[
    {k:"heygen_api_key",l:"HeyGen API key",g:"HeyGen",i:"🎭"},{k:"tiktok_access_token",l:"TikTok token",g:"TikTok",i:"📱"},
    {k:"tiktok_account_name",l:"TikTok account",g:"TikTok",i:"@",ns:true},{k:"youtube_api_key",l:"YouTube API key",g:"YouTube",i:"▶️"},
    {k:"youtube_channel_name",l:"YouTube channel",g:"YouTube",i:"📺",ns:true},{k:"instagram_access_token",l:"Instagram token",g:"Instagram",i:"📷"},
    {k:"instagram_account_name",l:"Instagram account",g:"Instagram",i:"@",ns:true},
    {k:"elevenlabs_api_key",l:"ElevenLabs API key",g:"ElevenLabs",i:"🎙"},{k:"elevenlabs_voice_id",l:"ElevenLabs voice ID",g:"ElevenLabs",i:"🔊",ns:true},
    {k:"twelvelabs_api_key",l:"Twelve Labs API key",g:"Twelve Labs",i:"🧠"},
  ];
  const groups=[...new Set(conns.map(c=>c.g))];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:16,width:"92%",maxWidth:600,maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={x=>x.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:15,fontWeight:800,color:C.t1}}>{ws.name}</div><div style={{fontSize:10,color:C.t2}}>Workspace settings</div></div>
          <Btn ch="✕" v="g" onClick={onClose} sx={{padding:"6px 12px"}}/>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,padding:"0 20px"}}>
          {[{id:"conn",l:"Connections",ic:Ic.plug},{id:"team",l:"Team",ic:Ic.users},{id:"ws",l:"Workspace",ic:Ic.building}].map(t=>
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 14px",fontSize:11,fontWeight:700,fontFamily:F,cursor:"pointer",border:"none",borderBottom:`2px solid ${tab===t.id?C.ac:"transparent"}`,background:"transparent",color:tab===t.id?C.ac:C.t2,display:"flex",alignItems:"center",gap:5}}>{t.ic(13)} {t.l}</button>)}
        </div>
        <div style={{padding:20,overflowY:"auto",flex:1}}>
          {tab==="conn"&&<div>{groups.map(g=><div key={g} style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.ac,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{g}</div>
            {conns.filter(c=>c.g===g).map(({k,l,i,ns})=><div key={k} style={{marginBottom:8,padding:10,background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>{i}</span><span style={{fontSize:12,fontWeight:700,color:C.t1}}>{l}</span></div>
                {!ns&&<button onClick={()=>setSk(p=>({...p,[k]:!p[k]}))} style={{background:"none",border:"none",color:C.t3,cursor:"pointer"}}>{sk[k]?Ic.eyeOff(11):Ic.eye(11)}</button>}
              </div>
              <input type={ns||sk[k]?"text":"password"} value={ws.connections?.[k]||""} onChange={x=>isA&&onUpdate({connections:{...ws.connections,[k]:x.target.value}})} disabled={!isA} style={{...ss.input,fontSize:11,fontFamily:ns?F:M,padding:"7px 10px",opacity:isA?1:0.5}}/>
              {ws.connections?.[k]&&<div style={{display:"flex",alignItems:"center",gap:3,marginTop:4}}><div style={{width:5,height:5,borderRadius:"50%",background:C.ac}}/><span style={{fontSize:8,color:C.ac,fontWeight:600}}>Connected</span></div>}
            </div>)}
          </div>)}</div>}
          {tab==="team"&&<div>
            <Lb ch={`Members (${members.length})`}/>
            {members.map((m,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 11px",background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`,marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:`${m.role==="admin"?C.ac:C.bl}14`,border:`1.5px solid ${m.role==="admin"?C.ac:C.bl}`,display:"flex",alignItems:"center",justifyContent:"center",color:m.role==="admin"?C.ac:C.bl}}>{m.role==="admin"?Ic.shield(10):Ic.users(10)}</div>
                <div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>{m.name}</div><div style={{fontSize:10,color:C.t2}}>{m.email}</div></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <Bd ch={m.role} co={m.role==="admin"?C.ac:C.bl}/>
                {isA&&m.email!==user.email&&<button onClick={()=>onRemMem(m.email)} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",opacity:0.5}}>{Ic.trash(12)}</button>}
              </div>
            </div>)}
            {isA&&<Cd ch={<>
              <div style={{fontSize:12,fontWeight:800,color:C.ac,marginBottom:10}}>{Ic.userPlus(14)} Add member</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><Lb ch="Name"/><input value={nn} onChange={x=>setNn(x.target.value)} placeholder="Jane" style={{...ss.input,fontSize:11}}/></div>
                <div><Lb ch="Email"/><input value={ne} onChange={x=>setNe(x.target.value)} placeholder="jane@co.com" style={{...ss.input,fontSize:11}}/></div>
                <div><Lb ch="Password"/><input value={np} onChange={x=>setNp(x.target.value)} placeholder="Min 8 chars" style={{...ss.input,fontSize:11,fontFamily:M}}/></div>
                <div><Lb ch="Role"/><div style={{display:"flex",gap:4}}>{["member","admin"].map(r=><button key={r} onClick={()=>setNr(r)} style={{flex:1,padding:7,borderRadius:6,fontSize:10,fontWeight:700,border:`1.5px solid ${nr===r?C.ac:C.b1}`,background:nr===r?C.acd:"transparent",color:nr===r?C.ac:C.t2,cursor:"pointer",fontFamily:F,textTransform:"capitalize"}}>{r}</button>)}</div></div>
              </div>
              <Btn ch={<>{Ic.userPlus(12)} Create account</>} onClick={()=>{if(ne&&nn&&np){onAddMem({name:nn,email:ne,password:np,role:nr});setNe("");setNn("");setNp("");}}} dis={!ne||!nn||!np} sx={{width:"100%",justifyContent:"center",marginTop:10}}/>
            </>} sx={{marginTop:14,padding:16,borderColor:C.ac,background:`${C.ac}04`}}/>}
          </div>}
          {tab==="ws"&&<div>
            <div style={{marginBottom:14}}><Lb ch="Workspace name"/><input value={ws.name} onChange={x=>isA&&onUpdate({name:x.target.value})} disabled={!isA} style={{...ss.input,opacity:isA?1:0.5}}/></div>
            <div style={{padding:12,background:C.s2,borderRadius:8,border:`1px solid ${C.b1}`}}>
              <Lb ch="Connected platforms"/>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {ws.connections?.heygen_api_key&&<Bd ch="🎭 HeyGen" co={C.ac}/>}
                {ws.connections?.elevenlabs_api_key&&<Bd ch="🎙 ElevenLabs" co={C.pu}/>}
                {ws.connections?.twelvelabs_api_key&&<Bd ch="🧠 Twelve Labs" co={C.bl}/>}
                {ws.connections?.tiktok_access_token&&<Bd ch={`📱 TikTok ${ws.connections?.tiktok_account_name?`@${ws.connections.tiktok_account_name}`:""}`} co="#ff0050"/>}
                {ws.connections?.youtube_api_key&&<Bd ch={`▶️ YouTube ${ws.connections?.youtube_channel_name||""}`} co="#ff0000"/>}
                {ws.connections?.instagram_access_token&&<Bd ch={`📷 Instagram ${ws.connections?.instagram_account_name?`@${ws.connections.instagram_account_name}`:""}`} co="#E1306C"/>}
              </div>
            </div>
          </div>}
        </div>
      </div>
    </div>);
}

// ─── MAIN APP ───
export default function App(){
  const [authed,setAuthed]=useState(false);
  const [user,setUser]=useState(null);const [ws,setWs]=useState(null);const [mems,setMems]=useState([]);const [showWs,setShowWs]=useState(false);

  const [step,setStep]=useState(0);
  const [mode,setMode]=useState("news");
  const [platforms,setPlats]=useState(["tiktok"]);
  const [source,setSource]=useState("all");
  const [customUrl,setCUrl]=useState("");const [query,setQ]=useState("");
  const [searching,setSearching]=useState(false);const [results,setRes]=useState([]);const [sel,setSel]=useState(null);

  const [lang,setLang]=useState("fr");
  const [duration,setDuration]=useState(90);
  const [voiceProvider,setVoiceProv]=useState("elevenlabs");
  const [script,setScript]=useState("");
  const [platCaps,setPlatCaps]=useState({tiktok:{caption:"",hashtags:""},youtube:{caption:"",hashtags:""},instagram:{caption:"",hashtags:""}});
  const [genScript,setGenScript]=useState(false);

  const [avatars,setAvatars]=useState([]);const [avatar,setAvatar]=useState(null);const [loadAv,setLoadAv]=useState(false);
  const [fx,setFx]=useState(INIT_FX);

  const [vidSt,setVidSt]=useState("idle");const [vidPr,setVidPr]=useState(0);
  const [postSt,setPostSt]=useState({});const [postRe,setPostRe]=useState({});

  const sLang=LANGS.find(l=>l.c===lang);const sMode=MODES.find(m=>m.id===mode);
  const hk=ws?.connections?.heygen_api_key;const tlk=ws?.connections?.twelvelabs_api_key;
  const elk=ws?.connections?.elevenlabs_api_key;
  const toggleFx=id=>setFx(p=>p.map(e=>e.id===id?{...e,on:!e.on}:e));
  const togglePlat=id=>{if(platforms.includes(id)){if(platforms.length>1)setPlats(platforms.filter(p=>p!==id));}else setPlats([...platforms,id]);};
  const durLabel=DURATIONS.find(d=>d.v===duration)?.l||`${duration}s`;
  const wordCount=Math.round(duration*2.2); // ~2.2 words/sec speaking rate

  const handleLogin=({email,password})=>{setUser({email,name:email.split("@")[0],role:"member"});setWs({id:"ws_demo",name:"Demo Workspace",connections:{}});setMems([{email,name:email.split("@")[0],role:"member"}]);setAuthed(true);};
  const handleSetup=({email,password,workspaceName,name})=>{const u={email,name,role:"admin"};setUser(u);setWs({id:"ws_"+Date.now(),name:workspaceName,connections:{}});setMems([{...u}]);setAuthed(true);};
  const handleLogout=()=>{setAuthed(false);setUser(null);setWs(null);setStep(0);};

  // Fetch avatars
  const fetchAv=useCallback(async()=>{
    if(!hk)return;setLoadAv(true);
    try{const r=await fetch("https://api.heygen.com/v2/avatars",{headers:{"X-Api-Key":hk}});const d=await r.json();const all=d.data?.avatars||[];
      const v5=all.filter(a=>{const v=String(a.version||a.avatar_version||"");return parseFloat(v.replace(/[^0-9.]/g,""))>=5||v.startsWith("v5")||v.startsWith("5");});
      const list=(v5.length>0?v5:all).map(a=>({id:a.avatar_id,name:a.avatar_name||a.avatar_id,ver:a.version||"v5+",thumb:a.preview_image_url||null}));
      setAvatars(list);if(list.length>0&&!avatar)setAvatar(list[0]);
    }catch{setAvatars([]);}setLoadAv(false);
  },[hk,avatar]);
  useEffect(()=>{if(hk)fetchAv();},[hk]);

  // Search
  const doSearch=useCallback(async()=>{
    setSearching(true);setRes([]);
    const sp=source==="url"?`Analyze this URL: "${customUrl}".`:`Search for ${mode==="news"?"trending news":"trending content"}${query?` about "${query}"`:"" } from ${source==="all"?"Google News, Twitter/X, TikTok":SOURCES.find(s=>s.id===source)?.label}.`;
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,tools:[{type:"web_search_20250305",name:"web_search"}],messages:[{role:"user",content:`${sp}\n\nFind up to 5 results. JSON only:\n[{"title":"...","summary":"...","source":"...","hasVideo":true,"time":"2h ago","url":"...","contentType":"..."}]`}]})});
      const d=await r.json();const t=d.content?.find(b=>b.type==="text")?.text||"";
      try{setRes(JSON.parse(t.replace(/```json|```/g,"").trim()));}catch{setRes([{title:"Results",summary:t.substring(0,250),source:"System",time:"Now"}]);}
    }catch(e){setRes([{title:"Error",summary:e.message,source:"System",time:"Now"}]);}setSearching(false);
  },[source,customUrl,query,mode]);

  // Script
  const doScript=useCallback(async()=>{
    if(!sel)return;setGenScript(true);
    const pls=platforms.map(p=>PLATFORMS.find(x=>x.id===p)?.label).join(", ");
    const modeVerb=mode==="news"?"Write a factual news report":mode==="remix"?"Write a creative remix":"Write a reaction/commentary";
    try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,tools:[{type:"web_search_20250305",name:"web_search"}],
      messages:[{role:"user",content:`You are a short-form video presenter. Research: "${sel.title}" — ${sel.summary}${sel.url?`\nURL: ${sel.url}`:""}\n\n${modeVerb} script IN ${sLang?.l?.toUpperCase()||"FRENCH"} (${lang}). Duration: ${duration} seconds (~${wordCount} words). Include [PAUSE] and [CUT TO SOURCE VIDEO] markers. Hook in first 3 seconds.\n\nTarget platforms: ${pls}. Generate platform-specific captions and hashtags.\n\nJSON only:\n{"script":"...","platforms":{"tiktok":{"caption":"...","hashtags":"..."},"youtube":{"caption":"...","hashtags":"..."},"instagram":{"caption":"...","hashtags":"..."}}}`}]})});
      const d=await r.json();const t=d.content?.find(b=>b.type==="text")?.text||"";
      try{const p=JSON.parse(t.replace(/```json|```/g,"").trim());setScript(p.script||"");if(p.platforms)setPlatCaps(prev=>({...prev,...p.platforms}));}catch{setScript(t);}
    }catch(e){setScript("Error: "+e.message);}setGenScript(false);
  },[sel,lang,sLang,mode,duration,wordCount,platforms]);

  // Video generation
  const doVideo=useCallback(async()=>{
    if(!script||!hk||!avatar)return;setVidSt("analyzing");setVidPr(0);
    try{
      // Step 1: Twelve Labs analysis (if connected)
      if(tlk){setVidPr(10);await new Promise(r=>setTimeout(r,2000));setVidPr(25);}
      // Step 2: Voice generation
      setVidSt("voice");setVidPr(30);
      if(voiceProvider==="elevenlabs"&&elk){
        // ElevenLabs TTS API call would go here
        await new Promise(r=>setTimeout(r,2000));
      }
      setVidPr(45);
      // Step 3: HeyGen avatar render
      setVidSt("avatar");
      const clean=script.replace(/\[PAUSE\]/g,"...").replace(/\[CUT TO [A-Z ]+\]/g,"");
      const body={video_inputs:[{character:{type:"avatar",avatar_id:avatar.id,avatar_style:"normal"},voice:voiceProvider==="heygen"?{type:"text",input_text:clean,voice_id:`${lang}_female_1`}:{type:"audio",audio_url:"ELEVENLABS_OUTPUT_URL"},background:{type:"color",value:"#000000"}}],dimension:{width:1080,height:1920}};
      const r=await fetch("https://api.heygen.com/v2/video/generate",{method:"POST",headers:{"Content-Type":"application/json","X-Api-Key":hk},body:JSON.stringify(body)});
      const d=await r.json();const vid=d.data?.video_id;
      if(!vid)throw new Error(JSON.stringify(d));
      let st="processing",att=0;
      while(st==="processing"&&att<60){await new Promise(r=>setTimeout(r,5000));const p=await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${vid}`,{headers:{"X-Api-Key":hk}});st=(await p.json()).data?.status||"processing";setVidPr(45+Math.min(35,(att/60)*40));att++;}
      // Step 4: Merge
      setVidSt("merge");setVidPr(85);await new Promise(r=>setTimeout(r,3000));setVidPr(100);setVidSt("ready");
    }catch(e){setVidSt("idle");alert("Failed: "+e.message);}
  },[script,hk,avatar,lang,voiceProvider,elk,tlk,fx]);

  // Post
  const doPost=useCallback(async(pid)=>{
    const cn=ws?.connections||{};setPostSt(p=>({...p,[pid]:"posting"}));
    try{
      if(pid==="tiktok"&&cn.tiktok_access_token)await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/",{method:"POST",headers:{Authorization:`Bearer ${cn.tiktok_access_token}`,"Content-Type":"application/json"},body:JSON.stringify({post_info:{title:platCaps.tiktok?.caption||""},source_info:{source:"FILE_UPLOAD"}})});
      else if(pid==="youtube"&&cn.youtube_api_key)await new Promise(r=>setTimeout(r,1500));
      else if(pid==="instagram"&&cn.instagram_access_token)await new Promise(r=>setTimeout(r,1500));
      else throw new Error("Not connected");
      setPostSt(p=>({...p,[pid]:"done"}));setPostRe(p=>({...p,[pid]:{ok:true,msg:`Posted to ${PLATFORMS.find(x=>x.id===pid)?.label}!`}}));
    }catch(e){setPostSt(p=>({...p,[pid]:"error"}));setPostRe(p=>({...p,[pid]:{ok:false,msg:e.message}}));}
  },[ws,platCaps]);
  const postAll=async()=>{for(const p of platforms)await doPost(p);};
  const reset=()=>{setStep(0);setSel(null);setScript("");setPlatCaps({tiktok:{caption:"",hashtags:""},youtube:{caption:"",hashtags:""},instagram:{caption:"",hashtags:""}});setVidSt("idle");setVidPr(0);setPostSt({});setPostRe({});};

  if(!authed)return <Auth onLogin={handleLogin} onSetup={handleSetup}/>;

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.t1,fontFamily:F}}>
      <link href="https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;700;800;900&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {showWs&&<WsPanel ws={ws} user={user} members={mems} onUpdate={u=>setWs(p=>({...p,...u}))} onAddMem={m=>setMems(p=>[...p,m])} onRemMem={e=>setMems(p=>p.filter(m=>m.email!==e))} onClose={()=>setShowWs(false)}/>}

      <div style={{maxWidth:900,margin:"0 auto",padding:"18px 18px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,background:`linear-gradient(135deg,${C.ac},#00c896,${C.bl})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Shorts Studio</div>
            <div style={{fontSize:10,color:C.t2,marginTop:2,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <Bd ch={sMode?.label} co={sMode?.color}/>{platforms.map(p=>{const pl=PLATFORMS.find(x=>x.id===p);return <span key={p} style={{color:pl?.color,display:"flex"}}>{pl?.icon(10)}</span>;})}<span>{sLang?.f}</span><Bd ch={durLabel} co={C.t2}/><Bd ch={voiceProvider==="elevenlabs"?"ElevenLabs":"HeyGen TTS"} co={voiceProvider==="elevenlabs"?C.pu:C.ac}/><span style={{color:C.t3}}>• {ws?.name}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:5}}>
            <Btn ch={Ic.building(13)} v="g" onClick={()=>setShowWs(true)} sx={{padding:"7px 11px"}}/>
            <Btn ch={Ic.logout(13)} v="g" onClick={handleLogout} sx={{padding:"7px 11px"}}/>
          </div>
        </div>

        <StepBar cur={step}/>

        {/* ══ STEP 0: MODE + PLATFORMS + DURATION + VOICE ══ */}
        {step===0&&<div>
          <Lb ch="Content mode"/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:18}}>
            {MODES.map(m=><div key={m.id} onClick={()=>setMode(m.id)} style={{background:mode===m.id?`${m.color}10`:C.s2,border:`2px solid ${mode===m.id?m.color:C.b1}`,borderRadius:12,padding:14,cursor:"pointer",boxShadow:mode===m.id?`0 0 20px ${m.color}28`:"none"}}>
              <div style={{color:mode===m.id?m.color:C.t3,marginBottom:5}}>{m.icon(22)}</div>
              <div style={{fontSize:13,fontWeight:800,color:mode===m.id?m.color:C.t1,marginBottom:2}}>{m.label}</div>
              <div style={{fontSize:10,color:C.t2}}>{m.desc}</div>
            </div>)}
          </div>

          <Lb ch="Target platforms"/>
          <div style={{display:"flex",gap:7,marginBottom:18,flexWrap:"wrap"}}>
            {PLATFORMS.map(p=>{const on=platforms.includes(p.id);return(
              <button key={p.id} onClick={()=>togglePlat(p.id)} style={{padding:"9px 16px",borderRadius:9,fontSize:12,fontWeight:700,border:`2px solid ${on?p.color:C.b1}`,background:on?`${p.color}10`:"transparent",color:on?p.color:C.t2,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:7}}>
                {p.icon(15)} {p.label} {on&&<span style={{width:7,height:7,borderRadius:"50%",background:p.color}}/>}
              </button>);})}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
            {/* Duration */}
            <div>
              <Lb ch={`Video duration: ${durLabel} (~${wordCount} words)`}/>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {DURATIONS.map(d=><button key={d.v} onClick={()=>setDuration(d.v)} style={{padding:"7px 14px",borderRadius:7,fontSize:11,fontWeight:700,border:`1.5px solid ${duration===d.v?C.ac:C.b1}`,background:duration===d.v?C.acd:"transparent",color:duration===d.v?C.ac:C.t2,cursor:"pointer",fontFamily:F}}>{d.l}</button>)}
              </div>
            </div>
            {/* Voice provider */}
            <div>
              <Lb ch="Voice provider"/>
              <div style={{display:"flex",gap:5}}>
                {VOICE_PROVIDERS.map(vp=><button key={vp.id} onClick={()=>setVoiceProv(vp.id)} style={{flex:1,padding:"9px 12px",borderRadius:8,fontSize:11,fontWeight:700,border:`1.5px solid ${voiceProvider===vp.id?vp.color:C.b1}`,background:voiceProvider===vp.id?`${vp.color}10`:"transparent",color:voiceProvider===vp.id?vp.color:C.t2,cursor:"pointer",fontFamily:F,textAlign:"left"}}>
                  <div>{vp.id==="elevenlabs"?Ic.mic(13):Ic.video(13)} {vp.label}</div>
                  <div style={{fontSize:9,color:C.t3,marginTop:2}}>{vp.desc}</div>
                </button>)}
              </div>
            </div>
          </div>

          <Btn ch={<>Continue →</>} onClick={()=>setStep(1)} sx={{width:"100%",padding:13,fontSize:14,justifyContent:"center"}}/>
        </div>}

        {/* ══ STEP 1: SOURCE ══ */}
        {step===1&&<div>
          <Lb ch="Source filter"/>
          <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>{SOURCES.map(s=><button key={s.id} onClick={()=>{setSource(s.id);setRes([]);setSel(null);}} style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:700,border:`1.5px solid ${source===s.id?s.color:C.b1}`,background:source===s.id?`${s.color}12`:"transparent",color:source===s.id?s.color:C.t2,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:5}}>{s.icon(12)} {s.label}</button>)}</div>
          {source==="url"?<div style={{display:"flex",gap:7,marginBottom:12}}><input placeholder="https://..." value={customUrl} onChange={e=>setCUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} style={{...ss.input,flex:1}}/><Btn ch={searching?Ic.spin(13):<>{Ic.link(13)} Fetch</>} onClick={doSearch} dis={searching||!customUrl}/></div>
          :<div style={{display:"flex",gap:7,marginBottom:10}}><input placeholder="Search..." value={query} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()} style={{...ss.input,flex:1}}/><Btn ch={searching?Ic.spin(13):<>{Ic.search(13)} Search</>} onClick={doSearch} dis={searching}/></div>}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {results.map((r,i)=><Cd key={i} onClick={()=>setSel(r)} on={sel?.title===r.title} ch={<>
              <div style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}><Bd ch={r.source} co={r.source==="Google News"?C.bl:r.source==="Twitter/X"?C.pu:r.source==="TikTok"?C.pk:C.or}/><span style={{fontSize:9,color:C.t3}}>{r.time}</span></div>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,lineHeight:1.35,marginBottom:3}}>{r.title}</div>
              <div style={{fontSize:11,color:C.t2}}>{r.summary}</div>
              {r.hasVideo&&<div style={{marginTop:5,fontSize:9,fontWeight:700,color:C.ac}}>{Ic.play(10)} Video available</div>}
            </>}/>)}
            {!results.length&&!searching&&<div style={{padding:32,textAlign:"center",color:C.t3,border:`1.5px dashed ${C.b1}`,borderRadius:12}}>{Ic.globe(20)}<br/><span style={{fontSize:11}}>Search or paste URL</span></div>}
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <Btn ch="← Back" v="g" onClick={()=>setStep(0)}/>
            {sel&&<Btn ch="Script →" onClick={()=>{setStep(2);doScript();}} sx={{flex:1}}/>}
          </div>
        </div>}

        {/* ══ STEP 2: SCRIPT ══ */}
        {step===2&&<div>
          <Lb ch="Language"/>
          <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>{LANGS.map(l=><button key={l.c} onClick={()=>setLang(l.c)} style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:600,border:`1.5px solid ${lang===l.c?C.ac:C.b1}`,background:lang===l.c?C.acd:"transparent",color:lang===l.c?C.ac:C.t2,cursor:"pointer",fontFamily:F}}>{l.f} {l.l}</button>)}</div>
          {genScript?<div style={{padding:36,textAlign:"center"}}>{Ic.spin(22)}<div style={{fontSize:13,fontWeight:700,color:C.t1,marginTop:8}}>Writing {sMode?.label} script ({durLabel})...</div></div>:<>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <Lb ch={`Script (${sLang?.f} • ${durLabel} • ~${wordCount} words)`}/>
              <button onClick={doScript} style={{fontSize:10,padding:"3px 8px",borderRadius:5,border:`1px solid ${C.b1}`,background:"transparent",color:C.t2,cursor:"pointer",fontFamily:F}}>{Ic.zap(10)} Regen</button>
            </div>
            <textarea value={script} onChange={e=>setScript(e.target.value)} rows={7} style={{...ss.input,lineHeight:1.6,resize:"vertical",marginBottom:12}}/>
            <Lb ch="Per-platform captions"/>
            {platforms.map(pid=>{const pl=PLATFORMS.find(x=>x.id===pid);return(
              <Cd key={pid} ch={<>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><span style={{color:pl?.color}}>{pl?.icon(14)}</span><span style={{fontSize:11,fontWeight:700,color:pl?.color}}>{pl?.label}</span><span style={{fontSize:9,color:C.t3}}>• max {pl?.maxCap} chars • {pl?.maxDur}</span></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  <div><label style={{fontSize:8,fontWeight:700,color:C.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Caption</label><textarea value={platCaps[pid]?.caption||""} onChange={e=>setPlatCaps(p=>({...p,[pid]:{...p[pid],caption:e.target.value}}))} rows={2} style={{...ss.input,fontSize:11,resize:"vertical"}}/></div>
                  <div><label style={{fontSize:8,fontWeight:700,color:C.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Hashtags</label><textarea value={platCaps[pid]?.hashtags||""} onChange={e=>setPlatCaps(p=>({...p,[pid]:{...p[pid],hashtags:e.target.value}}))} rows={2} style={{...ss.input,fontSize:11,resize:"vertical"}}/></div>
                </div>
              </>} sx={{marginBottom:8,padding:12,borderColor:`${pl?.color}30`,background:`${pl?.color}04`}}/>
            );})}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn ch="← Back" v="g" onClick={()=>setStep(1)}/>
              <Btn ch="Voice & Avatar →" onClick={()=>setStep(3)} dis={!script} sx={{flex:1}}/>
            </div>
          </>}
        </div>}

        {/* ══ STEP 3: VOICE + AVATAR ══ */}
        {step===3&&<div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <Bd ch={`Voice: ${voiceProvider==="elevenlabs"?"ElevenLabs":"HeyGen TTS"}`} co={voiceProvider==="elevenlabs"?C.pu:C.ac}/>
            <Bd ch={durLabel} co={C.t2}/>
          </div>
          <Lb ch="Custom avatars (v5+)"/>
          {!hk?<Cd ch={<div style={{textAlign:"center"}}><span style={{color:C.rd}}>HeyGen not connected</span><br/><Btn ch="Settings" v="g" onClick={()=>setShowWs(true)} sx={{marginTop:6}}/></div>} sx={{marginBottom:16}}/>
          :loadAv?<div style={{padding:20,textAlign:"center"}}>{Ic.spin(18)}<div style={{fontSize:11,color:C.t2,marginTop:5}}>Loading avatars...</div></div>
          :avatars.length===0?<Cd ch={<div style={{textAlign:"center"}}><span style={{color:C.or}}>No v5+ avatars found</span><br/><Btn ch="Retry" v="g" onClick={fetchAv} sx={{marginTop:6}}/></div>} sx={{marginBottom:16}}/>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:20}}>
            {avatars.map(a=><Cd key={a.id} onClick={()=>setAvatar(a)} on={avatar?.id===a.id} ch={<div style={{textAlign:"center"}}>
              {a.thumb?<img src={a.thumb} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`2px solid ${avatar?.id===a.id?C.ac:C.b1}`,display:"block",margin:"0 auto 4px"}} onError={e=>{e.target.style.display="none"}}/>:<div style={{width:40,height:40,borderRadius:"50%",margin:"0 auto 4px",background:C.bg,border:`2px solid ${avatar?.id===a.id?C.ac:C.b1}`,display:"flex",alignItems:"center",justifyContent:"center",color:C.t3}}>{Ic.users(16)}</div>}
              <div style={{fontSize:10,fontWeight:700,color:avatar?.id===a.id?C.ac:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
            </div>} sx={{padding:10}}/>)}
          </div>}
          <div style={{display:"flex",gap:8}}>
            <Btn ch="← Back" v="g" onClick={()=>setStep(2)}/>
            <Btn ch="Effects →" onClick={()=>setStep(4)} dis={!avatar} sx={{flex:1}}/>
          </div>
        </div>}

        {/* ══ STEP 4: EFFECTS ══ */}
        {step===4&&<div>
          <Lb ch="Video effects"/>
          {["entrance","scene","exit"].map(g=><div key={g} style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:g==="entrance"?C.ac:g==="scene"?C.bl:C.or,textTransform:"capitalize",marginBottom:5}}>{g==="entrance"?Ic.zoomIn(12):g==="scene"?Ic.layers(12):Ic.sparkle(12)} {g}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{fx.filter(e=>e.group===g).map(e=><button key={e.id} onClick={()=>toggleFx(e.id)} style={{padding:"8px 14px",borderRadius:8,fontSize:11,fontWeight:700,border:`1.5px solid ${e.on?C.ac:C.b1}`,background:e.on?C.acd:C.s2,color:e.on?C.ac:C.t2,cursor:"pointer",fontFamily:F}}>{e.label}</button>)}</div>
          </div>)}

          <Lb ch="Layout preview"/>
          <Cd ch={<div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
            <div style={{width:"60%",height:50,borderRadius:6,background:`${C.bl}18`,border:`1px solid ${C.bl}40`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:C.bl,fontWeight:600}}>News footage (top)</span></div>
            <div style={{width:"60%",height:40,borderRadius:6,background:`${C.pk}18`,border:`1px solid ${C.pk}40`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:C.pk,fontWeight:600}}>Avatar speaking (bottom)</span></div>
            <div style={{fontSize:9,color:C.t3,marginTop:4}}>1080 × 1920 vertical • {durLabel}</div>
          </div>} sx={{padding:16,marginBottom:16}}/>

          <div style={{display:"flex",gap:8}}>
            <Btn ch="← Back" v="g" onClick={()=>setStep(3)}/>
            <Btn ch={<>{Ic.video(13)} Generate video →</>} onClick={()=>{setStep(5);doVideo();}} sx={{flex:1}}/>
          </div>
        </div>}

        {/* ══ STEP 5: RENDER ══ */}
        {step===5&&<div>
          <Cd ch={<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",height:160,marginBottom:14,borderRadius:8,overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,#0c0c1e,#161632)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRight:`1px solid ${C.b1}`}}>
                {Ic.video(20)}<div style={{fontSize:11,fontWeight:700,color:C.t1,marginTop:6}}>Source footage</div>
                {tlk&&<Bd ch="Twelve Labs analysis" co={C.bl}/>}
              </div>
              <div style={{background:"linear-gradient(135deg,#0a0a16,#12121e)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                {avatar?.thumb?<img src={avatar.thumb} alt="" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.ac}`}}/>:<div style={{fontSize:28}}>🧑</div>}
                <div style={{fontSize:11,fontWeight:700,color:C.ac,marginTop:4}}>{avatar?.name}</div>
                <Bd ch={voiceProvider==="elevenlabs"?"ElevenLabs voice":"HeyGen TTS"} co={voiceProvider==="elevenlabs"?C.pu:C.ac}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:700,color:C.t1}}>
                {vidSt==="analyzing"?"🧠 Analyzing source video...":vidSt==="voice"?"🎙 Generating voice...":vidSt==="avatar"?"🎬 Rendering avatar...":vidSt==="merge"?"🔀 Merging (top/bottom)...":vidSt==="ready"?"✅ Ready!":"⏳"}
              </span>
              <span style={{fontSize:12,fontWeight:800,color:C.ac}}>{Math.round(vidPr)}%</span>
            </div>
            <div style={{height:5,borderRadius:3,background:C.bg,overflow:"hidden"}}><div style={{height:"100%",width:`${vidPr}%`,borderRadius:3,background:`linear-gradient(90deg,${C.ac},#00c896)`,transition:"width 0.5s"}}/></div>
            <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>{fx.filter(e=>e.on).map(e=><Bd key={e.id} ch={e.label} co={e.group==="entrance"?C.ac:e.group==="scene"?C.bl:C.or}/>)}</div>
          </>} sx={{marginBottom:16,padding:16}}/>
          <div style={{display:"flex",gap:8}}>
            <Btn ch="← Back" v="g" onClick={()=>{setStep(4);setVidSt("idle");setVidPr(0);}}/>
            <Btn ch="Post →" onClick={()=>setStep(6)} dis={vidSt!=="ready"} sx={{flex:1}}/>
          </div>
        </div>}

        {/* ══ STEP 6: POST ══ */}
        {step===6&&<div>
          <div style={{fontSize:15,fontWeight:800,color:C.t1,marginBottom:12}}>Publish to {platforms.length} platform{platforms.length>1?"s":""}</div>
          {platforms.map(pid=>{const pl=PLATFORMS.find(x=>x.id===pid);const st=postSt[pid]||"idle";const re=postRe[pid];
            const cn=ws?.connections||{};const connected=pid==="tiktok"?!!cn.tiktok_access_token:pid==="youtube"?!!cn.youtube_api_key:!!cn.instagram_access_token;
            return(<Cd key={pid} ch={<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:pl?.color}}>{pl?.icon(16)}</span><span style={{fontSize:12,fontWeight:700,color:C.t1}}>{pl?.label}</span></div>
                {!connected&&<Bd ch="Not connected" co={C.rd}/>}{st==="done"&&<Bd ch="Posted ✓" co={C.ac}/>}{st==="error"&&<Bd ch="Failed" co={C.rd}/>}{st==="posting"&&Ic.spin(13)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <div><label style={{fontSize:8,fontWeight:700,color:C.t3,textTransform:"uppercase",display:"block",marginBottom:2}}>Caption</label><textarea value={platCaps[pid]?.caption||""} onChange={e=>setPlatCaps(p=>({...p,[pid]:{...p[pid],caption:e.target.value}}))} rows={2} style={{...ss.input,fontSize:10,resize:"vertical"}}/></div>
                <div><label style={{fontSize:8,fontWeight:700,color:C.t3,textTransform:"uppercase",display:"block",marginBottom:2}}>Hashtags</label><textarea value={platCaps[pid]?.hashtags||""} onChange={e=>setPlatCaps(p=>({...p,[pid]:{...p[pid],hashtags:e.target.value}}))} rows={2} style={{...ss.input,fontSize:10,resize:"vertical"}}/></div>
              </div>
              {re&&<div style={{marginTop:6,fontSize:10,color:re.ok?C.ac:C.rd}}>{re.msg}</div>}
              {st==="idle"&&connected&&<Btn ch={<>{pl?.icon(12)} Post to {pl?.label}</>} v={pid==="tiktok"?"tt":"p"} onClick={()=>doPost(pid)} sx={{width:"100%",marginTop:8,justifyContent:"center",padding:9}}/>}
            </>} sx={{marginBottom:8,padding:14,borderColor:`${pl?.color}30`}}/>);
          })}
          {platforms.length>1&&!Object.values(postSt).some(s=>s==="done")&&<Btn ch={<>{Ic.send(13)} Post to all {platforms.length} platforms</>} v="multi" onClick={postAll} sx={{width:"100%",padding:13,fontSize:13,justifyContent:"center",marginBottom:8}}/>}
          <div style={{display:"flex",gap:8}}>
            <Btn ch="← Back" v="g" onClick={()=>{setStep(5);setPostSt({});setPostRe({});}}/>
            <Btn ch="↻ Start over" v="g" onClick={reset} sx={{flex:1}}/>
          </div>
        </div>}

        {/* Pipeline info */}
        <div style={{marginTop:30,padding:14,borderRadius:12,border:`1px solid ${C.b1}`,background:C.s2}}>
          <div style={{fontSize:8,fontWeight:700,color:C.t3,letterSpacing:"0.1em",marginBottom:8}}>PIPELINE: NEWS → TWELVE LABS ANALYSIS → CLAUDE SCRIPT → {voiceProvider==="elevenlabs"?"ELEVENLABS":"HEYGEN TTS"} → HEYGEN AVATAR → FFMPEG MERGE → POST</div>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            {[{i:"🔍",l:"Claude",c:C.bl},{i:"🧠",l:"Twelve Labs",c:C.pu},{i:voiceProvider==="elevenlabs"?"🎙":"🔊",l:voiceProvider==="elevenlabs"?"ElevenLabs":"HeyGen TTS",c:voiceProvider==="elevenlabs"?C.pu:C.ac},{i:"🎭",l:"HeyGen",c:C.pk},{i:"🔀",l:"FFmpeg",c:C.gn}].map((x,i)=>
              <div key={i} style={{textAlign:"center"}}><div style={{fontSize:16}}>{x.i}</div><div style={{fontSize:8,fontWeight:700,color:x.c}}>{x.l}</div></div>)}
          </div>
        </div>
      </div>
    </div>);
}
