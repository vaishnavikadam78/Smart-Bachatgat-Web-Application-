import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./ManageGroups.css";

const token = () => localStorage.getItem("bachatgat_token");

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function ManageGroups() {
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [modalMode,  setModalMode]  = useState("add");   // "add" | "edit"
  const [editGroup,  setEditGroup]  = useState(null);
  const [deleteId,   setDeleteId]   = useState(null);
  const [toast,      setToast]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ name: "", location: "", meeting_day: "" });
  const [errors,     setErrors]     = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/groups/`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) setGroups(await res.json());
      else showToast("Failed to load groups", "error");
    } catch { showToast("Cannot connect to server. Is backend running?", "error"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, []);

  const openAdd = () => {
    setModalMode("add");
    setEditGroup(null);
    setForm({ name: "", location: "", meeting_day: "" });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (g) => {
    setModalMode("edit");
    setEditGroup(g);
    setForm({ name: g.name, location: g.location || "", meeting_day: g.meeting_day || "" });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setErrors({ name: "Group name is required" }); return; }
    setSaving(true);
    try {
      const isEdit = modalMode === "edit";
      const url    = isEdit ? `${API}/groups/${editGroup.id}` : `${API}/groups/`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          name:        form.name,
          location:    form.location    || null,
          meeting_day: form.meeting_day || null,
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isEdit ? `"${form.name}" updated!` : `"${form.name}" added to database ✅`);
        setShowModal(false);
        fetchGroups();
      } else {
        showToast(data.detail || "Save failed", "error");
      }
    } catch { showToast("Cannot connect to server", "error"); }
    finally  { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/groups/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) { showToast("Group deactivated"); setDeleteId(null); fetchGroups(); }
      else showToast("Delete failed", "error");
    } catch { showToast("Cannot connect to server", "error"); }
  };

  const exportCSV = () => {
    if (groups.length === 0) { showToast("No groups to export", "error"); return; }
    const headers = ["Group ID","Name","Location","Meeting Day","Members","Savings","Status"];
    const rows    = groups.map(g => [
      g.group_id, g.name, g.location||"-", g.meeting_day||"-",
      `${g.member_count||0}/${g.max_members||10}`, g.total_savings||0, g.status
    ]);
    const csv  = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "groups_report.csv";
    a.click();
    showToast("CSV downloaded!");
  };

  const filtered = groups.filter(g =>
    (g.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (g.location||"").toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers  = groups.reduce((s,g) => s + (g.member_count||0), 0);
  const totalSavings  = groups.reduce((s,g) => s + (g.total_savings||0), 0);
  const activeGroups  = groups.filter(g => g.status === "Active").length;

  return (
    <div className="page-container">
      {toast && (
        <div className={`ml-toast ml-toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="ml-breadcrumb">Home <span>/</span> <span className="ml-bc-active">Manage Groups</span></div>
          <h1>Manage Groups</h1>
          <p className="page-sub">All data saved to database — persists on refresh ✓</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-outline" onClick={exportCSV}>↓ Export CSV</button>
          <button className="btn-outline" onClick={fetchGroups}>↻ Refresh</button>
          <button className="btn-primary" onClick={openAdd}>+ Add Group</button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mg-strip">
        {[
          { label:"Total Groups",  val: groups.length,  color:"#3b82f6", icon:"🏘️" },
          { label:"Active",        val: activeGroups,   color:"#10b981", icon:"✅" },
          { label:"Total Members", val: totalMembers,   color:"#8b5cf6", icon:"👥" },
          { label:"Total Savings", val: `₹${(totalSavings/1000).toFixed(1)}K`, color:"#f59e0b", icon:"💰" },
        ].map((s,i) => (
          <div key={i} className="mg-strip-item" style={{"--c":s.color}}>
            <span className="mg-strip-icon">{s.icon}</span>
            <span className="mg-strip-val"  style={{color:s.color}}>{s.val}</span>
            <span className="mg-strip-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="ml-toolbar" style={{marginBottom:20}}>
        <div className="ml-search-box">
          <span>🔍</span>
          <input placeholder="Search by name or location…" value={search}
            onChange={e => setSearch(e.target.value)} />
          {search && <button className="ml-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <span className="ml-result-count">{filtered.length} groups</span>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading from database…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Group ID</th><th>Name</th><th>Leader</th><th>Location</th>
                <th>Meeting Day</th><th>Members</th><th>Savings</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9" style={{textAlign:"center",padding:48,color:"#94a3b8"}}>
                  No groups yet — click "+ Add Group" to create one
                </td></tr>
              ) : filtered.map(g => (
                <tr key={g.id}>
                  <td><code style={{background:"#f1f5f9",padding:"2px 8px",borderRadius:6}}>{g.group_id}</code></td>
                  <td><strong>{g.name}</strong></td>
                  <td style={{color:"#64748b"}}>{g.leader_name||"—"}</td>
                  <td>{g.location||"—"}</td>
                  <td>{g.meeting_day||"—"}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{background:"#e2e8f0",borderRadius:99,height:8,width:60,overflow:"hidden"}}>
                        <div style={{
                          height:"100%",
                          width:`${((g.member_count||0)/(g.max_members||10))*100}%`,
                          background: (g.member_count||0) >= (g.max_members||10) ? "#ef4444" : "#3b82f6",
                          borderRadius:99,transition:"width .3s"
                        }}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:600}}>
                        {g.member_count||0}/{g.max_members||10}
                      </span>
                      {(g.member_count||0) >= (g.max_members||10) && (
                        <span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>FULL</span>
                      )}
                    </div>
                  </td>
                  <td>₹{(g.total_savings||0).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${(g.status||"Active").toLowerCase()}`}>{g.status||"Active"}</span>
                  </td>
                  <td>
                    <button className="btn-sm" onClick={() => openEdit(g)}>✏️ Edit</button>
                    <button className="btn-sm danger" onClick={() => setDeleteId(g.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="ml-overlay" onClick={e => e.target.classList.contains("ml-overlay") && setShowModal(false)}>
          <div className="ml-modal">
            <div className="ml-modal-head">
              <h3>{modalMode === "add" ? "➕ Add New Group" : "✏️ Edit Group"}</h3>
              <button className="ml-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="ml-modal-body">
              <div className="ml-form-grid">
                <div className={`ml-field ${errors.name ? "ml-field-err" : ""}`} style={{gridColumn:"1/-1"}}>
                  <label>Group Name *</label>
                  <input value={form.name} placeholder="e.g. Sahyadri Bachatgat"
                    onChange={e => { setForm({...form, name:e.target.value}); setErrors({}); }}
                    autoFocus />
                  {errors.name && <span className="ml-err-msg">{errors.name}</span>}
                </div>
                <div className="ml-field">
                  <label>Location / Taluka</label>
                  <input value={form.location} placeholder="e.g. Sangli, Maharashtra"
                    onChange={e => setForm({...form, location:e.target.value})} />
                </div>
                <div className="ml-field">
                  <label>Meeting Day</label>
                  <select value={form.meeting_day} onChange={e => setForm({...form, meeting_day:e.target.value})}>
                    <option value="">Select day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <p style={{fontSize:12,color:"#94a3b8",marginTop:12}}>
                💡 Group ID is auto-generated. Max <strong>10 members</strong> per group.
              </p>
            </div>
            <div className="ml-modal-foot">
              <button className="ml-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ml-btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving to DB…" : modalMode === "add" ? "Create Group" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="ml-overlay">
          <div className="ml-modal ml-confirm">
            <div className="ml-confirm-icon">🗑️</div>
            <h3>Deactivate this group?</h3>
            <p>Group will be marked Inactive in the database.</p>
            <div className="ml-confirm-btns">
              <button className="ml-btn-cancel" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="ml-btn-delete" onClick={() => handleDelete(deleteId)}>Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}