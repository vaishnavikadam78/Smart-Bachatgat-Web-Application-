import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../../services/api";
import "./MyLoans.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

// Calculate fine and overdue days for a loan
const calculateLoanStatus = (loan) => {
  if (!loan.due_date) return { daysOverdue: 0, fineAmount: 0, status: "No Due Date" };
  
  const today = new Date();
  const dueDate = new Date(loan.due_date + "T00:00:00");
  const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
  
  if (daysOverdue === 0) return { daysOverdue: 0, fineAmount: 0, status: "On Time" };
  
  // Fine calculation: ₹0.50 per day, capped at 20% of loan amount
  const dailyRate = 0.5;
  const maxFine = (loan.amount * 20) / 100;
  const fineAmount = Math.min(daysOverdue * dailyRate, maxFine);
  
  return { daysOverdue, fineAmount, status: "Calculated" };
};

export default function MyLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [formData, setFormData] = useState({ amount: "", purpose: "", tenure_months: 6, documents: "", notes: "" });
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(false);
  const nav = useNavigate();

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/loans/my-loans`, { headers: hdrs() });
      if (!res.ok) throw new Error("Failed to load loans");
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("Unable to load loans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLoans(); }, []);

  const handleApply = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.purpose) {
      showToast("Please fill required fields", "error");
      return;
    }

    setApplying(true);

    try {
      const res = await fetch(`${API}/loans/apply`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          purpose: formData.purpose,
          tenure_months: Number(formData.tenure_months),
          documents: formData.documents,
          notes: formData.notes
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Loan applied successfully");
        setShowApply(false);
        setFormData({ amount: "", purpose: "", tenure_months: 6, documents: "", notes: "" });
        loadLoans();
      } else {
        showToast(data.detail || "Application failed", "error");
      }
    } catch (e) {
      showToast("Server error", "error");
    } finally {
      setApplying(false);
    }
  };

  const activeLoan = loans.find(l => l.status === "Active" || l.status === "Pending");

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1>My Loans</h1>
          <p className="page-sub">Your loan applications and repayment progress</p>
        </div>
        <button className="btn-primary" onClick={() => setShowApply(!showApply)}>
          {showApply ? "Close Application" : "Apply for Loan"}
        </button>
      </div>

      {showApply && (
        <div className="loan-form card">
          <div className="form-row">
            <label>Amount (₹)</label>
            <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="Enter required amount" />
          </div>
          <div className="form-row">
            <label>Purpose</label>
            <input type="text" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} placeholder="Loan purpose" />
          </div>
          <div className="form-row">
            <label>Tenure (months)</label>
            <input type="number" min="1" value={formData.tenure_months} onChange={e => setFormData({ ...formData, tenure_months: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Supporting Documents</label>
            <input type="text" value={formData.documents} onChange={e => setFormData({ ...formData, documents: e.target.value })} placeholder="Upload link or description" />
          </div>
          <div className="form-row">
            <label>Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional comments" />
          </div>
          <button className="btn-primary" disabled={applying} onClick={handleApply}>
            {applying ? "Submitting…" : "Submit Loan Application"}
          </button>
        </div>
      )}

      <div className="loan-list">
        {loading ? (
          <div className="empty-state"><p>Loading loans…</p></div>
        ) : loans.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 48 }}>🎉</p>
            <h3>No Loans Found</h3>
            <p>Apply for a new loan to start your journey.</p>
            <button className="btn-primary" onClick={() => setShowApply(true)}>Apply now</button>
          </div>
        ) : (
          loans.map((loan) => {
            const { daysOverdue, fineAmount } = calculateLoanStatus(loan);
            const totalDue = (loan.balance || 0) + fineAmount;
            
            return (
              <div key={loan.loan_id || loan.id} className="loan-card">
                <div className="loan-header">
                  <div>
                    <h2>Loan #{loan.loan_id || loan.id}</h2>
                    <p>
                      Applied: {loan.created_at?.split("T")[0] || loan.date || "—"} • Status: {loan.status}
                      {loan.due_date && (
                        <> • Due: {loan.due_date.split("T")[0]}</>
                      )}
                    </p>
                    {daysOverdue > 0 && (
                      <p style={{ color: "#dc2626", marginTop: "8px", fontWeight: "bold" }}>
                        ⚠️ OVERDUE: {daysOverdue} days • Fine: ₹{fineAmount.toFixed(2)} • Total Due: ₹{totalDue.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${loan.status?.toLowerCase()}`}>{loan.status}</span>
                  {daysOverdue > 0 && (
                    <span style={{ marginLeft: "8px" }} className="badge" style={{ backgroundColor: "#dc2626", color: "white" }}>OVERDUE</span>
                  )}
                </div>
                <div className="loan-stats">
                  <div className="loan-stat">
                    <p>Amount</p>
                    <h3>₹{(loan.amount || 0).toLocaleString()}</h3>
                  </div>
                  <div className="loan-stat">
                    <p>Paid</p>
                    <h3 style={{ color: "var(--success)" }}>₹{(loan.amount_paid || 0).toLocaleString()}</h3>
                  </div>
                  <div className="loan-stat">
                    <p>Balance</p>
                    <h3 style={{ color: "var(--danger)" }}>₹{(loan.balance || 0).toLocaleString()}</h3>
                  </div>
                </div>
                {daysOverdue > 0 && (
                  <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "6px",
                    padding: "12px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: "#7f1d1d" }}>Fine Amount (₹0.50/day):</span>
                      <span style={{ fontWeight: "600", color: "#dc2626" }}>₹{fineAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginTop: "8px" }}>
                      <span style={{ color: "#7f1d1d" }}>Total Amount Due (incl. fine):</span>
                      <span style={{ fontWeight: "600", color: "#991b1b" }}>₹{totalDue.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="progress-bar-wrap">
                  <div className="progress-meta">
                    <span>Repayment Progress</span>
                    <span>{loan.amount ? `${Math.round(((loan.amount_paid || 0) / loan.amount) * 100)}%` : "0%"}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${loan.amount ? Math.min(((loan.amount_paid || 0) / loan.amount) * 100, 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
