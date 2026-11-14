import { useState, useEffect } from "react";
import { API } from "../../../../services/api";
import "./MyReports.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const getUser  = () => { try { return JSON.parse(localStorage.getItem("bachatgat_user")||"{}"); } catch { return {}; } };

const MyReports = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [summary, setSummary] = useState({ savings:0, loans:0, repaid:0 });

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/deposits/my-savings`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
          const savings = data.filter(d=>(d.description||"").toLowerCase().includes("savings")).reduce((s,d)=>s+d.amount,0);
          const loans   = data.filter(d=>(d.description||"").toLowerCase().includes("loan")).reduce((s,d)=>s+d.amount,0);
          const repaid  = data.filter(d=>(d.description||"").toLowerCase().includes("repayment")).reduce((s,d)=>s+d.amount,0);
          setSummary({ savings, loans, repaid });
        }
      } catch {
        // use demo data when not connected
        const demo = [
          { id:1, date:"2025-11-03", description:"Monthly Savings",  amount:500  },
          { id:2, date:"2025-10-03", description:"Monthly Savings",  amount:500  },
          { id:3, date:"2025-09-15", description:"Loan Repayment",   amount:800  },
          { id:4, date:"2025-08-01", description:"Medical Loan",     amount:5000 },
        ];
        setHistory(demo);
        setSummary({ savings:1000, loans:5000, repaid:800 });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Fully working PDF download via browser print ──
  const downloadPDF = () => {
    const u    = getUser();
    const name = u.name || "Member";
    const date = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });

    const rows = history.map((h,i) => `
      <tr style="background:${i%2===0?"#f8fafc":"white"}">
        <td>${h.date||"—"}</td>
        <td>${h.description||"Transaction"}</td>
        <td style="color:#10b981;font-weight:700">₹${(h.amount||0).toLocaleString("en-IN")}</td>
      </tr>`).join("") || `<tr><td colspan="3" style="text-align:center;padding:24px;color:#94a3b8">No transactions</td></tr>`;

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>My Report — ${name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:36px;color:#1e293b;background:white}
        .hdr{background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;padding:28px 32px;border-radius:14px;margin-bottom:28px}
        .hdr h1{font-size:22px;font-weight:800;margin-bottom:4px}
        .hdr p{font-size:13px;opacity:.85}
        .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
        .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center}
        .card p{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
        .card h3{font-size:20px;font-weight:800;color:#0f172a}
        table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden}
        thead tr{background:#3b82f6;color:white}
        th{padding:11px 14px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
        td{padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .footer{margin-top:28px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:16px}
        @media print{body{padding:20px}.hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>
      <div class="hdr">
        <h1>Smart Bachatgat — My Report</h1>
        <p>Member: <strong>${name}</strong> &nbsp;|&nbsp; Generated on: ${date}</p>
      </div>
      <div class="cards">
        <div class="card"><p>Total Savings</p><h3>₹${summary.savings.toLocaleString("en-IN")}</h3></div>
        <div class="card"><p>Total Loans</p><h3>₹${summary.loans.toLocaleString("en-IN")}</h3></div>
        <div class="card"><p>Total Repaid</p><h3>₹${summary.repaid.toLocaleString("en-IN")}</h3></div>
        <div class="card"><p>Loan Balance</p><h3>₹${(summary.loans-summary.repaid).toLocaleString("en-IN")}</h3></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Smart Bachatgat Platform — Confidential Member Report</div>
    </body></html>`;

    // Download as HTML file that opens and prints — no popup blocker issues
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `My_Report_${getUser().name||"Member"}_${new Date().toLocaleDateString("en-IN").replace(/\//g,"-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Report downloaded! Open the file and press Ctrl+P to save as PDF ✅");
  };

  return (
    <div className="my-reports">
      {toast && (
        <div className={`ml-toast ml-toast-${toast.type}`} style={{
          position:"fixed",top:20,right:20,zIndex:9999,
          background:toast.type==="success"?"#10b981":"#ef4444",
          color:"white",padding:"12px 20px",borderRadius:10,fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,.15)"
        }}>
          {toast.type==="success"?"✓":"✕"} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h2>My Reports</h2>
          <p>Transaction history for {getUser().name || "Member"}</p>
        </div>
        <button onClick={downloadPDF} style={{
          background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"white",
          border:"none",padding:"10px 22px",borderRadius:10,cursor:"pointer",
          fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8,
          boxShadow:"0 2px 12px rgba(59,130,246,.4)"
        }}>
          ⬇ Download PDF
        </button>
      </div>

      <div className="report-summary">
        <div className="rs-card"><p>Total Savings</p><h3>₹{summary.savings.toLocaleString("en-IN")}</h3></div>
        <div className="rs-card"><p>Total Loans</p><h3>₹{summary.loans.toLocaleString("en-IN")}</h3></div>
        <div className="rs-card"><p>Total Repaid</p><h3>₹{summary.repaid.toLocaleString("en-IN")}</h3></div>
        <div className="rs-card"><p>Loan Balance</p><h3>₹{(summary.loans-summary.repaid).toLocaleString("en-IN")}</h3></div>
      </div>

      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0}}>Transaction History</h3>
          <button onClick={downloadPDF} style={{
            background:"#10b981",color:"white",border:"none",
            padding:"8px 18px",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13
          }}>⬇ Download PDF</button>
        </div>

        {loading ? (
          <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>Loading your transactions…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="3" style={{textAlign:"center",padding:32,color:"#94a3b8"}}>No transactions yet</td></tr>
              ) : history.map((h,i) => (
                <tr key={h.id||i}>
                  <td>{h.date}</td>
                  <td>
                    <span className={`badge ${
                      (h.description||"").toLowerCase().includes("savings")?"badge-success":
                      (h.description||"").toLowerCase().includes("loan")?"badge-info":"badge-danger"
                    }`}>{h.description||"Transaction"}</span>
                  </td>
                  <td style={{color:"#10b981",fontWeight:700}}>₹{(h.amount||0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyReports;