import React, { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./Dashboard.css";

const Sparkline = ({ data, color }) => {
  const w = 80, h = 32;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const id = `sg${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

const Counter = ({ target, prefix = "", suffix = "" }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(target.toString().replace(/[^0-9.]/g, ""));
    const step = end / (1200 / 16);
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(t); }
      else setVal(start);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  const display = typeof target === "string" && target.includes(".")
    ? val.toFixed(1) : Math.floor(val);
  return <span>{prefix}{display}{suffix}</span>;
};

const DonutChart = ({ segments }) => {
  const size = 110, r = 42, cx = 55, cy = 55;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }} />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="17" fontWeight="700" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">GROUPS</text>
    </svg>
  );
};

const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className="db-barchart">
      {data.map((d, i) => (
        <div key={i} className="db-bar-col">
          <div className="db-bar-track">
            <div className="db-bar-fill" style={{
              height: `${(d.value / max) * 100}%`,
              background: d.value === max ? "#3b82f6" : i >= 4 ? "#93c5fd" : "#dbeafe",
              animationDelay: `${i * 0.08}s`
            }} />
          </div>
          <span className="db-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const stats = [
  { label: "Total Groups",  value: 24,  prefix: "",  suffix: "",  icon: "🏘️", color: "#3b82f6", spark: [12,14,13,16,18,20,22,24], trend: "+4 this month" },
  { label: "Total Leaders", value: 24,  prefix: "",  suffix: "",  icon: "👑", color: "#8b5cf6", spark: [10,12,14,14,18,20,22,24], trend: "+2 this week"  },
  { label: "Total Members", value: 312, prefix: "",  suffix: "",  icon: "👥", color: "#f59e0b", spark: [200,220,240,260,280,295,305,312], trend: "+18 this month" },
  { label: "Total Savings", value: 4.2, prefix: "₹", suffix: "L", icon: "💰", color: "#10b981", spark: [1.2,1.8,2.1,2.6,3.0,3.5,3.9,4.2], trend: "+₹0.3L this month" },
];


// ─── Dynamic Admin Dashboard ───────────────────────────────────────────────
const AdminDashboard = () => {
  const [leaders,      setLeaders]      = React.useState([]);
  const [groups,       setGroups]       = React.useState([]);
  const [members,      setMembers]      = React.useState([]);
  const [dashboardInfo,setDashboardInfo]= React.useState(null);
  const [loading,      setLoading]      = React.useState(true);
  const [toast,        setToast]        = React.useState(null);

  const token = () => localStorage.getItem("bachatgat_token")||"";
  const hdrs  = () => ({"Content-Type":"application/json","Authorization":`Bearer ${token()}`});
  const showToast = (msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [lRes, gRes, mRes, dRes] = await Promise.all([
          fetch(`${API}/auth/leaders`,     { headers: hdrs() }),
          fetch(`${API}/groups/`,          { headers: hdrs() }),
          fetch(`${API}/members/all`,      { headers: hdrs() }),
          fetch(`${API}/dashboard/admin`, { headers: hdrs() }),
        ]);
        if (lRes.ok) setLeaders(await lRes.json());
        else console.error("Leaders fetch failed:", lRes.status);
        if (gRes.ok) setGroups(await gRes.json());
        else console.error("Groups fetch failed:", gRes.status);
        if (mRes.ok) setMembers(await mRes.json());
        else console.error("Members fetch failed:", mRes.status);
        if (dRes.ok) setDashboardInfo(await dRes.json());
        else console.error("Dashboard fetch failed:", dRes.status);
      } catch (err) { 
        console.error("Admin dashboard error:", err);
        showToast("Cannot connect to server","error"); 
      }
      finally   { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 10000); // refresh every 10s for real-time updates
    return () => clearInterval(interval);
  }, []);

  const totalGroups  = dashboardInfo?.total_groups  ?? groups.length;
  const totalLeaders = dashboardInfo?.total_leaders ?? leaders.length;
  const totalMembers = dashboardInfo?.total_members ?? members.length;
  const totalSavings = dashboardInfo?.total_savings ?? groups.reduce((s,g)=>s+(g.total_savings||0),0);

  const stats = [
    { label:"Total Groups",  value:totalGroups,  prefix:"",  suffix:"", icon:"🏘️", color:"#3b82f6", spark:[1,2,3,4,5,6,7,totalGroups], trend:`${totalGroups} active` },
    { label:"Total Leaders", value:totalLeaders, prefix:"",  suffix:"", icon:"👑", color:"#8b5cf6", spark:[1,2,3,4,5,6,7,totalLeaders], trend:`${totalLeaders} registered` },
    { label:"Total Members", value:totalMembers, prefix:"",  suffix:"", icon:"👥", color:"#f59e0b", spark:[1,2,3,4,5,6,7,totalMembers], trend:`${totalMembers} active` },
    { label:"Total Savings", value:Math.round(totalSavings/1000)/10, prefix:"₹", suffix:"K", icon:"💰", color:"#10b981", spark:[0.1,0.2,0.3,0.4,0.5,0.6,0.8,Math.round(totalSavings/1000)/10||0.1], trend:`₹${totalSavings.toLocaleString("en-IN")}` },
  ];

  const exportCSV = () => {
    const rows = [
      ["=== LEADERS ==="],
      ["Name","Username","Group","Members","Status"],
      ...leaders.map(l=>[l.name,l.username,l.group_name||"—",l.member_count||0,l.is_active?"Active":"Inactive"]),
      [""],
      ["=== GROUPS ==="],
      ["Group ID","Name","Members","Savings","Status"],
      ...groups.map(g=>[g.group_id,g.name,g.member_count||0,g.total_savings||0,g.status||"Active"]),
    ];
    const csv  = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `admin_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("Report exported ✅");
  };

  const groupStatus = [
    { label:"Active",   value:groups.filter(g=>g.status==="Active").length,   color:"#10b981" },
    { label:"Full",     value:groups.filter(g=>(g.member_count||0)>=10).length, color:"#f59e0b" },
    { label:"Empty",    value:groups.filter(g=>(g.member_count||0)===0).length, color:"#f87171" },
  ];

  const monthlyData = [
    { label:"Gp1", value:groups[0]?.total_savings||0 },
    { label:"Gp2", value:groups[1]?.total_savings||0 },
    { label:"Gp3", value:groups[2]?.total_savings||0 },
    { label:"Gp4", value:groups[3]?.total_savings||0 },
    { label:"Gp5", value:groups[4]?.total_savings||0 },
    { label:"Gp6", value:groups[5]?.total_savings||0 },
    { label:"Gp7", value:groups[6]?.total_savings||0 },
    { label:"Gp8", value:groups[7]?.total_savings||0 },
  ];

  return (
    <div className="db-root">
      {toast && <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="success"?"#10b981":"#ef4444",color:"white",padding:"12px 20px",borderRadius:10,fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>{toast.msg}</div>}

      <div className="db-header">
        <div>
          <div className="db-breadcrumb">Home <span>/</span> Dashboard</div>
          <h1 className="db-title">Admin Dashboard</h1>
          <p className="db-sub">Real-time overview — live from database ✓</p>
        </div>
        <div className="db-header-right">
          <div className="db-date">📅 {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
          <button className="db-export" onClick={exportCSV}>↓ Export Report</button>
        </div>
      </div>

      <div className="db-stats-grid">
        {stats.map((s,i) => (
          <div className="db-stat" key={i} style={{"--c":s.color,animationDelay:`${i*0.08}s`}}>
            <div className="db-stat-top">
              <div className="db-stat-icon" style={{background:`${s.color}12`}}>{s.icon}</div>
              <Sparkline data={s.spark.map(Number).filter(n=>!isNaN(n))} color={s.color} />
            </div>
            <div className="db-stat-val" style={{color:s.color}}>
              <Counter target={s.value||0} prefix={s.prefix} suffix={s.suffix} />
            </div>
            <div className="db-stat-label">{s.label}</div>
            <div className="db-stat-trend" style={{color:s.color}}>↑ {s.trend}</div>
          </div>
        ))}
      </div>

      <div className="db-mid">
        <div className="db-card db-donut-card">
          <div className="db-card-head"><h3>Group Status</h3><span className="db-chip db-chip-live">● Live</span></div>
          <div className="db-donut-inner">
            <DonutChart segments={groupStatus.filter(s=>s.value>0).length>0?groupStatus:[{label:"No Data",value:1,color:"#e2e8f0"}]} />
            <div className="db-legend">
              {groupStatus.map((s,i)=>(
                <div key={i} className="db-legend-row">
                  <span className="db-legend-dot" style={{background:s.color}}/>
                  <span className="db-legend-name">{s.label}</span>
                  <span className="db-legend-num">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="db-card db-bar-card">
          <div className="db-card-head"><h3>Savings by Group (₹)</h3><span className="db-chip">Live</span></div>
          <BarChart data={monthlyData.filter(d=>d.value>0).length>0?monthlyData:[{label:"No data",value:0}]} />
        </div>

        <div className="db-card db-activity-card">
          <div className="db-card-head"><h3>Recent Members</h3><span className="db-chip db-chip-live">● Live</span></div>
          <div className="db-activity-list">
            {loading ? <p style={{color:"#94a3b8",padding:16}}>Loading…</p> :
             members.slice(0,5).map((m,i)=>(
              <div key={i} className="db-activity-row">
                <div className="db-act-icon" style={{background:"#10b98112"}}>👤</div>
                <div className="db-act-body">
                  <p>{m.name} — {m.occupation||"Member"}</p>
                  <span>Group ID: {m.group_id} · Joined: {m.join_date||"—"}</span>
                </div>
              </div>
            ))}
            {!loading && members.length===0 && <p style={{color:"#94a3b8",padding:16,textAlign:"center"}}>No members yet</p>}
          </div>
        </div>
      </div>

      {/* ── Leaders Table — LIVE from DB ── */}
      <div className="db-card db-table-card">
        <div className="db-card-head">
          <h3>All Group Leaders ({leaders.length})</h3>
          <span className="db-chip db-chip-live">● Live from DB</span>
        </div>
        <div className="db-table-wrap">
          {loading ? (
            <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>Loading leaders from database…</div>
          ) : leaders.length===0 ? (
            <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>No leaders yet. Add leaders from Manage Leaders page.</div>
          ) : (
            <table className="db-table">
              <thead>
                <tr><th>#</th><th>Leader</th><th>Username</th><th>Group</th><th>Members</th><th>Savings</th><th>Status</th></tr>
              </thead>
              <tbody>
                {leaders.map((l,i)=>(
                  <tr key={l.id}>
                    <td className="db-td-muted">{i+1}</td>
                    <td>
                      <div className="db-td-leader">
                        <div className="db-avatar" style={{background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",color:"white"}}>{l.name?.[0]}</div>
                        <div>
                          <div style={{fontWeight:700}}>{l.name}</div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{l.email||l.phone||"—"}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{background:"#f1f5f9",padding:"2px 8px",borderRadius:6,fontSize:12}}>{l.username}</code></td>
                    <td>{l.group_name ? <span style={{background:"#eff6ff",color:"#1e40af",padding:"2px 10px",borderRadius:99,fontSize:12,fontWeight:600}}>{l.group_name}</span> : <span style={{color:"#94a3b8",fontSize:12}}>Not assigned</span>}</td>
                    <td><strong style={{color:"#3b82f6"}}>{l.member_count||0}</strong></td>
                    <td><span className="db-savings">₹{(l.savings||0).toLocaleString("en-IN")}</span></td>
                    <td>
                      <span className={`db-badge ${l.is_active?"db-badge-green":"db-badge-red"}`}>
                        {l.is_active?"Active":"Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Groups Table ── */}
      <div className="db-card db-table-card" style={{marginTop:20}}>
        <div className="db-card-head">
          <h3>All Groups ({groups.length})</h3>
          <span className="db-chip db-chip-live">● Live from DB</span>
        </div>
        <div className="db-table-wrap">
          {loading ? (
            <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>Loading groups…</div>
          ) : groups.length===0 ? (
            <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>No groups yet.</div>
          ) : (
            <table className="db-table">
              <thead>
                <tr><th>#</th><th>Group ID</th><th>Name</th><th>Leader</th><th>Members</th><th>Savings</th><th>Status</th></tr>
              </thead>
              <tbody>
                {groups.map((g,i)=>(
                  <tr key={g.id}>
                    <td className="db-td-muted">{i+1}</td>
                    <td><code style={{background:"#f1f5f9",padding:"2px 8px",borderRadius:6,fontSize:12}}>{g.group_id}</code></td>
                    <td><strong>{g.name}</strong></td>
                    <td style={{color:"#64748b"}}>{g.leader_name||"—"}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{background:"#e2e8f0",borderRadius:99,height:6,width:50,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${((g.member_count||0)/10)*100}%`,background:(g.member_count||0)>=10?"#ef4444":"#3b82f6",borderRadius:99}}/>
                        </div>
                        <span style={{fontWeight:700,fontSize:13}}>{g.member_count||0}/10</span>
                      </div>
                    </td>
                    <td><span className="db-savings">₹{(g.total_savings||0).toLocaleString("en-IN")}</span></td>
                    <td><span className={`db-badge ${(g.status||"Active")==="Active"?"db-badge-green":"db-badge-red"}`}>{g.status||"Active"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Members Table ── */}
      <div className="db-card db-table-card" style={{marginTop:20}}>
        <div className="db-card-head">
          <h3>All Members ({members.length})</h3>
          <span className="db-chip db-chip-live">● Live from DB</span>
        </div>
        <div className="db-table-wrap">
          {loading ? (
            <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>Loading members...</div>
          ) : members.length===0 ? (
            <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>No members yet.</div>
          ) : (
            <table className="db-table">
              <thead>
                <tr><th>#</th><th>Member</th><th>Phone</th><th>Group</th><th>Leader</th><th>Savings</th><th>Joined</th><th>Status</th></tr>
              </thead>
              <tbody>
                {members.map((m,i)=>{
                  const grp = groups.find(g=>g.id===m.group_id);
                  const ldr = leaders.find(l=>l.group_id===m.group_id);
                  return (
                  <tr key={m.id}>
                    <td className="db-td-muted">{i+1}</td>
                    <td>
                      <div className="db-td-leader">
                        <div className="db-avatar" style={{background:"linear-gradient(135deg,#10b981,#059669)",color:"white"}}>{m.name?.[0]}</div>
                        <div><div style={{fontWeight:700}}>{m.name}</div><div style={{fontSize:11,color:"#94a3b8"}}>{m.member_id}</div></div>
                      </div>
                    </td>
                    <td style={{color:"#64748b"}}>{m.phone||"—"}</td>
                    <td>{grp?<span style={{background:"#eff6ff",color:"#1e40af",padding:"2px 10px",borderRadius:99,fontSize:12,fontWeight:600}}>{grp.name}</span>:<span style={{color:"#94a3b8"}}>—</span>}</td>
                    <td style={{color:"#64748b"}}>{ldr?ldr.name:"—"}</td>
                    <td><span className="db-savings">Rs {(m.total_savings||0).toLocaleString("en-IN")}</span></td>
                    <td style={{color:"#64748b",fontSize:12}}>{m.join_date||"—"}</td>
                    <td><span className={"db-badge "+(m.status==="Active"?"db-badge-green":"db-badge-red")}>{m.status||"Active"}</span></td>
                  </tr>);
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;