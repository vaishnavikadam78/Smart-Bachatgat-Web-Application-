import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./Transactions.css";


// Robust user/token helpers
const getToken  = () => localStorage.getItem("bachatgat_token") || "";
const getUser   = () => {
  try {
    return JSON.parse(localStorage.getItem("bachatgat_user") || "{}");
  } catch { return {}; }
};
const getGroupId = () => {
  const u = getUser();
  return u.group_id || u.groupId || 1;
};

const Transactions = () => {
  const [txns,         setTxns]         = useState([]);
  const [members,      setMembers]      = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [verifyPending,setVerifyPending]= useState(null);
  const [toast,        setToast]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [form,         setForm]         = useState({ member_id:"", type:"Savings", amount:"", description:"" });
  const [errors,       setErrors]       = useState({});

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const hdrs = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  });

  const fetchData = async () => {
    setLoading(true);
    const groupId = getGroupId();
    try {
      const [depRes, payRes, memRes] = await Promise.all([
        fetch(`${API}/deposits/group/${groupId}`, { headers: hdrs() }),
        fetch(`${API}/payments/group/${groupId}`, { headers: hdrs() }),
        fetch(`${API}/members/group/${groupId}`,  { headers: hdrs() }),
      ]);

      const deposits = depRes.ok ? await depRes.json() : [];
      const payments = payRes.ok ? await payRes.json() : [];

      if (memRes.ok) {
        const mData = await memRes.json();
        setMembers(mData);
      } else {
        const allRes = await fetch(`${API}/members/all`, { headers: hdrs() });
        if (allRes.ok) setMembers(await allRes.json());
      }

      setTxns([
        ...deposits.map(d => ({
          id: `dep-${d.id}`,
          source: "deposit",
          date: d.date || d.created_at?.split("T")[0] || "—",
          member_id: d.member_id,
          amount: d.amount,
          description: d.description || "Savings",
          status: "Success",
        })),
        ...payments.map(p => ({
          id: `pay-${p.id}`,
          source: "payment",
          date: p.created_at?.split("T")[0] || p.date || "—",
          member_id: p.member_id,
          amount: p.amount,
          description: p.payment_type ? `${p.payment_type}${p.payment_mode?` (${p.payment_mode})`:""}` : p.purpose || "Payment",
          status: p.status || "Pending",
          payment_id: p.id,
        })),
      ].sort((a,b) => (b.date || "").localeCompare(a.date || "")));
    } catch {
      showToast("Cannot connect to server", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const validate = () => {
    const e = {};
    if (!form.member_id) e.member_id = "Select a member";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      e.amount = "Enter a valid amount greater than 0";
    return e;
  };

  const handleAdd = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/deposits/`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          member_id:   parseInt(form.member_id),
          group_id:    getGroupId(),
          amount:      parseFloat(form.amount),
          date:        new Date().toISOString().split("T")[0],
          description: form.description || form.type,
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Transaction saved to database ✅");
        setForm({ member_id:"", type:"Savings", amount:"", description:"" });
        setErrors({});
        setShowForm(false);
        fetchData();
      } else {
        showToast(data.detail || "Failed to save transaction", "error");
      }
    } catch { showToast("Cannot connect to server", "error"); }
    finally  { setSaving(false); }
  };

  const verifyPayment = async (paymentId) => {
    setVerifyPending(paymentId);
    try {
      const res = await fetch(`${API}/payments/${paymentId}/verify`, {
        method: "PATCH",
        headers: hdrs(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Payment verified and added to savings ✅");
        fetchData();
      } else {
        showToast(data.detail || "Verification failed", "error");
      }
    } catch {
      showToast("Cannot connect to server", "error");
    } finally {
      setVerifyPending(null);
    }
  };

  const exportCSV = () => {
    if (!txns.length) { showToast("No transactions to export","error"); return; }
    const h    = ["Date","Member","Amount","Description"];
    const rows = txns.map(t => [t.date, getMemberName(t.member_id), t.amount, t.description||"-"]);
    const csv  = [h,...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "transactions.csv";
    a.click();
    showToast("CSV downloaded!");
  };

  const getMemberName = (id) => {
    const m = members.find(m => m.id === id);
    return m ? m.name : `Member #${id}`;
  };

  const totalSavings   = txns.filter(t => t.source === "deposit").reduce((s,t)=>s+(t.amount||0),0);
  const totalPayments  = txns.filter(t => t.source === "payment").reduce((s,t)=>s+(t.amount||0),0);
  const totalPending   = txns.filter(t => t.source === "payment" && t.status === "Pending").length;
  const totalLoans     = txns.filter(t=>(t.description||"").toLowerCase().includes("loan")).reduce((s,t)=>s+(t.amount||0),0);
  const totalRepayment = txns.filter(t=>(t.description||"").toLowerCase().includes("repayment")).reduce((s,t)=>s+(t.amount||0),0);

  const filtered = txns.filter(t =>
    (t.description||"").toLowerCase().includes(search.toLowerCase()) ||
    getMemberName(t.member_id).toLowerCase().includes(search.toLowerCase()) ||
    t.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="transactions-page">
      {toast && (
        <div className={`ml-toast ml-toast-${toast.type}`}>
          {toast.type==="success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="txn-breadcrumb">Home <span>/</span> Transactions</div>
          <h2>Transactions</h2>
          <p>All saved to database — persists on refresh ✓</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn-outline" onClick={exportCSV}>↓ Export CSV</button>
          <button className="btn btn-primary" onClick={()=>{setShowForm(!showForm);setErrors({});}}>
            {showForm ? "✕ Cancel" : "+ Add Transaction"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="txn-summary">
        {[
          { label:"Total Savings",      val:totalSavings,  color:"#10b981", bg:"#f0fdf4", border:"#bbf7d0", icon:"↑" },
          { label:"Total Payments",     val:totalPayments, color:"#f59e0b", bg:"#fffbeb", border:"#fef3c7", icon:"💸" },
          { label:"Pending Payments",   val:totalPending,  color:"#f97316", bg:"#fff7ed", border:"#fed7aa", icon:"⌛" },
          { label:"Total Repayments",   val:totalRepayment, color:"#8b5cf6", bg:"#f5f3ff", border:"#ddd6fe", icon:"↩" },
        ].map((s,i)=>(
          <div key={i} className="txn-sum-card" style={{"--c":s.color,"--bg":s.bg,"--bd":s.border}}>
            <div className="txn-sum-top">
              <span className="txn-sum-label">{s.label}</span>
              <span className="txn-sum-icon" style={{color:s.color}}>{s.icon}</span>
            </div>
            <div className="txn-sum-val" style={{color:s.color}}>
              {s.label.includes("Pending") ? s.val : `₹${s.val.toLocaleString("en-IN")}`}
            </div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card txn-add-card">
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Record New Transaction</h3>
          <form onSubmit={handleAdd} className="txn-form">
            <div className={`txn-field ${errors.member_id?"txn-field-err":""}`}>
              <label>Member *</label>
              {members.length === 0 ? (
                <div style={{padding:"10px 12px",background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,fontSize:13,color:"#92400e"}}>
                  ⚠️ No members in this group yet. Add members first.
                </div>
              ) : (
                <select value={form.member_id}
                  onChange={e=>{setForm({...form,member_id:e.target.value});setErrors({...errors,member_id:""});}}>
                  <option value="">— Select member —</option>
                  {members.map(m=>(
                    <option key={m.id} value={m.id}>{m.name} ({m.phone||m.member_id})</option>
                  ))}
                </select>
              )}
              {errors.member_id && <span className="ml-err-msg">{errors.member_id}</span>}
            </div>

            <div className="txn-field">
              <label>Type</label>
              <select value={form.type}
                onChange={e=>setForm({...form,type:e.target.value,description:e.target.value})}>
                <option>Savings</option>
                <option>Loan</option>
                <option>Repayment</option>
              </select>
            </div>

            <div className={`txn-field ${errors.amount?"txn-field-err":""}`}>
              <label>Amount (₹) *</label>
              <input type="number" min="1" placeholder="e.g. 500" value={form.amount}
                onChange={e=>{setForm({...form,amount:e.target.value});setErrors({...errors,amount:""}); }} />
              {errors.amount && <span className="ml-err-msg">{errors.amount}</span>}
            </div>

            <div className="txn-field">
              <label>Note (optional)</label>
              <input placeholder="e.g. Monthly savings" value={form.description}
                onChange={e=>setForm({...form,description:e.target.value})} />
            </div>

            <div style={{display:"flex",gap:12,gridColumn:"1/-1"}}>
              <button type="button" className="ml-btn-cancel" onClick={()=>setShowForm(false)}>Cancel</button>
              <button type="submit" className="ml-btn-save" disabled={saving||members.length===0}>
                {saving ? "Saving to DB…" : "Save Transaction"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="ml-toolbar" style={{marginBottom:16}}>
        <div className="ml-search-box">
          <span>🔍</span>
          <input placeholder="Search transactions…" value={search}
            onChange={e=>setSearch(e.target.value)} />
          {search && <button className="ml-clear" onClick={()=>setSearch("")}>✕</button>}
        </div>
        <span className="ml-result-count">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="table-card">
        {loading ? (
          <div style={{padding:48,textAlign:"center",color:"#94a3b8"}}>Loading from database…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Member</th><th>Type</th><th>Amount</th><th>Status</th><th>Note</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign:"center",padding:40,color:"#94a3b8"}}>
                  No transactions yet — click "+ Add Transaction"
                </td></tr>
              ) : filtered.map((t,i)=>(
                <tr key={t.id||i}>
                  <td>{t.date}</td>
                  <td><strong>{getMemberName(t.member_id)}</strong></td>
                  <td>
                    <span className={`badge ${t.source === "deposit" ? "badge-success" : t.status === "Pending" ? "badge-warning" : "badge-info"}`}>
                      {t.source === "deposit" ? "Deposit" : "Payment"}
                    </span>
                  </td>
                  <td style={{color:t.source === "deposit" ? "#10b981" : "#2563eb",fontWeight:700}}>
                    ₹{(t.amount||0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`badge ${
                      t.status === "Success" ? "badge-success" :
                      t.status === "Pending" ? "badge-warning" : "badge-danger"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{color:"#64748b"}}>{t.description||"—"}</td>
                  <td>
                    {t.source === "payment" && t.status === "Pending" ? (
                      <button type="button" className="ml-btn-small" disabled={verifyPending===t.payment_id}
                        onClick={() => verifyPayment(t.payment_id)}>
                        {verifyPending===t.payment_id ? "Verifying…" : "Verify"}
                      </button>
                    ) : (
                      <span style={{color:"#94a3b8"}}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Transactions;