import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./ManageLeaders.css";

const token = () => localStorage.getItem("bachatgat_token");
const hdrs  = () => ({ "Content-Type":"application/json","Authorization":`Bearer ${token()}` });

export default function ManageLeaders() {
  const [leaders,   setLeaders]   = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId,  setDeleteId]  = useState(null);
  const [viewId,    setViewId]    = useState(null);
  const [search,    setSearch]    = useState("");
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [newCreds,  setNewCreds]  = useState(null); // show generated creds
  const [form, setForm] = useState({
    name:"", phone:"", email:"", group_id:"", username:"", password:""
  });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type="success") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [lRes, gRes] = await Promise.all([
        fetch(`${API}/auth/leaders`,  { headers: hdrs() }),
        fetch(`${API}/groups/`,       { headers: hdrs() }),
      ]);
      if (lRes.ok) setLeaders(await lRes.json());
      if (gRes.ok) setGroups(await gRes.json());
    } catch { showToast("Cannot connect to server","error"); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    // Prevent assigning to a group that already has a leader
    if (form.group_id) {
      const sel = groups.find(x => String(x.id) === String(form.group_id));
      if (sel && sel.leader_id) { showToast("Selected group already has a leader","error"); return; }
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/create-leader`, {
        method:"POST", headers: hdrs(),
        body: JSON.stringify({
          name:     form.name,
          phone:    form.phone,
          email:    form.email    || null,
          group_id: form.group_id ? parseInt(form.group_id) : null,
          username: form.username || null,
          password: form.password || null,
        })
      });
      const d = await res.json();
      if (res.ok) {
        // Show generated credentials to admin
        setNewCreds({ username: d.username, password: d.password, name: d.name || form.name });
        setShowModal(false);
        setForm({ name:"", phone:"", email:"", group_id:"", username:"", password:"" });
        load();
      } else {
        showToast(d.detail || "Failed to create leader","error");
      }
    } catch { showToast("Cannot connect","error"); }
    finally  { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try {
      await fetch(`${API}/auth/users/${id}/toggle-status`, { method:"PATCH", headers: hdrs() });
      load();
    } catch { showToast("Failed","error"); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/auth/users/${id}`, { method:"DELETE", headers: hdrs() });
      if (res.ok) { showToast("Leader removed"); setDeleteId(null); load(); }
      else showToast("Delete failed","error");
    } catch { showToast("Cannot connect","error"); }
  };

  const filtered = leaders.filter(l =>
    (l.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (l.username||"").toLowerCase().includes(search.toLowerCase())
  );

  const viewLeader = viewId ? leaders.find(l=>l.id===viewId) : null;

  return (
    <div className="page-container">
      {toast && <div className={`ml-toast ml-toast-${toast.type}`}>{toast.type==="success"?"✓":"✕"} {toast.msg}</div>}

      {/* Generated Credentials Modal */}
      {newCreds && (
        <div className="ml-overlay">
          <div className="ml-modal">
            <div className="ml-modal-head" style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>
              <h3 style={{color:"white"}}>✅ Leader Created Successfully!</h3>
              <button className="ml-modal-close" onClick={()=>setNewCreds(null)} style={{color:"white"}}>✕</button>
            </div>
            <div className="ml-modal-body">
              <p style={{color:"#64748b",marginBottom:16}}>
                Share these credentials with <strong>{newCreds.name}</strong>. They can login immediately.
              </p>
              <div style={{background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:12,padding:20}}>
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:12,color:"#64748b",fontWeight:600,textTransform:"uppercase"}}>Username</label>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"monospace",color:"#065f46",marginTop:4,
                    background:"white",padding:"8px 12px",borderRadius:8,border:"1px solid #bbf7d0"}}>
                    {newCreds.username}
                  </div>
                </div>
                <div>
                  <label style={{fontSize:12,color:"#64748b",fontWeight:600,textTransform:"uppercase"}}>Password</label>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"monospace",color:"#065f46",marginTop:4,
                    background:"white",padding:"8px 12px",borderRadius:8,border:"1px solid #bbf7d0"}}>
                    {newCreds.password}
                  </div>
                </div>
              </div>
              <p style={{fontSize:12,color:"#94a3b8",marginTop:12}}>
                ⚠️ Note down these credentials — password won't be shown again.
              </p>
            </div>
            <div className="ml-modal-foot">
              <button className="ml-btn-save" onClick={()=>setNewCreds(null)}>Got it ✓</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="ml-breadcrumb">Home / <span className="ml-bc-active">Manage Leaders</span></div>
          <h1>Manage Leaders</h1>
          <p className="page-sub">Create leaders — system auto-generates login credentials ✓</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn-outline" onClick={load}>↻ Refresh</button>
          <button className="btn-primary" onClick={()=>{setShowModal(true);setErrors({});}}>+ Add Leader</button>
        </div>
      </div>

      {/* Stats */}
      <div className="mg-strip" style={{marginBottom:20}}>
        {[
          {label:"Total Leaders",  val:leaders.length,                           color:"#3b82f6"},
          {label:"Active",         val:leaders.filter(l=>l.is_active).length,    color:"#10b981"},
          {label:"With Group",     val:leaders.filter(l=>l.group_id).length,     color:"#8b5cf6"},
          {label:"Total Members",  val:leaders.reduce((s,l)=>s+(l.member_count||0),0), color:"#f59e0b"},
        ].map((s,i)=>(
          <div key={i} className="mg-strip-item" style={{"--c":s.color}}>
            <span className="mg-strip-val" style={{color:s.color}}>{s.val}</span>
            <span className="mg-strip-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="ml-toolbar" style={{marginBottom:16}}>
        <div className="ml-search-box">
          <span>🔍</span>
          <input placeholder="Search by name or username…" value={search}
            onChange={e=>setSearch(e.target.value)} />
          {search && <button className="ml-clear" onClick={()=>setSearch("")}>✕</button>}
        </div>
        <span className="ml-result-count">{filtered.length} leaders</span>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading from database…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Leader</th><th>Username</th><th>Phone</th><th>Group</th><th>Members</th><th>Savings</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign:"center",padding:40,color:"#94a3b8"}}>No leaders yet — click "+ Add Leader"</td></tr>
              ) : filtered.map(l=>(
                <tr key={l.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:14}}>
                        {l.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:700,color:"#0f172a"}}>{l.name}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{l.email||"—"}</div>
                      </div>
                    </div>
                  </td>
                  <td><code style={{background:"#f1f5f9",padding:"2px 8px",borderRadius:6,fontSize:13}}>{l.username}</code></td>
                  <td style={{color:"#64748b"}}>{l.phone||"—"}</td>
                  <td>
                    {l.group_name ? (
                      <span style={{background:"#eff6ff",color:"#1e40af",padding:"2px 10px",borderRadius:99,fontSize:12,fontWeight:600}}>{l.group_name}</span>
                    ) : <span style={{color:"#94a3b8",fontSize:12}}>Not assigned</span>}
                  </td>
                  <td style={{fontWeight:700,color:"#3b82f6"}}>{l.member_count||0}</td>
                  <td style={{color:"#10b981",fontWeight:600}}>₹{(l.savings||0).toLocaleString("en-IN")}</td>
                  <td>
                    <button onClick={()=>handleToggle(l.id)} style={{
                      background:l.is_active?"#dcfce7":"#fee2e2",
                      color:l.is_active?"#166534":"#dc2626",
                      border:"none",padding:"3px 12px",borderRadius:99,cursor:"pointer",fontWeight:600,fontSize:12
                    }}>{l.is_active?"Active":"Inactive"}</button>
                  </td>
                  <td>
                    <button className="btn-sm" onClick={()=>setViewId(l.id)}>👁 View</button>
                    <button className="btn-sm danger" onClick={()=>setDeleteId(l.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Leader Modal */}
      {showModal && (
        <div className="ml-overlay" onClick={e=>e.target.classList.contains("ml-overlay")&&setShowModal(false)}>
          <div className="ml-modal">
            <div className="ml-modal-head">
              <h3>➕ Add New Leader</h3>
              <button className="ml-modal-close" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="ml-modal-body">
              <p style={{fontSize:13,color:"#64748b",marginBottom:16,background:"#eff6ff",padding:"10px 14px",borderRadius:8,border:"1px solid #bfdbfe"}}>
                💡 Leave Username & Password blank — system will <strong>auto-generate</strong> secure credentials. You can also set custom ones.
              </p>
              <div className="ml-form-grid">
                <div className={`ml-field ${errors.name?"ml-field-err":""}`}>
                  <label>Full Name *</label>
                  <input value={form.name} placeholder="e.g. Priya Sharma" autoFocus
                    onChange={e=>{setForm({...form,name:e.target.value});setErrors({...errors,name:""}); }} />
                  {errors.name && <span className="ml-err-msg">{errors.name}</span>}
                </div>
                <div className={`ml-field ${errors.phone?"ml-field-err":""}`}>
                  <label>Phone *</label>
                  <input value={form.phone} placeholder="10-digit mobile"
                    onChange={e=>{setForm({...form,phone:e.target.value});setErrors({...errors,phone:""}); }} />
                  {errors.phone && <span className="ml-err-msg">{errors.phone}</span>}
                </div>
                <div className="ml-field">
                  <label>Email (optional)</label>
                  <input type="email" value={form.email} placeholder="email@example.com"
                    onChange={e=>setForm({...form,email:e.target.value})} />
                </div>
                <div className="ml-field">
                  <label>Assign to Group</label>
                  <select value={form.group_id} onChange={e=>setForm({...form,group_id:e.target.value})}>
                    <option value="">— No group yet —</option>
                    {groups.map(g=>(
                      <option key={g.id} value={g.id} disabled={!!g.leader_id}>
                        {g.name}{g.leader_name ? ` — Leader: ${g.leader_name}` : ""}{g.leader_id ? " (Assigned)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ml-field">
                  <label>Custom Username (optional)</label>
                  <input value={form.username} placeholder="auto-generated if blank"
                    onChange={e=>setForm({...form,username:e.target.value})} />
                </div>
                <div className="ml-field">
                  <label>Custom Password (optional)</label>
                  <input type="password" value={form.password} placeholder="auto-generated if blank"
                    onChange={e=>setForm({...form,password:e.target.value})} />
                </div>
              </div>
            </div>
            <div className="ml-modal-foot">
              <button className="ml-btn-cancel" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="ml-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Creating…" : "Create Leader & Generate Credentials"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Leader Modal */}
      {viewLeader && (
        <div className="ml-overlay" onClick={e=>e.target.classList.contains("ml-overlay")&&setViewId(null)}>
          <div className="ml-modal">
            <div className="ml-modal-head" style={{background:"linear-gradient(135deg,#3b82f6,#8b5cf6)"}}>
              <h3 style={{color:"white"}}>👤 {viewLeader.name}</h3>
              <button className="ml-modal-close" onClick={()=>setViewId(null)} style={{color:"white"}}>✕</button>
            </div>
            <div className="ml-modal-body">
              {[
                ["Username",  viewLeader.username],
                ["Email",     viewLeader.email||"—"],
                ["Phone",     viewLeader.phone||"—"],
                ["Group",     viewLeader.group_name||"Not assigned"],
                ["Members",   viewLeader.member_count||0],
                ["Savings",   `₹${(viewLeader.savings||0).toLocaleString("en-IN")}`],
                ["Status",    viewLeader.is_active?"Active":"Inactive"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1f5f9",fontSize:14}}>
                  <span style={{color:"#64748b",fontWeight:500}}>{k}</span>
                  <strong style={{color:"#0f172a"}}>{v}</strong>
                </div>
              ))}
            </div>
            <div className="ml-modal-foot">
              <button className="ml-btn-save" onClick={()=>setViewId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="ml-overlay">
          <div className="ml-modal ml-confirm">
            <div className="ml-confirm-icon">🗑️</div>
            <h3>Remove this leader?</h3>
            <p>Leader account will be permanently deleted.</p>
            <div className="ml-confirm-btns">
              <button className="ml-btn-cancel" onClick={()=>setDeleteId(null)}>Cancel</button>
              <button className="ml-btn-delete" onClick={()=>handleDelete(deleteId)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}