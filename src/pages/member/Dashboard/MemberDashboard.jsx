import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../../services/api";
import "./MemberDashboard.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("bachatgat_user")||"{}"); } catch { return {}; } };
const hdrs     = () => ({ "Content-Type":"application/json","Authorization":`Bearer ${getToken()}` });

export default function MemberDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [meetings,  setMeetings]  = useState([]);
  const [group,     setGroup]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [toast,    setToast]    = useState(null);
  const nav  = useNavigate();
  const user = getUser();

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const gid = user.group_id || null;
      try {
        if (!gid) {
          showToast("Your group is not assigned yet. Contact leader/admin.", "error");
          setDashboard(null);
          setMeetings([]);
          setGroup(null);
          return;
        }
        const [dashRes, meetRes, grpRes] = await Promise.all([
          fetch(`${API}/dashboard/member`,   { headers: hdrs() }),
          fetch(`${API}/meetings/group/${gid}`,  { headers: hdrs() }),
          fetch(`${API}/groups/${gid}`,          { headers: hdrs() }),
        ]);
        if (dashRes.ok) setDashboard(await dashRes.json());
        else console.error("Dashboard fetch failed:", dashRes.status);
        if (meetRes.ok) setMeetings(await meetRes.json());
        else console.error("Meetings fetch failed:", meetRes.status);
        if (grpRes.ok)  setGroup(await grpRes.json());
        else console.error("Group fetch failed:", grpRes.status);
      } catch (err) { 
        console.error("Member dashboard error:", err);
        showToast("Cannot connect to server","error"); 
      }
      finally  { setLoading(false); }
    };
    load();
    // Auto-refresh every 8 seconds
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const today      = new Date().toISOString().split("T")[0];
  const savings     = dashboard?.recent_deposits || [];
  const loans       = dashboard?.active_loans || [];
  const totalSav    = dashboard?.total_savings || 0;
  const activeLoan  = loans.find(l=>l.status==="Active"||l.status==="Pending");
  const upcoming    = meetings.filter(m=>m.date>=today).slice(0,3);
  const alertMeets = meetings.filter(m=>{
    const diff=(new Date(m.date)-new Date())/(1000*60*60*24);
    return diff>=0 && diff<=2;
  });

  return (
    <div className="member-dashboard">
      {toast && <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="success"?"#10b981":"#ef4444",color:"white",padding:"12px 20px",borderRadius:10,fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>{toast.msg}</div>}

      {/* ── Header with real name + group + leader ── */}
      <div className="page-header">
        <div>
          <h2>👋 Welcome, {user.name || "Member"}!</h2>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:6}}>
            {group && (
              <>
                <span style={{background:"#eff6ff",color:"#1e40af",padding:"3px 12px",borderRadius:99,fontSize:13,fontWeight:600}}>
                  🏘️ Group: {group.name || user.group_name || "—"}
                </span>
                <span style={{background:"#f0fdf4",color:"#166534",padding:"3px 12px",borderRadius:99,fontSize:13,fontWeight:600}}>
                  👑 Leader: {group.leader_name || "—"}
                </span>
              </>
            )}
            {!group && user.group_name && (
              <span style={{background:"#eff6ff",color:"#1e40af",padding:"3px 12px",borderRadius:99,fontSize:13,fontWeight:600}}>
                🏘️ {user.group_name}
              </span>
            )}
          </div>
        </div>
        <button onClick={()=>nav("/member/payment")} style={{
          background:"linear-gradient(135deg,#10b981,#059669)",color:"white",
          border:"none",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14
        }}>💳 Make Payment</button>
      </div>

      {/* ── 2-day meeting alert ── */}
      {alertMeets.length > 0 && (
        <div style={{background:"#fef9c3",border:"1.5px solid #fde68a",borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:12}}>
          <span style={{fontSize:24}}>🔔</span>
          <div>
            <strong style={{color:"#92400e",fontSize:14}}>Meeting Alert — Happening Soon!</strong>
            {alertMeets.map(m=>(
              <div key={m.id} style={{fontSize:13,color:"#78350f",marginTop:4}}>
                📅 <strong>{m.title}</strong> — {m.date} {m.time?`at ${m.time}`:""} {m.venue?`@ ${m.venue}`:""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stats-grid">
        {[
          { icon:"💰", val:`₹${totalSav.toLocaleString("en-IN")}`, label:"Total Savings",  color:"#10b981", path:"/member/my-savings" },
          { icon:"🏦", val:activeLoan?`₹${(activeLoan.balance||0).toLocaleString("en-IN")}`:"₹0", label:"Loan Balance", color:"#f59e0b", path:"/member/my-loans" },
          { icon:"📋", val:savings.length,    label:"Transactions", color:"#3b82f6", path:"/member/my-savings" },
          { icon:"📅", val:upcoming.length,   label:"Meetings",     color:"#8b5cf6", path:null },
        ].map((s,i)=>(
          <div key={i} className="stat-card"
            style={{borderTopColor:s.color,cursor:s.path?"pointer":"default",transition:"transform .2s"}}
            onClick={()=>s.path&&nav(s.path)}
            onMouseEnter={e=>{if(s.path)e.currentTarget.style.transform="translateY(-3px)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";}}>
            <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
            <p style={{fontSize:22,fontWeight:800,color:s.color,margin:"0 0 4px"}}>{s.val}</p>
            <p style={{fontSize:12,color:"#64748b",margin:0,fontWeight:600}}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:20}}>
        {/* ── Recent Transactions ── */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:700}}>💳 Recent Transactions</h3>
            <button onClick={()=>nav("/member/my-savings")} style={{fontSize:12,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>View all →</button>
          </div>
          {loading ? <p style={{color:"#94a3b8",fontSize:13}}>Loading…</p> :
          savings.length===0 ? (
            <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8"}}>
              <p>No transactions yet</p>
              <button onClick={()=>nav("/member/payment")} style={{marginTop:8,background:"#10b981",color:"white",border:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>Make First Payment</button>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Amount</th><th>Description</th></tr></thead>
              <tbody>
                {savings.slice(0,5).map((s,i)=>(
                  <tr key={i}>
                    <td style={{color:"#64748b",fontSize:12}}>{s.date}</td>
                    <td style={{color:"#10b981",fontWeight:700}}>₹{(s.amount||0).toLocaleString("en-IN")}</td>
                    <td style={{fontSize:12,color:"#64748b"}}>{s.description||"Savings"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Loan Status ── */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:700}}>🏦 Loan Status</h3>
            <button onClick={()=>nav("/member/my-loans")} style={{fontSize:12,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>View all →</button>
          </div>
          {loading ? <p style={{color:"#94a3b8",fontSize:13}}>Loading…</p> :
          !activeLoan ? (
            <div style={{textAlign:"center",padding:"20px 0",color:"#94a3b8"}}>
              <div style={{fontSize:40}}>🎉</div>
              <p style={{margin:"8px 0",fontSize:13}}>No active loans!</p>
              <button onClick={()=>nav("/member/my-loans")} style={{marginTop:8,background:"#3b82f6",color:"white",border:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>Apply for Loan</button>
            </div>
          ) : (
            <div>
              {[
                ["Loan ID",    activeLoan.loan_id],
                ["Amount",    `₹${(activeLoan.amount||0).toLocaleString("en-IN")}`],
                ["Paid",      `₹${(activeLoan.amount_paid||0).toLocaleString("en-IN")}`],
                ["Remaining", `₹${(activeLoan.balance||0).toLocaleString("en-IN")}`],
                ["Status",    activeLoan.status],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:13}}>
                  <span style={{color:"#64748b"}}>{k}</span>
                  <strong style={{color:k==="Remaining"?"#ef4444":k==="Status"?(activeLoan.status==="Active"?"#10b981":"#f59e0b"):"#0f172a"}}>{v}</strong>
                </div>
              ))}
              <div style={{marginTop:12}}>
                <div style={{background:"#e2e8f0",borderRadius:99,height:8,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:99,background:"linear-gradient(90deg,#3b82f6,#10b981)",
                    width:`${Math.min(((activeLoan.amount_paid||0)/activeLoan.amount)*100,100)}%`,transition:"width .5s"}}/>
                </div>
                <p style={{fontSize:11,color:"#94a3b8",marginTop:4}}>
                  {Math.round(((activeLoan.amount_paid||0)/activeLoan.amount)*100)}% repaid
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Upcoming Meetings ── */}
      <div className="card" style={{marginTop:20}}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700}}>📅 Upcoming Meetings</h3>
        {loading ? <p style={{color:"#94a3b8",fontSize:13}}>Loading…</p> :
        upcoming.length===0 ? (
          <p style={{color:"#94a3b8",textAlign:"center",padding:"16px 0",fontSize:13}}>No upcoming meetings scheduled</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {upcoming.map(m=>{
              const diff=(new Date(m.date)-new Date())/(1000*60*60*24);
              const isAlert=diff>=0&&diff<=2;
              return (
                <div key={m.id} style={{
                  display:"flex",alignItems:"center",gap:14,padding:"12px 16px",
                  background:isAlert?"#fef9c3":"#f8fafc",
                  border:`1.5px solid ${isAlert?"#fde68a":"#e2e8f0"}`,borderRadius:10
                }}>
                  <span style={{fontSize:24}}>{isAlert?"🔔":"📅"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{m.title}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                      {m.date}{m.time?` at ${m.time}`:""}{m.venue?` • ${m.venue}`:""}
                    </div>
                    {m.agenda&&<div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{m.agenda}</div>}
                  </div>
                  {isAlert&&<span style={{fontSize:11,background:"#fde68a",color:"#92400e",padding:"2px 8px",borderRadius:99,fontWeight:700}}>SOON!</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginTop:20}}>
        {[
          {icon:"📊",label:"My Savings",  path:"/member/my-savings", color:"#10b981"},
          {icon:"🏦",label:"My Loans",    path:"/member/my-loans",   color:"#3b82f6"},
          {icon:"🗂️",label:"Schemes",     path:"/member/schemes",    color:"#8b5cf6"},
          {icon:"💳",label:"Pay Now",     path:"/member/payment",    color:"#f59e0b"},
          {icon:"📄",label:"My Reports",  path:"/member/my-reports", color:"#ef4444"},
        ].map((a,i)=>(
          <button key={i} onClick={()=>nav(a.path)} style={{
            background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"16px 8px",
            cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8,
            fontWeight:600,fontSize:13,color:"#0f172a",transition:"all .2s"
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.transform="none";}}>
            <span style={{fontSize:24}}>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>
    </div>
  );
}