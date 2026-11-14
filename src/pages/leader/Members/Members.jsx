import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./Members.css";

const MAX_MEMBERS = 10;

const Members = () => {
  const [members,  setMembers]  = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name:"", phone:"", email:"", occupation:"", address:"" });
  const [errors,   setErrors]   = useState({});
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("All");
  const [toast,    setToast]    = useState(null);
  const [createdMember, setCreatedMember] = useState(null);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const token    = () => localStorage.getItem("bachatgat_token");
  const getUser  = () => { try { return JSON.parse(localStorage.getItem("bachatgat_user")||"{}"); } catch { return {}; } };
  const headers  = () => ({ "Content-Type":"application/json", "Authorization":`Bearer ${token()}` });

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const u       = getUser();
      const groupId = u.group_id || null;
      if (!groupId) {
        setMembers([]);
        showToast("Your group is not assigned yet. Contact admin.", "error");
        return;
      }
      console.log("Fetching members for group:", groupId, "with token:", token() ? "✓" : "✗");
      const res     = await fetch(`${API}/members/group/${groupId}`, { headers: headers() });
      console.log("Members response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Members fetched successfully:", data.length);
        setMembers(data);
      }
      else {
        const errData = await res.json().catch(() => ({}));
        console.error("Could not load members:", res.status, errData);
        showToast("Could not load members: " + (errData.detail || res.statusText), "error");
      }
    } catch (err) { 
      console.error("Fetch error:", err.message);
      showToast("Cannot connect to server: " + err.message, "error"); 
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMembers();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchMembers, 5000);
    return () => clearInterval(interval);
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Enter valid 10-digit number";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter valid email address";
    return e;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (members.length >= MAX_MEMBERS) {
      showToast(`Maximum ${MAX_MEMBERS} members per group reached!`, "error");
      return;
    }
    setSaving(true);
    try {
      const u = getUser();
      const groupId = u.group_id || null;
      if (!groupId) {
        showToast("Your group is not assigned yet. Contact admin.", "error");
        return;
      }
      console.log("Adding member with group_id:", groupId);
      
      const res = await fetch(`${API}/members/`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name:       form.name.trim(),
          phone:      form.phone.trim(),
          email:      form.email      || null,
          occupation: form.occupation || null,
          address:    form.address    || null,
          group_id:   groupId,
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${form.name} added successfully!`);
        setCreatedMember({
          name: form.name.trim(),
          username: data.username,
          password: data.password,
          member_id: data.member_id,
          email: data.email,
          requires_email_verification: data.requires_email_verification,
          verification_link: data.verification_link,
          verification_token: data.verification_token,
          verification_otp: data.verification_otp,
        });
        setForm({ name:"", phone:"", email:"", occupation:"", address:"" });
        setErrors({});
        setShowForm(false);
        // Immediate refresh instead of waiting for interval
        await fetchMembers();
      } else {
        console.error("API error:", res.status, data);
        showToast(data.detail || `Error: ${res.status}`, "error");
      }
    } catch (err) { 
      console.error("Member add error:", err);
      showToast(`Cannot connect to server: ${err.message}`, "error"); 
    }
    finally { setSaving(false); }
  };

  const handleRemove = async (id) => {
    const m = members.find(x => x.id === id);
    try {
      const res = await fetch(`${API}/members/${id}`, { method:"DELETE", headers:headers() });
      if (res.ok) {
        showToast(`${m?.name} removed`, "error");
        setDeleteId(null);
        fetchMembers();
      } else showToast("Remove failed","error");
    } catch { showToast("Cannot connect","error"); }
  };

  const exportCSV = () => {
    const h = ["Name","Phone","Email","Occupation","Savings","Join Date","Status"];
    const rows = members.map(m => [m.name,m.phone,m.email||"-",m.occupation||"-",m.total_savings||0,m.join_date,m.status]);
    const csv  = [h,...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "members.csv";
    a.click();
    showToast("CSV downloaded!");
  };

  const verifyMemberOtp = async () => {
    if (!createdMember?.email || !verifyOtp.trim()) {
      showToast("Enter 4-digit OTP first", "error");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch(`${API}/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: createdMember.email, otp: verifyOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.detail || "OTP verification failed", "error");
        return;
      }
      showToast("Email verified successfully");
    } catch (err) {
      showToast(`Cannot connect to server: ${err.message}`, "error");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (m.name.toLowerCase().includes(q) || (m.phone||"").includes(q)) &&
           (filter === "All" || m.status === filter);
  });

  const activeCount  = members.filter(m => m.status === "Active").length;
  const totalSavings = members.reduce((s,m) => s+(m.total_savings||0),0);
  const slotsLeft    = MAX_MEMBERS - activeCount;

  return (
    <div className="members-page">
      {toast && (
        <div className={`members-toast members-toast-${toast.type}`}>
          {toast.type==="success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="members-breadcrumb">Home <span>/</span> Members</div>
          <h2>Members</h2>
          <p>Group members — max {MAX_MEMBERS} per group &nbsp;
            <span style={{
              background: slotsLeft>0?"#dcfce7":"#fee2e2",
              color:      slotsLeft>0?"#16a34a":"#dc2626",
              padding:"2px 10px",borderRadius:99,fontSize:12,fontWeight:700
            }}>
              {slotsLeft > 0 ? `${slotsLeft} slots left` : "GROUP FULL"}
            </span>
          </p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-outline" onClick={exportCSV}>↓ Export</button>
          <button className="btn btn-primary"
            onClick={() => { if(slotsLeft<=0){showToast(`Maximum ${MAX_MEMBERS} members reached!`,"error");return;} setShowForm(!showForm); setErrors({}); }}
            style={{opacity: slotsLeft<=0 ? 0.5 : 1}}>
            {showForm ? "✕ Cancel" : "+ Add Member"}
          </button>
        </div>
      </div>

      {/* Member limit bar */}
      <div style={{background:"white",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <span style={{fontSize:13,color:"#64748b",fontWeight:600,minWidth:100}}>Group capacity</span>
        <div style={{flex:1,background:"#e2e8f0",borderRadius:99,height:10,overflow:"hidden"}}>
          <div style={{
            height:"100%",
            width:`${(activeCount/MAX_MEMBERS)*100}%`,
            background: activeCount>=MAX_MEMBERS?"#ef4444":activeCount>=8?"#f59e0b":"#3b82f6",
            borderRadius:99,transition:"width .4s"
          }}/>
        </div>
        <span style={{fontSize:14,fontWeight:700,minWidth:60,textAlign:"right",
          color: activeCount>=MAX_MEMBERS?"#ef4444":"#0f172a"}}>
          {activeCount} / {MAX_MEMBERS}
        </span>
      </div>

      {/* Summary strip */}
      <div className="members-strip">
        {[
          { label:"Total",         val:members.length,                         color:"#3b82f6" },
          { label:"Active",        val:activeCount,                             color:"#10b981" },
          { label:"Inactive",      val:members.length-activeCount,              color:"#f59e0b" },
          { label:"Total Savings", val:`₹${(totalSavings/1000).toFixed(1)}K`,  color:"#8b5cf6" },
        ].map((s,i) => (
          <div key={i} className="members-strip-item" style={{"--c":s.color}}>
            <span className="members-strip-val" style={{color:s.color}}>{s.val}</span>
            <span className="members-strip-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card members-add-card">
          <h3>Add New Member</h3>
          <form onSubmit={handleAdd} className="member-form">
            <div className={`ml-field ${errors.name?"ml-field-err":""}`}>
              <label>Full Name *</label>
              <input placeholder="e.g. Sunita Kadam" value={form.name}
                onChange={e=>{setForm({...form,name:e.target.value});setErrors({...errors,name:""});}} autoFocus />
              {errors.name && <span className="ml-err-msg">{errors.name}</span>}
            </div>
            <div className={`ml-field ${errors.phone?"ml-field-err":""}`}>
              <label>Phone Number *</label>
              <input placeholder="10-digit mobile" value={form.phone} maxLength={10} inputMode="numeric"
                onChange={e=>{setForm({...form,phone:e.target.value});setErrors({...errors,phone:""});}} />
              {errors.phone && <span className="ml-err-msg">{errors.phone}</span>}
            </div>
            <div className="ml-field">
              <label>Email *</label>
              <input type="email" placeholder="optional" value={form.email}
                onChange={e=>{setForm({...form,email:e.target.value});setErrors({...errors,email:""});}} />
              {errors.email && <span className="ml-err-msg">{errors.email}</span>}
            </div>
            <div className="ml-field">
              <label>Occupation</label>
              <select value={form.occupation} onChange={e=>setForm({...form,occupation:e.target.value})}>
                <option value="">Select…</option>
                {["Farmer","Shopkeeper","Homemaker","Teacher","Tailor","Daily Wage Worker","Self Employed","Other"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="ml-field" style={{gridColumn:"1/-1"}}>
              <label>Address</label>
              <input placeholder="Village / Taluka" value={form.address}
                onChange={e=>setForm({...form,address:e.target.value})} />
            </div>
            <div style={{gridColumn:"1/-1",display:"flex",gap:12}}>
              <button type="button" className="ml-btn-cancel" onClick={()=>setShowForm(false)}>Cancel</button>
              <button type="submit" className="ml-btn-save" disabled={saving}>
                {saving ? "Saving to DB…" : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {createdMember && (
        <div className="card members-success-card" style={{marginBottom:20,border:"1px solid #10b981",background:"#ecfdf5",padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div>
              <h3 style={{margin:0,color:"#065f46"}}>Member Created Successfully</h3>
              <p style={{margin:"6px 0 0",color:"#115e59"}}>Use these credentials to share with the new member.</p>
            </div>
            <button type="button" className="ml-btn-cancel" style={{background:"#ffffff",color:"#065f46"}} onClick={()=>setCreatedMember(null)}>Dismiss</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16,marginTop:16}}>
            <div style={{padding:16,background:"white",borderRadius:12,boxShadow:"0 1px 2px rgba(15,23,42,0.06)"}}>
              <div style={{fontSize:12,textTransform:"uppercase",color:"#10b981",fontWeight:700,marginBottom:8}}>Member ID</div>
              <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>{createdMember.member_id}</div>
            </div>
            <div style={{padding:16,background:"white",borderRadius:12,boxShadow:"0 1px 2px rgba(15,23,42,0.06)"}}>
              <div style={{fontSize:12,textTransform:"uppercase",color:"#3b82f6",fontWeight:700,marginBottom:8}}>Username</div>
              <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>{createdMember.username}</div>
            </div>
            <div style={{padding:16,background:"white",borderRadius:12,boxShadow:"0 1px 2px rgba(15,23,42,0.06)"}}>
              <div style={{fontSize:12,textTransform:"uppercase",color:"#f59e0b",fontWeight:700,marginBottom:8}}>Password</div>
              <div style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>{createdMember.password}</div>
            </div>
          </div>
          
          {/* Email Verification Box */}
          {createdMember.requires_email_verification && (
            <div style={{marginTop:16,padding:16,background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:12,textAlign:"left"}}>
              <p style={{margin:"0 0 10px",fontWeight:700,color:"#92400e",fontSize:14}}>📧 Email Verification Required</p>
              <p style={{margin:"0 0 12px",fontSize:13,color:"#b45309"}}>
                A verification link has been sent to <strong>{createdMember.email}</strong>
              </p>
              <p style={{margin:"0 0 10px",fontSize:13,color:"#92400e"}}>
                4-digit code: <strong style={{letterSpacing:"3px"}}>{createdMember.verification_otp || "Check email inbox"}</strong>
              </p>
              <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                <input
                  type="text"
                  maxLength={4}
                  value={verifyOtp}
                  onChange={(e)=>setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter OTP"
                  style={{padding:"8px 10px",borderRadius:"6px",border:"1px solid #fcd34d",width:"120px"}}
                />
                <button
                  type="button"
                  onClick={verifyMemberOtp}
                  disabled={verifyingOtp}
                  style={{background:"#92400e",color:"white",border:"none",borderRadius:"6px",padding:"8px 12px",cursor:"pointer"}}
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
              {createdMember.verification_link && (
                <a 
                  href={createdMember.verification_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:"inline-block",
                    background:"#f59e0b",
                    color:"white",
                    padding:"8px 14px",
                    borderRadius:"6px",
                    textDecoration:"none",
                    fontSize:"13px",
                    fontWeight:"600",
                    marginRight:"8px"
                  }}
                >
                  Verify Email Now →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="members-toolbar">
        <div className="members-search">
          <span>🔍</span>
          <input placeholder="Search by name or phone…" value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <button onClick={()=>setSearch("")}>✕</button>}
        </div>
        <div className="members-filters">
          {["All","Active","Inactive"].map(f=>(
            <button key={f} className={`members-filter-btn ${filter===f?"members-filter-active":""}`}
              onClick={()=>setFilter(f)}>{f}</button>
          ))}
        </div>
        <span className="members-count">{filtered.length} members</span>
      </div>

      {/* Table */}
      <div className="card members-table-card">
        {loading ? (
          <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading from database…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Member</th><th>Phone</th><th>Savings</th><th>Join Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="members-empty">No members found</td></tr>
              ) : filtered.map((m,i) => (
                <tr key={m.id}>
                  <td className="members-td-num">{i+1}</td>
                  <td>
                    <div className="members-td-person">
                      <div className="members-avatar">{m.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</div>
                      <div>
                        <div className="members-person-name">{m.name}</div>
                        <div className="members-person-joined" style={{fontSize:11,color:"#94a3b8"}}>
                          ID: {m.member_id} {m.occupation ? `· ${m.occupation}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="members-td-phone">{m.phone}</td>
                  <td><span className="members-savings-tag">₹{(m.total_savings||0).toLocaleString("en-IN")}</span></td>
                  <td className="members-td-date">{m.join_date||"—"}</td>
                  <td><span className={`badge ${m.status==="Active"?"badge-success":"badge-danger"}`}>{m.status}</span></td>
                  <td><button className="members-remove-btn" onClick={()=>setDeleteId(m.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteId && (
        <div className="members-overlay">
          <div className="members-confirm">
            <h3>Remove Member?</h3>
            <p>Member will be marked inactive in the database.</p>
            <div className="members-confirm-btns">
              <button className="members-btn-cancel" onClick={()=>setDeleteId(null)}>Cancel</button>
              <button className="members-btn-delete" onClick={()=>handleRemove(deleteId)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;