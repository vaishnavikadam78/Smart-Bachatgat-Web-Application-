import { useState } from "react";
import { API } from "../../../services/api";
import "./AdminTools.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

export default function AdminTools() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmReset, setConfirmReset] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const executeReset = async (resetType) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/reset/${resetType}`, {
        method: "POST",
        headers: hdrs(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${resetType} reset successful! ${data.message}`);
        setConfirmReset(null);
      } else {
        showToast(data.detail || `Reset failed`, "error");
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    {
      id: "all-data",
      title: "🗑️ Full System Reset",
      desc: "Delete all data except admin user. Use only in development.",
      color: "#ef4444",
      warning: "This will delete ALL data including groups, members, loans, and transactions!"
    },
    {
      id: "member-data",
      title: "👥 Reset Member Data",
      desc: "Delete all members, their loans, deposits, and transaction history.",
      color: "#f59e0b",
      warning: "This will delete all member records and related transactions."
    },
    {
      id: "loans",
      title: "🏦 Reset Loans",
      desc: "Delete all loan records and repayment history.",
      color: "#3b82f6",
      warning: "This will delete all loan and repayment records."
    },
    {
      id: "transactions",
      title: "💳 Reset Transactions",
      desc: "Delete all deposits and transaction history.",
      color: "#8b5cf6",
      warning: "This will delete all deposit and transaction records."
    },
  ];

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1>⚙️ Admin Tools</h1>
          <p className="page-sub">System administration and data management</p>
        </div>
      </div>

      <div className="admin-section">
        <h2>🔧 Data Management</h2>
        <p className="section-desc">Manage and reset system data. Use with caution!</p>
        
        <div className="tools-grid">
          {tools.map(tool => (
            <div key={tool.id} className="tool-card" style={{ borderLeftColor: tool.color }}>
              <h3>{tool.title}</h3>
              <p>{tool.desc}</p>
              <button
                className="btn-danger"
                onClick={() => setConfirmReset(tool)}
                disabled={loading}
                style={{ borderColor: tool.color, color: tool.color }}
              >
                Execute Reset
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <h2>📊 System Info</h2>
        <div className="info-grid">
          <div className="info-card">
            <span className="info-label">API Endpoint</span>
            <span className="info-value">{API}</span>
          </div>
          <div className="info-card">
            <span className="info-label">Version</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-card">
            <span className="info-label">Environment</span>
            <span className="info-value">Production</span>
          </div>
        </div>
      </div>

      {confirmReset && (
        <div className="modal-overlay" onClick={() => setConfirmReset(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>⚠️ Confirm Reset</h2>
            <p className="warning-text">{confirmReset.warning}</p>
            
            <div className="confirmation-box">
              <p>This action <strong>cannot be undone</strong>. Are you absolutely sure?</p>
              <p style={{ marginTop: "12px" }}>Type "<strong>RESET</strong>" to confirm:</p>
              <input
                type="text"
                placeholder="Type RESET to confirm"
                id="confirm-input"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  marginTop: "8px",
                  fontSize: "14px"
                }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setConfirmReset(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-reset-confirm"
                onClick={() => {
                  const input = document.getElementById("confirm-input").value;
                  if (input !== "RESET") {
                    showToast("Type 'RESET' to confirm", "error");
                    return;
                  }
                  executeReset(confirmReset.id);
                }}
                disabled={loading}
              >
                {loading ? "⏳ Resetting..." : "🔴 Execute Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
