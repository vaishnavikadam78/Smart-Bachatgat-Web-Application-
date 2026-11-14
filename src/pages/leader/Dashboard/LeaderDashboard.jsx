import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./LeaderDashboard.css";

const getToken  = () => localStorage.getItem("bachatgat_token") || "";
const getUser   = () => { try { return JSON.parse(localStorage.getItem("bachatgat_user")||"{}"); } catch { return {}; } };
const getGroupId= () => { const u=getUser(); return u.group_id||u.groupId||null; };
const hdrs      = () => ({ "Content-Type":"application/json", "Authorization":`Bearer ${getToken()}` });

const Counter = ({ target, prefix="", suffix="" }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end  = parseFloat(String(target).replace(/[^0-9.]/g,""));
    const step = end / (1000/16);
    let cur = 0;
    const t = setInterval(() => {
      cur += step;
      if (cur >= end) { setVal(end); clearInterval(t); }
      else setVal(cur);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return <span>{prefix}{Math.floor(val).toLocaleString("en-IN")}{suffix}</span>;
};

const MiniBar = ({ value, max, color }) => (
  <div className="ld-minibar-track">
    <div className="ld-minibar-fill" style={{ width:`${Math.min((value/max)*100,100)}%`, background:color }} />
  </div>
);

const typeConfig = {
  Savings:   { color:"#10b981", bg:"#f0fdf4", border:"#bbf7d0" },
  Loan:      { color:"#3b82f6", bg:"#eff6ff", border:"#bfdbfe" },
  Repayment: { color:"#8b5cf6", bg:"#f5f3ff", border:"#ddd6fe" },
};

export default function LeaderDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [members,   setMembers]   = useState([]);
  const [txns,      setTxns]      = useState([]);
  const [meetings,  setMeetings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const gid = getGroupId();
      try {
        if (!gid) {
          showToast("Your group is not assigned yet. Contact admin.", "error");
          setDashboard(null);
          setMembers([]);
          setMeetings([]);
          setTxns([]);
          return;
        }
        const [dashRes, mRes, mtRes] = await Promise.all([
          fetch(`${API}/dashboard/leader/${gid}`, { headers: hdrs() }),
          fetch(`${API}/members/group/${gid}`,   { headers: hdrs() }),
          fetch(`${API}/meetings/group/${gid}`,  { headers: hdrs() }),
        ]);
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setDashboard(dashData);
          setTxns(dashData.recent_deposits || []);
        } else {
          console.error("Dashboard fetch error:", dashRes.status, dashRes.statusText);
          const errData = await dashRes.json().catch(() => ({}));
          console.error("Error details:", errData);
        }
        if (mRes.ok)    setMembers(await mRes.json());
        else {
          console.error("Members fetch error:", mRes.status);
          const errData = await mRes.json().catch(() => ({}));
          console.error("Members error details:", errData);
        }
        if (mtRes.ok)   setMeetings(await mtRes.json());
        else {
          console.error("Meetings fetch error:", mtRes.status);
          const errData = await mtRes.json().catch(() => ({}));
          console.error("Meetings error details:", errData);
        }
      } catch (err) { 
        console.error("LeaderDashboard error:", err);
        console.error("Error message:", err.message);
        showToast("Cannot connect to server. Check backend is running on port 8000","error"); 
      }
      finally { setLoading(false); }
    };
    load();
    // Auto-refresh every 10 seconds
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalSavings   = dashboard?.total_savings ?? members.reduce((s,m)=>s+(m.total_savings||0),0);
  const activeLoans    = dashboard?.active_loans ?? txns.filter(t=>(t.description||"").toLowerCase().includes("loan")).length;
  const activeMembers  = dashboard?.total_members ?? members.filter(m=>m.status==="Active").length;
  const today          = new Date().toISOString().split("T")[0];
  const upcomingMeet   = meetings.filter(m=>m.date>=today).length;

  const stats = [
    { label:"Total Members",  val:activeMembers,  prefix:"",  suffix:"",  color:"#3b82f6", icon:"👥", change:`${activeMembers} active` },
    { label:"Total Savings",  val:totalSavings,   prefix:"₹", suffix:"",  color:"#10b981", icon:"💰", change:"Across all members" },
    { label:"Active Loans",   val:activeLoans,    prefix:"",  suffix:"",  color:"#f59e0b", icon:"🏦", change:"Loan transactions" },
    { label:"Meetings",       val:upcomingMeet,   prefix:"",  suffix:"",  color:"#8b5cf6", icon:"📅", change:"Upcoming scheduled" },
  ];

  const exportCSV = () => {
    const rows = [
      ["=== MEMBERS ==="],
      ["Name","Phone","Savings","Status","Join Date"],
      ...members.map(m=>[m.name,m.phone,m.total_savings||0,m.status,m.join_date]),
      [""],
      ["=== TRANSACTIONS ==="],
      ["Date","Amount","Description"],
      ...txns.map(t=>[t.date,t.amount,t.description||"-"]),
    ];
    const csv  = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = `leader_report_${today}.csv`;
    a.click();
    showToast("Report exported as CSV ✅");
  };

  return (
    <div className="dashboard">
      {toast && (
        <div style={{
          position:"fixed",top:20,right:20,zIndex:9999,
          background:toast.type==="success"?"#10b981":"#ef4444",
          color:"white",padding:"12px 20px",borderRadius:10,
          fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,.2)",fontSize:14
        }}>
          {toast.type==="success"?"✓":"✕"} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="ld-breadcrumb">Home <span>/</span> Dashboard</div>
          <h2>Leader Dashboard</h2>
          <p>Welcome, {getUser().name || "Leader"} — your group overview</p>
        </div>
        <div className="ld-header-right">
          <div className="ld-date-badge">
            {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
          </div>
          <button className="ld-export-btn" onClick={exportCSV}>↓ Export</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s,i) => (
          <div className="stat-card" key={s.label} style={{"--c":s.color,animationDelay:`${i*0.08}s`}}>
            <div className="ld-stat-top">
              <div className="ld-stat-badge" style={{background:`${s.color}15`,color:s.color,fontSize:20}}>
                {s.icon}
              </div>
              <span className="ld-stat-change">{s.change}</span>
            </div>
            <div className="stat-value" style={{color:s.color}}>
              <Counter target={s.val} prefix={s.prefix} suffix={s.suffix} />
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="ld-stat-bar">
              <div className="ld-stat-bar-fill" style={{width:`${Math.min((s.val/(s.val*1.3||1))*100,90)}%`,background:s.color}} />
            </div>
          </div>
        ))}
      </div>

      <div className="ld-grid-2">
        {/* Recent Transactions */}
        <div className="card ld-txn-card">
          <div className="ld-card-head">
            <h3 className="section-title">Recent Transactions</h3>
            <a href="/leader/transactions" className="ld-view-all">View all →</a>
          </div>
          {loading ? (
            <p style={{color:"#94a3b8",padding:"20px 0"}}>Loading…</p>
          ) : txns.length === 0 ? (
            <p style={{color:"#94a3b8",padding:"20px 0",textAlign:"center"}}>No transactions yet</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Member</th><th>Type</th><th>Amount</th><th>Date</th></tr>
              </thead>
              <tbody>
                {txns.slice(0,5).map((t,i) => {
                  const desc = (t.description||"Savings");
                  const type = desc.includes("Loan")?"Loan":desc.includes("Repayment")?"Repayment":"Savings";
                  const cfg  = typeConfig[type];
                  const mem  = members.find(m=>m.id===t.member_id);
                  return (
                    <tr key={t.id||i}>
                      <td className="ld-td-num">{i+1}</td>
                      <td className="ld-td-name">{mem?.name||`Member #${t.member_id}`}</td>
                      <td>
                        <span className="ld-type-badge" style={{color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.border}`}}>
                          {type}
                        </span>
                      </td>
                      <td className="ld-td-amount">₹{(t.amount||0).toLocaleString("en-IN")}</td>
                      <td className="ld-td-date">{t.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Member Health */}
        <div className="card ld-health-card">
          <div className="ld-card-head">
            <h3 className="section-title">Member Health</h3>
            <a href="/leader/members" className="ld-view-all">View all →</a>
          </div>
          {loading ? (
            <p style={{color:"#94a3b8",padding:"20px 0"}}>Loading…</p>
          ) : members.length === 0 ? (
            <p style={{color:"#94a3b8",padding:"20px 0",textAlign:"center"}}>No members yet</p>
          ) : (
            <div className="ld-health-list">
              {members.slice(0,5).map((m,i) => {
                const score = Math.min(100, 60 + Math.floor((m.total_savings||0)/100));
                return (
                  <div key={i} className="ld-health-row">
                    <div className="ld-health-avatar">
                      {m.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div className="ld-health-info">
                      <div className="ld-health-name">{m.name}</div>
                      <div className="ld-health-savings">₹{(m.total_savings||0).toLocaleString("en-IN")} saved</div>
                    </div>
                    <div className="ld-health-score-wrap">
                      <MiniBar value={score} max={100} color={score>80?"#10b981":score>60?"#f59e0b":"#ef4444"} />
                      <span className="ld-health-score" style={{color:score>80?"#10b981":score>60?"#f59e0b":"#ef4444"}}>
                        {score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="ld-summary-row">
            <div className="ld-summary-item">
              <span className="ld-sum-val">₹{totalSavings.toLocaleString("en-IN")}</span>
              <span className="ld-sum-label">Total Savings</span>
            </div>
            <div className="ld-summary-sep"/>
            <div className="ld-summary-item">
              <span className="ld-sum-val">{activeMembers}</span>
              <span className="ld-sum-label">Active Members</span>
            </div>
            <div className="ld-summary-sep"/>
            <div className="ld-summary-item">
              <span className="ld-sum-val">{upcomingMeet}</span>
              <span className="ld-sum-label">Upcoming Meetings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}