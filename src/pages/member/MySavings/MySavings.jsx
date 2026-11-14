import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./MySavings.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

export default function MySavings() {
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/deposits/my-savings`, { headers: hdrs() });
      if (!res.ok) throw new Error("Failed to load savings");
      const data = await res.json();
      setSavings(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("Cannot load savings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const total = savings.reduce((a, b) => a + (b.amount || 0), 0);

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header">
        <div>
          <h1>My Savings</h1>
          <p className="page-sub">Monthly savings contribution history</p>
        </div>
        <div className="total-badge">Total: ₹{total.toLocaleString()}</div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading savings…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {savings.map((s, i) => (
                <tr key={s.id || i}>
                  <td>{i + 1}</td>
                  <td>{s.date || s.created_at || "—"}</td>
                  <td>₹{(s.amount || 0).toLocaleString()}</td>
                  <td style={{ color: "var(--text-muted)" }}>{s.description || "Savings"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}