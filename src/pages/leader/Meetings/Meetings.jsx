import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./Meetings.css";


const getToken  = () => localStorage.getItem("bachatgat_token") || "";
const getUser   = () => { try { return JSON.parse(localStorage.getItem("bachatgat_user")||"{}"); } catch { return {}; } };
const getGroupId= () => { const u=getUser(); return u.group_id||u.groupId||null; };

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form,     setForm]     = useState({ title:"", agenda:"", date:"", time:"", venue:"" });
  const [errors,   setErrors]   = useState({});

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const hdrs = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  });

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const groupId = getGroupId();
      if (!groupId) {
        setMeetings([]);
        showToast("Your group is not assigned yet. Contact admin.", "error");
        return;
      }
      const res = await fetch(`${API}/meetings/group/${groupId}`, { headers: hdrs() });
      if (res.ok) setMeetings(await res.json());
      else showToast("Could not load meetings","error");
    } catch { showToast("Cannot connect to server","error"); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchMeetings(); }, []);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Meeting title is required";
    if (!form.date)         e.date  = "Date is required";
    return e;
  };

  const handleAdd = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const groupId = getGroupId();
      if (!groupId) {
        showToast("Your group is not assigned yet. Contact admin.", "error");
        return;
      }
      const payload = {
        group_id: groupId,
        title:    form.title.trim(),
        agenda:   form.agenda.trim() || null,
        date:     form.date,
        time:     form.time  || null,
        venue:    form.venue.trim() || null,
      };
      const res = await fetch(`${API}/meetings/`, {
        method:  "POST",
        headers: hdrs(),
        body:    JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Meeting scheduled and saved to database ✅");
        setForm({ title:"", agenda:"", date:"", time:"", venue:"" });
        setErrors({});
        setShowForm(false);
        fetchMeetings();
      } else {
        showToast(data.detail || "Failed to save meeting","error");
      }
    } catch { showToast("Cannot connect to server","error"); }
    finally   { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/meetings/${id}`, {
        method: "DELETE", headers: hdrs()
      });
      if (res.ok) { showToast("Meeting deleted"); setDeleteId(null); fetchMeetings(); }
      else showToast("Delete failed","error");
    } catch { showToast("Cannot connect","error"); }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = meetings.filter(m=>m.date>=today).length;
  const done     = meetings.filter(m=>m.date<today).length;

  return (
    <div className="page-container">
      {toast && (
        <div className={`ml-toast ml-toast-${toast.type}`}>
          {toast.type==="success"?"✓":"✕"} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="ml-breadcrumb">Home <span>/</span> <span className="ml-bc-active">Meetings</span></div>
          <h1>Meetings</h1>
          <p className="page-sub">Schedule and manage meetings — saved to database ✓</p>
        </div>
        <button className="btn-primary" onClick={()=>{setShowForm(!showForm);setErrors({});}}>
          {showForm ? "✕ Cancel" : "+ Schedule Meeting"}
        </button>
      </div>

      {/* Stats strip */}
      <div className="meeting-strip">
        {[
          { label:"Total",    val:meetings.length, color:"#3b82f6" },
          { label:"Upcoming", val:upcoming,         color:"#8b5cf6" },
          { label:"Done",     val:done,             color:"#10b981" },
        ].map((s,i)=>(
          <div key={i} className="meeting-strip-item" style={{"--c":s.color}}>
            <span className="meeting-strip-val"   style={{color:s.color}}>{s.val}</span>
            <span className="meeting-strip-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="meeting-form-card">
          <h3>📅 Schedule New Meeting</h3>
          <form onSubmit={handleAdd} className="meeting-form-grid">
            <div className={`ml-field ${errors.title?"ml-field-err":""}`} style={{gridColumn:"1/-1"}}>
              <label>Meeting Title *</label>
              <input placeholder="e.g. Monthly Collection Meeting" value={form.title} autoFocus
                onChange={e=>{setForm({...form,title:e.target.value});setErrors({...errors,title:""});}} />
              {errors.title && <span className="ml-err-msg">{errors.title}</span>}
            </div>
            <div className={`ml-field ${errors.date?"ml-field-err":""}`}>
              <label>Date *</label>
              <input type="date" value={form.date}
                onChange={e=>{setForm({...form,date:e.target.value});setErrors({...errors,date:""}); }} />
              {errors.date && <span className="ml-err-msg">{errors.date}</span>}
            </div>
            <div className="ml-field">
              <label>Time</label>
              <input type="time" value={form.time}
                onChange={e=>setForm({...form,time:e.target.value})} />
            </div>
            <div className="ml-field" style={{gridColumn:"1/-1"}}>
              <label>Venue</label>
              <input placeholder="e.g. Community Hall, Gram Panchayat" value={form.venue}
                onChange={e=>setForm({...form,venue:e.target.value})} />
            </div>
            <div className="ml-field" style={{gridColumn:"1/-1"}}>
              <label>Agenda / Notes</label>
              <textarea placeholder="What will be discussed..." rows={3} value={form.agenda}
                onChange={e=>setForm({...form,agenda:e.target.value})}
                style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1.5px solid #e2e8f0",
                  resize:"vertical",fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}} />
            </div>
            <div style={{gridColumn:"1/-1",display:"flex",gap:12}}>
              <button type="button" className="ml-btn-cancel" onClick={()=>setShowForm(false)}>Cancel</button>
              <button type="submit" className="ml-btn-save" disabled={saving}>
                {saving ? "Saving to DB…" : "Save Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meeting cards */}
      {loading ? (
        <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading from database…</div>
      ) : meetings.length === 0 ? (
        <div className="meeting-empty">
          <div style={{fontSize:48}}>📅</div>
          <h3>No meetings scheduled yet</h3>
          <p>Click "+ Schedule Meeting" to add your first meeting</p>
        </div>
      ) : (
        <div className="meetings-list">
          {meetings.map(m=>{
            const isPast = m.date < today;
            return (
              <div key={m.id} className={`meeting-card ${isPast?"meeting-past":"meeting-upcoming"}`}>
                <div className="meeting-card-left">
                  <div style={{fontSize:28}}>{isPast?"✅":"📅"}</div>
                </div>
                <div className="meeting-card-body">
                  <div className="meeting-card-title">{m.title}</div>
                  <div className="meeting-card-meta">
                    <span>🗓 {m.date}</span>
                    {m.time  && <span>⏰ {m.time}</span>}
                    {m.venue && <span>📍 {m.venue}</span>}
                    {m.attendance!=null && <span>👥 {m.attendance} attended</span>}
                  </div>
                  {m.agenda && <div className="meeting-card-agenda">{m.agenda}</div>}
                </div>
                <div className="meeting-card-right">
                  <span className={`badge ${isPast?"active":"new"}`}>{isPast?"Done":"Upcoming"}</span>
                  <button className="ml-btn-icon ml-btn-del" style={{marginTop:8}}
                    onClick={()=>setDeleteId(m.id)} title="Delete">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteId && (
        <div className="ml-overlay">
          <div className="ml-modal ml-confirm">
            <div className="ml-confirm-icon">🗑️</div>
            <h3>Delete this meeting?</h3>
            <p>This cannot be undone.</p>
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