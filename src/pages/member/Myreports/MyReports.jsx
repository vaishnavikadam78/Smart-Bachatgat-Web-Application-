import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./MyReports.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

const typeColors = { Savings: "badge-success", Loan: "badge-info", Repayment: "badge-danger" };

export default function MyReports() {
  const [deposits, setDeposits] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`${API}/reports/pdf/member`, { headers: hdrs() });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smart-bachatgat_member_report_${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF downloaded successfully!");
    } catch (err) {
      showToast("PDF download failed. Please try again.", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, lRes] = await Promise.all([
        fetch(`${API}/deposits/my-savings`, { headers: hdrs() }),
        fetch(`${API}/loans/my-loans`, { headers: hdrs() })
      ]);
      if (dRes.ok) setDeposits(await dRes.json());
      if (lRes.ok) setLoans(await lRes.json());
    } catch (e) { showToast("Cannot load reports", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalSavings = deposits.reduce((s, d) => s + (d.amount || 0), 0);
  const totalLoans = loans.reduce((s, l) => s + (l.amount || 0), 0);
  const totalRepaid = loans.reduce((s, l) => s + (l.amount_paid || 0), 0);
  const loanBalance = totalLoans - totalRepaid;

  // Build a simple unified transaction history: deposits + loan entries
  const history = [
    ...deposits.map(d => ({ date: d.date || d.created_at, type: "Savings", amount: `₹${d.amount}`, balance: "—", note: d.description || "Savings" })),
    ...loans.map(l => ({ date: l.created_at?.split("T")[0] || l.date || "—", type: "Loan", amount: `₹${l.amount}`, balance: `₹${l.balance}`, note: l.purpose || l.notes || "Loan" }))
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="my-reports">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header">
        <h2>My Reports</h2>
        <p>Full transaction history</p>
      </div>

      <div className="report-summary">
        <div className="rs-card"><p>Total Savings</p><h3>₹{totalSavings.toLocaleString()}</h3></div>
        <div className="rs-card"><p>Total Loans</p><h3>₹{totalLoans.toLocaleString()}</h3></div>
        <div className="rs-card"><p>Total Repaid</p><h3>₹{totalRepaid.toLocaleString()}</h3></div>
        <div className="rs-card"><p>Loan Balance</p><h3>₹{loanBalance.toLocaleString()}</h3></div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Transaction History</h3>
          <button className="btn btn-accent btn-sm" onClick={downloadPDF} disabled={pdfLoading}>
            {pdfLoading ? "Generating PDF…" : "⬇ Download PDF"}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance</th><th>Note</th></tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td>{h.date}</td>
                  <td><span className={`badge ${typeColors[h.type]}`}>{h.type}</span></td>
                  <td>{h.amount}</td>
                  <td>{h.balance}</td>
                  <td style={{ color: "var(--text-muted)" }}>{h.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}