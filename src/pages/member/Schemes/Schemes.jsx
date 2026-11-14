import { useState, useEffect } from "react";
import { API } from "../../../services/api";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type":"application/json","Authorization":`Bearer ${getToken()}` });

const STATUS_COLORS = { Pending:"#f59e0b", Approved:"#10b981", Rejected:"#ef4444" };
const CAT_ICONS = { "Women Empowerment":"👩","Business Loan":"💼","Agriculture":"🌾","Education":"🎓","Startup Support":"🚀","Savings & Insurance":"🛡️","Government Welfare":"🏛️" };

export default function Schemes() {
  const [schemes,  setSchemes]  = useState([]);
  const [myApps,   setMyApps]   = useState([]);
  const [cats,     setCats]     = useState(["All"]);
  const [selCat,   setSelCat]   = useState("All");
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [applying, setApplying] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [detail,   setDetail]   = useState(null);
  const [tab,      setTab]      = useState("browse"); // browse / my-apps

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, aRes] = await Promise.all([
        fetch(`${API}/schemes/?category=${selCat}&search=${search}`, { headers: hdrs() }),
        fetch(`${API}/schemes/categories`, { headers: hdrs() }),
        fetch(`${API}/schemes/my-applications`, { headers: hdrs() }),
      ]);
      if (sRes.ok) setSchemes(await sRes.json());
      if (cRes.ok) setCats(await cRes.json());
      if (aRes.ok) setMyApps(await aRes.json());
    } catch { showToast("Cannot connect to server","error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selCat, search]);

  const apply = async (id, name) => {
    setApplying(id);
    try {
      const res = await fetch(`${API}/schemes/${id}/apply`, { method:"POST", headers: hdrs() });
      const d   = await res.json();
      if (res.ok) { showToast(`Applied for "${name}" ✅`); load(); setDetail(null); }
      else showToast(d.detail || "Apply failed","error");
    } catch { showToast("Cannot connect","error"); }
    finally { setApplying(null); }
  };

  const isApplied = (idOrName) => myApps.some(a => a.scheme_id === idOrName || a.scheme_name === idOrName || a.scheme_id === Number(idOrName));

  return (
    <div className="page-container">
      {toast && <div className={`ml-toast ml-toast-${toast.type}`}>{toast.type==="success"?"✓":"✕"} {toast.msg}</div>}

      <div className="page-header" style={{marginBottom:20}}>
        <div>
          <h2>Government Schemes</h2>
          <p>Explore and apply for schemes — status tracked automatically</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setTab("browse")} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:tab==="browse"?"#3b82f6":"white",color:tab==="browse"?"white":"#0f172a",cursor:"pointer",fontWeight:600}}>Browse Schemes</button>
          <button onClick={()=>setTab("my-apps")} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid #e2e8f0",background:tab==="my-apps"?"#8b5cf6":"white",color:tab==="my-apps"?"white":"#0f172a",cursor:"pointer",fontWeight:600}}>My Applications {myApps.length>0&&`(${myApps.length})`}</button>
        </div>
      </div>

      {tab === "my-apps" ? (
        <div className="card">
          <h3 style={{marginBottom:16}}>My Scheme Applications</h3>
          {myApps.length === 0 ? (
            <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>
              <div style={{fontSize:40}}>📋</div>
              <p style={{marginTop:8}}>No applications yet. Browse schemes to apply!</p>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Scheme</th><th>Category</th><th>Status</th><th>Applied On</th></tr></thead>
              <tbody>
                {myApps.map((a,i)=>(
                  <tr key={i}>
                    <td><strong>{a.scheme_name}</strong></td>
                    <td>{a.category}</td>
                    <td><span style={{background:`${STATUS_COLORS[a.status]}20`,color:STATUS_COLORS[a.status],padding:"3px 10px",borderRadius:99,fontWeight:700,fontSize:12}}>{a.status}</span></td>
                    <td style={{color:"#64748b",fontSize:12}}>{a.applied_at?.split("T")[0]||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          {/* Search + Category Filter */}
          <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:1,minWidth:200,display:"flex",alignItems:"center",gap:8,background:"white",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"8px 14px"}}>
              <span>🔍</span>
              <input placeholder="Search schemes…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{border:"none",outline:"none",fontSize:14,width:"100%"}} />
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setSelCat(c)} style={{
                  padding:"6px 14px",borderRadius:99,border:"1.5px solid #e2e8f0",cursor:"pointer",fontSize:13,fontWeight:600,
                  background:selCat===c?"#3b82f6":"white",color:selCat===c?"white":"#64748b"
                }}>{CAT_ICONS[c]||""} {c}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading schemes…</div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
              {schemes.map(s=>{
                const applied = myApps.some(a=>a.scheme_name===s.name);
                return (
                  <div key={s.id} style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,.05)",transition:"box-shadow .2s"}}>
                    <div style={{background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",padding:"16px 18px",color:"white"}}>
                      <div style={{fontSize:24,marginBottom:4}}>{CAT_ICONS[s.category]||"🏛️"}</div>
                      <div style={{fontWeight:700,fontSize:15}}>{s.name}</div>
                      <div style={{fontSize:11,opacity:.85,marginTop:2}}>{s.category}</div>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      <p style={{fontSize:13,color:"#64748b",marginBottom:12,lineHeight:1.5}}>{s.description}</p>
                      <div style={{fontSize:12,color:"#10b981",fontWeight:600,marginBottom:8}}>✨ {s.benefits}</div>
                      <div style={{display:"flex",gap:8,marginTop:12}}>
                        <button onClick={()=>setDetail(s)} style={{flex:1,padding:"8px",border:"1.5px solid #3b82f6",borderRadius:8,background:"white",color:"#3b82f6",cursor:"pointer",fontWeight:600,fontSize:13}}>View Details</button>
                        <button onClick={()=>!applied&&apply(s.id,s.name)} disabled={applied||applying===s.id}
                          style={{flex:1,padding:"8px",border:"none",borderRadius:8,cursor:applied?"default":"pointer",fontWeight:700,fontSize:13,
                            background:applied?"#dcfce7":"linear-gradient(135deg,#10b981,#059669)",
                            color:applied?"#166534":"white",opacity: applying===s.id ? 0.7 : 1}}>
                          {applied?"✓ Applied":applying===s.id?"Applying…":"Apply Now"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {schemes.length===0 && <div style={{gridColumn:"1/-1",textAlign:"center",padding:48,color:"#94a3b8"}}><div style={{fontSize:48}}>🔍</div><p>No schemes found</p></div>}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {detail && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:560,maxHeight:"85vh",overflow:"auto"}}>
            <div style={{background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",padding:"20px 24px",color:"white",borderRadius:"16px 16px 0 0"}}>
              <div style={{fontSize:28,marginBottom:6}}>{CAT_ICONS[detail.category]||"🏛️"}</div>
              <h3 style={{margin:0,fontSize:18}}>{detail.name}</h3>
              <p style={{margin:"4px 0 0",opacity:.85,fontSize:13}}>{detail.category}</p>
            </div>
            <div style={{padding:24}}>
              {[["Description",detail.description],["Benefits ✨",detail.benefits],["Eligibility",detail.eligibility],["Documents Required",detail.documents],["How to Apply",detail.process]].map(([k,v])=>v&&(
                <div key={k} style={{marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:4}}>{k}</div>
                  <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>{v}</div>
                </div>
              ))}
              <div style={{display:"flex",gap:10,marginTop:20}}>
                <button onClick={()=>setDetail(null)} style={{flex:1,padding:"10px",border:"1.5px solid #e2e8f0",borderRadius:10,background:"white",cursor:"pointer",fontWeight:600}}>Close</button>
                <button onClick={()=>apply(detail.id,detail.name)} disabled={myApps.some(a=>a.scheme_name===detail.name)||applying===detail.id}
                  style={{flex:2,padding:"10px",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,
                    background:myApps.some(a=>a.scheme_name===detail.name)?"#dcfce7":"linear-gradient(135deg,#10b981,#059669)",
                    color:myApps.some(a=>a.scheme_name===detail.name)?"#166534":"white"}}>
                  {myApps.some(a=>a.scheme_name===detail.name)?"✓ Already Applied":applying===detail.id?"Applying…":"Apply for this Scheme"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}