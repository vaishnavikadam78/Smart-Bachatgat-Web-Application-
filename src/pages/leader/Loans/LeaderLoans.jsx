import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./LeaderLoans.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const getUser = () => { try { return JSON.parse(localStorage.getItem("bachatgat_user")||"{}"); } catch { return {}; } };
const getGroupId = () => { const u = getUser(); return u.group_id || u.groupId || 1; };
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

const STATUS_BADGE = {
  Pending: { bg: "#fef3c7", text: "#92400e", emoji: "⏳" },
  Active: { bg: "#dcfce7", text: "#15803d", emoji: "✅" },
  Overdue: { bg: "#fee2e2", text: "#991b1b", emoji: "⚠️" },
  Default: { bg: "#fecaca", text: "#7f1d1d", emoji: "🔴" },
  "Severely Overdue": { bg: "#fecaca", text: "#7f1d1d", emoji: "🔴" },
  Closed: { bg: "#f3e8ff", text: "#6b21a8", emoji: "✓" },
  Rejected: { bg: "#fee2e2", text: "#991b1b", emoji: "❌" },
};

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

export default function LeaderLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionPending, setActionPending] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, active, closed

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLoans = async () => {
    setLoading(true);
    try {
      const gid = getGroupId();
      const res = await fetch(`${API}/loans/group/${gid}`, { headers: hdrs() });
      if (!res.ok) throw new Error("Failed to load loans");
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("Cannot load loans: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLoans(); }, []);

  const approveLoan = async (loanId) => {
    setActionPending(loanId);
    try {
      const res = await fetch(`${API}/loans/${loanId}/approve`, {
        method: "PATCH",
        headers: hdrs(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Loan approved successfully! ✅");
        loadLoans();
        setDetail(null);
      } else {
        showToast(data.detail || "Approval failed", "error");
      }
    } catch (e) {
      showToast("Server error: " + e.message, "error");
    } finally {
      setActionPending(null);
    }
  };

  const rejectLoan = async (loanId) => {
    if (!window.confirm("Are you sure you want to reject this loan?")) return;
    setActionPending(loanId);
    try {
      const res = await fetch(`${API}/loans/${loanId}/reject`, {
        method: "PATCH",
        headers: hdrs(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Loan rejected.");
        loadLoans();
        setDetail(null);
      } else {
        showToast(data.detail || "Rejection failed", "error");
      }
    } catch (e) {
      showToast("Server error: " + e.message, "error");
    } finally {
      setActionPending(null);
    }
  };

  const filteredLoans = loans.filter(l => {
    if (filter === "all") return true;
    return l.status.toLowerCase() === filter;
  });

  const pendingCount = loans.filter(l => l.status === "Pending").length;

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1>💰 Loan Management</h1>
          <p className="page-sub">Review and approve member loan applications</p>
        </div>
        {pendingCount > 0 && (
          <div style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 16px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            ⚠️ {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="loan-filter-tabs">
      {['all', 'pending', 'active', 'overdue', 'closed', 'rejected'].map(tab => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab !== "all" && (
              <span className="count">
                ({loans.filter(l => l.status.toLowerCase() === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="loans-grid">
        {loading ? (
          <div className="empty-state"><p>⏳ Loading loans...</p></div>
        ) : filteredLoans.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 48 }}>📭</p>
            <h3>No Loans</h3>
            <p>No {filter === "all" ? "loans" : filter} loans found.</p>
          </div>
        ) : (
          filteredLoans.map(loan => {
            const badge = STATUS_BADGE[loan.status] || { bg: "#f3f4f6", text: "#374151", emoji: "?" };
            const progress = loan.amount ? Math.min(((loan.amount_paid || 0) / loan.amount) * 100, 100) : 0;
            const { daysOverdue, fineAmount } = calculateLoanStatus(loan);
            const totalDue = (loan.balance || 0) + fineAmount;
            
            return (
              <div key={loan.id} className="loan-card-leader">
                <div className="loan-card-header">
                  <div className="loan-card-title">
                    <h3>Loan #{loan.loan_id}</h3>
                    <p className="loan-member">Member ID: {loan.member_id}</p>
                  </div>
                  <span className="loan-status-badge" style={{ background: badge.bg, color: badge.text }}>
                    {badge.emoji} {loan.status}
                  </span>
                </div>

                <div className="loan-card-amount">
                  <div className="amount-item">
                    <span className="label">Amount</span>
                    <span className="value">₹{(loan.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="amount-item">
                    <span className="label">Paid</span>
                    <span className="value" style={{ color: "#10b981" }}>₹{(loan.amount_paid || 0).toLocaleString()}</span>
                  </div>
                  <div className="amount-item">
                    <span className="label">Balance</span>
                    <span className="value" style={{ color: "#ef4444" }}>₹{(loan.balance || 0).toLocaleString()}</span>
                  </div>
                </div>

                {daysOverdue > 0 && (
                  <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "600", color: "#991b1b" }}>⚠️ Overdue Details</span>
                      <span style={{ fontWeight: "600", color: "#991b1b" }}>{daysOverdue} days</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span style={{ color: "#7f1d1d" }}>Fine Amount:</span>
                      <span style={{ fontWeight: "600", color: "#dc2626" }}>₹{fineAmount.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginTop: "8px" }}>
                      <span style={{ color: "#7f1d1d" }}>Total Due (incl. fine):</span>
                      <span style={{ fontWeight: "600", color: "#991b1b" }}>₹{totalDue.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="progress-wrapper">
                  <div className="progress-meta">
                    <span>Repayment Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="loan-card-meta">
                  <p>📅 Applied: {loan.created_at ? loan.created_at.split("T")[0] : "—"}</p>
                  <p>📅 Due: {loan.due_date ? loan.due_date.split("T")[0] : "—"}</p>
                  {loan.notes && <p>📝 {loan.notes.substring(0, 60)}...</p>}
                </div>

                <div className="loan-card-actions">
                  <button className="btn-view" onClick={() => setDetail(loan)}>
                    View Details
                  </button>
                  {loan.status === "Pending" && (
                    <>
                      <button
                        className="btn-approve"
                        disabled={actionPending === loan.id}
                        onClick={() => approveLoan(loan.id)}
                      >
                        {actionPending === loan.id ? "Approving..." : "✅ Approve"}
                      </button>
                      <button
                        className="btn-reject"
                        disabled={actionPending === loan.id}
                        onClick={() => rejectLoan(loan.id)}
                      >
                        {actionPending === loan.id ? "Rejecting..." : "❌ Reject"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetail(null)}>✕</button>
            <h2>Loan Details: {detail.loan_id}</h2>
            
            <div className="detail-section">
              <h4>📋 Loan Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Member ID:</span>
                  <span className="detail-value">{detail.member_id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">₹{(detail.amount || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Interest Rate:</span>
                  <span className="detail-value">{(detail.interest_rate || 0)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{detail.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Applied On:</span>
                  <span className="detail-value">{detail.created_at ? detail.created_at.split("T")[0] : "—"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Due Date:</span>
                  <span className="detail-value">{detail.due_date ? detail.due_date.split("T")[0] : "—"}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>💵 Repayment Status</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Amount Paid:</span>
                  <span className="detail-value" style={{ color: "#10b981" }}>₹{(detail.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Remaining Balance:</span>
                  <span className="detail-value" style={{ color: "#ef4444" }}>₹{(detail.balance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {(() => {
              const { daysOverdue, fineAmount } = calculateLoanStatus(detail);
              const totalDue = (detail.balance || 0) + fineAmount;
              return daysOverdue > 0 ? (
                <div className="detail-section" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "16px" }}>
                  <h4 style={{ color: "#991b1b" }}>⚠️ Overdue & Fine Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Days Overdue:</span>
                      <span className="detail-value" style={{ color: "#dc2626", fontWeight: "600" }}>{daysOverdue} days</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Fine Amount:</span>
                      <span className="detail-value" style={{ color: "#dc2626", fontWeight: "600" }}>₹{fineAmount.toFixed(2)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Amount Due:</span>
                      <span className="detail-value" style={{ color: "#991b1b", fontWeight: "700", fontSize: "16px" }}>₹{totalDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {detail.notes && (
              <div className="detail-section">
                <h4>📝 Notes</h4>
                <p>{detail.notes}</p>
              </div>
            )}

            {detail.status === "Pending" && (
              <div className="modal-actions">
                <button className="btn-approve" onClick={() => approveLoan(detail.id)}>
                  ✅ Approve Loan
                </button>
                <button className="btn-reject" onClick={() => rejectLoan(detail.id)}>
                  ❌ Reject Loan
                </button>
              </div>
            )}

            <button className="btn-secondary" onClick={() => setDetail(null)} style={{ marginTop: "16px", width: "100%" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
