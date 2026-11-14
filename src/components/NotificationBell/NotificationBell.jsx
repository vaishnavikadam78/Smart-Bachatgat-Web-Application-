import { useState, useEffect, useRef } from "react";
import { API } from "../../services/api";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type":"application/json","Authorization":`Bearer ${getToken()}` });

const TYPE_ICONS = { meeting:"📅", success:"✅", info:"ℹ️", warning:"⚠️", payment:"💳", scheme:"🗂️" };
const TYPE_COLORS = { meeting:"#8b5cf6", success:"#10b981", info:"#3b82f6", warning:"#f59e0b", payment:"#10b981", scheme:"#ec4899" };

export default function NotificationBell() {
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [nRes, cRes] = await Promise.all([
        fetch(`${API}/notifications/my`,           { headers: hdrs() }),
        fetch(`${API}/notifications/unread-count`, { headers: hdrs() }),
      ]);
      if (nRes.ok) setNotifs(await nRes.json());
      if (cRes.ok) { const d = await cRes.json(); setUnread(d.count); }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await fetch(`${API}/notifications/mark-all-read`, { method:"PATCH", headers: hdrs() });
    setUnread(0);
    setNotifs(n => n.map(x => ({...x, is_read:true})));
  };

  const markOne = async (id) => {
    await fetch(`${API}/notifications/mark-read/${id}`, { method:"PATCH", headers: hdrs() });
    setNotifs(n => n.map(x => x.id===id?{...x,is_read:true}:x));
    setUnread(u => Math.max(0,u-1));
  };

  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts);
    const m = Math.floor(diff/60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  };

  return (
    <div ref={ref} style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>{setOpen(!open);if(!open)load();}} style={{
        position:"relative",background:"none",border:"none",cursor:"pointer",
        padding:"6px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
        transition:"background .2s"
      }} onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
         onMouseLeave={e=>e.currentTarget.style.background="none"}>
        <span style={{fontSize:22}}>🔔</span>
        {unread > 0 && (
          <span style={{
            position:"absolute",top:0,right:0,
            background:"#ef4444",color:"white",borderRadius:"50%",
            width:18,height:18,fontSize:11,fontWeight:800,
            display:"flex",alignItems:"center",justifyContent:"center",
            border:"2px solid white"
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position:"absolute",right:0,top:"calc(100% + 8px)",
          width:340,maxHeight:480,background:"white",borderRadius:14,
          boxShadow:"0 8px 32px rgba(0,0,0,.15)",border:"1px solid #e2e8f0",
          zIndex:9999,overflow:"hidden",display:"flex",flexDirection:"column"
        }}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>🔔 Notifications {unread>0&&<span style={{background:"#ef4444",color:"white",borderRadius:99,padding:"1px 7px",fontSize:11,marginLeft:6}}>{unread}</span>}</span>
            {unread > 0 && <button onClick={markAllRead} style={{fontSize:12,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Mark all read</button>}
          </div>

          <div style={{overflowY:"auto",flex:1}}>
            {loading && notifs.length===0 ? (
              <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>Loading…</div>
            ) : notifs.length===0 ? (
              <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>
                <div style={{fontSize:40,marginBottom:8}}>🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : notifs.map(n => (
              <div key={n.id} onClick={()=>!n.is_read&&markOne(n.id)} style={{
                padding:"12px 16px",borderBottom:"1px solid #f8fafc",cursor:"pointer",
                background:n.is_read?"white":"#eff6ff",transition:"background .15s",
                display:"flex",gap:12,alignItems:"flex-start"
              }} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                 onMouseLeave={e=>e.currentTarget.style.background=n.is_read?"white":"#eff6ff"}>
                <div style={{width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,
                  background:`${(TYPE_COLORS[n.type]||"#3b82f6")}15`}}>
                  {TYPE_ICONS[n.type]||"ℹ️"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:n.is_read?500:700,fontSize:13,color:"#0f172a",marginBottom:2}}>{n.title}</div>
                  <div style={{fontSize:12,color:"#64748b",lineHeight:1.4}}>{n.message}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && <div style={{width:8,height:8,borderRadius:"50%",background:"#3b82f6",flexShrink:0,marginTop:4}}/>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}