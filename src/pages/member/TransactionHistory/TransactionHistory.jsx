import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./TransactionHistory.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [loansRes, depositsRes, repayRes] = await Promise.all([
          fetch(`${API}/loans/my-loans`, { headers: hdrs() }),
          fetch(`${API}/deposits/my-deposits`, { headers: hdrs() }).catch(() => Promise.resolve({ ok: false })),
          fetch(`${API}/repayments/my-repayments`, { headers: hdrs() }).catch(() => Promise.resolve({ ok: false })),
        ]);

        let txns = [];

        if (loansRes.ok) {
          const loans = await loansRes.json();
          txns = txns.concat(
            (Array.isArray(loans) ? loans : []).map(l => ({
              id: l.id,
              type: "Loan",
              date: l.created_at ? l.created_at.split("T")[0] : "—",
              amount: l.amount,
              description: `Loan Application - ${l.status}`,
              status: l.status
            }))
          );
        }

        if (depositsRes.ok) {
          const deposits = await depositsRes.json();
          txns = txns.concat(
            (Array.isArray(deposits) ? deposits : []).map(d => ({
              id: d.id,
              type: "Deposit",
              date: d.date || "—",
              amount: d.amount,
              description: d.description || "Deposit",
              status: "Completed"
            }))
          );
        }

        if (repayRes.ok) {
          const repays = await repayRes.json();
          txns = txns.concat(
            (Array.isArray(repays) ? repays : []).map(r => ({
              id: r.id,
              type: "Repayment",
              date: r.payment_date || "—",
              amount: r.installment_amount,
              description: `Loan Repayment`,
              status: "Completed"
            }))
          );
        }

        setTransactions(txns.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } catch (e) {
        showToast(e.message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredTxns = transactions.filter(t => {
    if (filter === "all") return true;
    return t.type.toLowerCase() === filter.toLowerCase();
  });

  const stats = [
    { label: "Total Transactions", value: transactions.length, icon: "📊" },
    { label: "Total Deposits", value: transactions.filter(t => t.type === "Deposit").length, icon: "📥" },
    { label: "Total Loans", value: transactions.filter(t => t.type === "Loan").length, icon: "🏦" },
    { label: "Total Repayments", value: transactions.filter(t => t.type === "Repayment").length, icon: "💰" },
  ];

  const exportCSV = () => {
    const h = ["Date", "Type", "Amount", "Description"];
    const rows = filteredTxns.map(t => [t.date, t.type, t.amount, t.description]);
    const csv = [h, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("CSV exported! ✅");
  };

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1>📈 Transaction History</h1>
          <p className="page-sub">All your deposits, loans, and repayments</p>
        </div>
        <button className="btn-primary" onClick={exportCSV}>
          ⬇️ Export CSV
        </button>
      </div>

      <div className="txn-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="txn-stat-card">
            <span className="txn-stat-icon">{s.icon}</span>
            <div>
              <p className="txn-stat-value">{s.value}</p>
              <p className="txn-stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="txn-filter-tabs">
        {["all", "Deposit", "Loan", "Repayment"].map(tab => (
          <button
            key={tab}
            className={`txn-filter-tab ${filter === tab.toLowerCase() ? "active" : ""}`}
            onClick={() => setFilter(tab.toLowerCase())}
          >
            {tab} ({transactions.filter(t => tab === "all" ? true : t.type === tab).length})
          </button>
        ))}
      </div>

      <div className="txn-table">
        {loading ? (
          <div className="empty-state"><p>⏳ Loading transactions...</p></div>
        ) : filteredTxns.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 48 }}>📭</p>
            <h3>No Transactions</h3>
            <p>Your transactions will appear here.</p>
          </div>
        ) : (
          <table className="txn-table-content">
            <thead>
              <tr>
                <th>📅 Date</th>
                <th>📝 Type</th>
                <th>💰 Amount</th>
                <th>📋 Description</th>
                <th>✓ Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.map(txn => (
                <tr key={txn.id}>
                  <td>{txn.date}</td>
                  <td><span className={`txn-type-badge ${txn.type.toLowerCase()}`}>{txn.type}</span></td>
                  <td className="amount">₹{(txn.amount || 0).toLocaleString()}</td>
                  <td>{txn.description}</td>
                  <td><span className="txn-status-badge">{txn.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
