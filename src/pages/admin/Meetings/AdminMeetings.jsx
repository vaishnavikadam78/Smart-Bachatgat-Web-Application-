import { useState, useEffect } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import { API } from "../../../services/api";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type":"application/json","Authorization":`Bearer ${getToken()}` });

export default function AdminMeetings() {
  const { t } = useLanguage();
  const [meetings,  setMeetings]  = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);
  const [form, setForm] = useState({ title:"", agenda:"", date:"", time:"", venue:"", group_id:"0" });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, gRes] = await Promise.all([
        fetch(`${API}/meetings/all`,   { headers: hdrs() }),
        fetch(`${API}/groups/`,        { headers: hdrs() }),
      ]);
      if (mRes.ok) setMeetings(await mRes.json());
      if (gRes.ok) setGroups(await gRes.json());
    } catch { showToast("Cannot connect","error"); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title required";
    if (!form.date)          e.date  = "Date required";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/meetings/`, {
        method:"POST", headers: hdrs(),
        body: JSON.stringify({
          title:    form.title,
          agenda:   form.agenda || null,
          date:     form.date,
          time:     form.time   || null,
          venue:    form.venue  || null,
          group_id: form.group_id === "0" ? null : parseInt(form.group_id),
        })
      });
      const d = await res.json();
      if (res.ok) {
        const target = form.group_id === "0" ? "ALL groups" : `group ${form.group_id}`;
        showToast(`Meeting scheduled for ${target} ✅ — Notifications sent to all members!`);
        setForm({ title:"", agenda:"", date:"", time:"", venue:"", group_id:"0" });
        setErrors({});
        setShowForm(false);
        load();
      } else showToast(d.detail || "Failed","error");
    } catch { showToast("Cannot connect","error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/meetings/${id}`, { method:"DELETE", headers: hdrs() });
      if (res.ok) { showToast("Meeting deleted"); setDeleteId(null); load(); }
      else showToast("Delete failed","error");
    } catch { showToast("Cannot connect","error"); }
  };

  const today = new Date().toISOString().split("T")[0];

  const getGroupName = (gid) => {
    if (!gid || gid === 0) return "📢 All Groups (Broadcast)";
    const g = groups.find(x => x.id === gid);
    return g ? g.name : `Group #${gid}`;
  };

  return (
    <div className="page-container">
      {toast && <div className={`ml-toast ml-toast-${toast.type}`}>{toast.type==="success"?"✓":"✕"} {toast.msg}</div>}

      <div className="page-header">
        <div>
          <div className="ml-breadcrumb">Home / Meetings</div>
          <h2>Manage Meetings</h2>
          <p>Schedule meetings — broadcasts instantly to Leader & Member dashboards ✓</p>
        </div>
        <button className="btn-primary" onClick={()=>{ setShowForm(!showForm); setErrors({}); }}>
          {showForm ? "✕ Cancel" : "+ Schedule Meeting"}
        </button>
      </div>

      {/* Stats */}
      <div className="mg-strip" style={{marginBottom:20}}>
        {[
          { label:"Total",    val:meetings.length,                          color:"#3b82f6" },
          { label:"Upcoming", val:meetings.filter(m=>m.date>=today).length, color:"#8b5cf6" },
          { label:"Done",     val:meetings.filter(m=>m.date<today).length,  color:"#10b981" },
          { label:"Broadcast",val:meetings.filter(m=>!m.group_id||m.group_id===0).length, color:"#f59e0b" },
        ].map((s,i)=>(
          <div key={i} className="mg-strip-item" style={{"--c":s.color}}>
            <span className="mg-strip-val" style={{color:s.color}}>{s.val}</span>
            <span className="mg-strip-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{marginBottom:20,padding:24}}>
          <h3 style={{margin:"0 0 18px",fontSize:16,fontWeight:700}}>📅 Schedule New Meeting</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div className={`ml-field ${errors.title?"ml-field-err":""}`} style={{gridColumn:"1/-1"}}>
              <label>Meeting Title *</label>
              <input value={form.title} placeholder="e.g. Monthly Collection Meeting" autoFocus
                onChange={e=>{setForm({...form,title:e.target.value});setErrors({...errors,title:""}); }} />
              {errors.title && <span className="ml-err-msg">{errors.title}</span>}
            </div>
            <div className={`ml-field ${errors.date?"ml-field-err":""}`}>
              <label>Date *</label>
              <input type="date" value={form.date} min={today}
                onChange={e=>{setForm({...form,date:e.target.value});setErrors({...errors,date:""}); }} />
              {errors.date && <span className="ml-err-msg">{errors.date}</span>}
            </div>
            <div className="ml-field">
              <label>Time</label>
              <input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} />
            </div>
            <div className="ml-field">
              <label>Venue / Location</label>
              <input placeholder="e.g. Community Hall, Gram Panchayat" value={form.venue}
                onChange={e=>setForm({...form,venue:e.target.value})} />
            </div>
            <div className="ml-field">
              <label>Target Group</label>
              <select value={form.group_id} onChange={e=>setForm({...form,group_id:e.target.value})}>
                <option value="0">📢 All Groups (Broadcast to everyone)</option>
                {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="ml-field" style={{gridColumn:"1/-1"}}>
              <label>Agenda / Purpose</label>
              <textarea rows={3} placeholder="What will be discussed…" value={form.agenda}
                onChange={e=>setForm({...form,agenda:e.target.value})}
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #e2e8f0",resize:"vertical",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}} />
            </div>
          </div>
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:13,color:"#1e40af"}}>
            💡 <strong>Note:</strong> Meeting will be visible on <strong>Leader Dashboard</strong> and <strong>Member Dashboard</strong> automatically. Notifications will be sent to all group members.
          </div>
          <div style={{display:"flex",gap:12,marginTop:18}}>
            <button className="ml-btn-cancel" onClick={()=>setShowForm(false)}>Cancel</button>
            <button className="ml-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "Saving + Notifying…" : "Schedule & Notify All"}
            </button>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="table-card">
        {loading ? (
          <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading from database…</div>
        ) : meetings.length === 0 ? (
          <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>
            <div style={{fontSize:48}}>📅</div>
            <p>No meetings scheduled yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Date & Time</th><th>Venue</th><th>Target</th><th>Agenda</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {meetings.map(m=>{
                const isPast = m.date < today;
                const isAlert = !isPast && (new Date(m.date)-new Date())/(1000*60*60*24) <= 2;
                return (
                  <tr key={m.id} style={{background:isAlert?"#fef9c3":"white"}}>
                    <td><strong>{m.title}</strong> {isAlert&&<span style={{fontSize:11,background:"#fde68a",color:"#92400e",padding:"1px 6px",borderRadius:99,marginLeft:4}}>SOON</span>}</td>
                    <td>{m.date} {m.time&&<span style={{color:"#64748b"}}>@ {m.time}</span>}</td>
                    <td style={{color:"#64748b"}}>{m.venue||"—"}</td>
                    <td><span style={{fontSize:12,background:(!m.group_id||m.group_id===0)?"#fef3c7":"#eff6ff",color:(!m.group_id||m.group_id===0)?"#92400e":"#1e40af",padding:"2px 8px",borderRadius:99,fontWeight:600}}>{getGroupName(m.group_id)}</span></td>
                    <td style={{color:"#64748b",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.agenda||"—"}</td>
                    <td><span className={`badge ${isPast?"active":"new"}`}>{isPast?"Done":"Upcoming"}</span></td>
                    <td><button className="btn-sm danger" onClick={()=>setDeleteId(m.id)}>🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="ml-overlay">
          <div className="ml-modal ml-confirm">
            <div className="ml-confirm-icon">🗑️</div>
            <h3>Delete this meeting?</h3>
            <p>This will remove it from all dashboards.</p>
            <div className="ml-confirm-btns">
              <button className="ml-btn-cancel" onClick={()=>setDeleteId(null)}>Cancel</button>
              <button className="ml-btn-delete" onClick={()=>handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}