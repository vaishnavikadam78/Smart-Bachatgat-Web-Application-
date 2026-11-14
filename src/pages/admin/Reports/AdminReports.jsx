import { useState } from "react";
import { API } from "../../../services/api";
import "../ManageGroups/ManageGroups.css";

const token = () => localStorage.getItem("bachatgat_token");

export default function AdminReports() {
  const [loading, setLoading] = useState({});
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch data from API and download as CSV ──
  const downloadReport = async (type) => {
    setLoading(l => ({ ...l, [type]: true }));
    try {
      let data = [];
      let headers = [];
      let filename = "";

      if (type === "groups") {
        const res = await fetch(`${API}/groups/`, { headers: { Authorization: `Bearer ${token()}` } });
        data = await res.json();
        headers = ["Group ID","Name","Location","Meeting Day","Total Savings","Status"];
        const rows = data.map(g => [g.group_id, g.name, g.location||"-", g.meeting_day||"-", g.total_savings||0, g.status]);
        filename = "groups_report.csv";
        downloadCSV(headers, rows, filename);

      } else if (type === "members") {
        const res = await fetch(`${API}/auth/users?role=member`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) {
          data = await res.json();
          headers = ["Member ID","Name","Phone","Email","Group ID","Occupation","Total Savings","Status"];
          const rows = data.map(m => [m.member_id || "-", m.name, m.phone || "-", m.email || "-", m.group_id || "-", m.occupation || "-", m.total_savings || 0, m.status || "Active"]);
          filename = "members_report.csv";
          downloadCSV(headers, rows, filename);
        } else {
          showToast("Members API not available — using sample data", "error");
          downloadCSV(
            ["Member ID","Name","Phone","Group ID","Total Savings"],
            [["M001","Sunita Patil","9876543210","1","5000"],["M002","Rekha Shinde","9988776655","1","4500"]],
            "members_report.csv"
          );
        }

      } else if (type === "loans") {
        const res = await fetch(`${API}/loans/`, { headers: { Authorization: `Bearer ${token()}` } });
        if (res.ok) {
          data = await res.json();
          headers = ["Loan ID","Member","Amount","Status","Date"];
          const rows = data.map(l => [l.id, l.member_id, l.amount, l.status, l.created_at?.split("T")[0]||"-"]);
          filename = "loans_report.csv";
          downloadCSV(headers, rows, filename);
        } else {
          showToast("Loans API — downloading sample", "error");
          downloadCSV(
            ["Loan ID","Member ID","Amount","Status"],
            [["1","M001","15000","Active"],["2","M002","10000","Closed"]],
            "loans_report.csv"
          );
        }

      } else if (type === "mis") {
        // MIS = combined summary
        const [gRes] = await Promise.all([
          fetch(`${API}/groups/`, { headers: { Authorization: `Bearer ${token()}` } })
        ]);
        const groups = gRes.ok ? await gRes.json() : [];
        headers = ["Report","Value"];
        const rows = [
          ["Total Groups", groups.length],
          ["Active Groups", groups.filter(g => g.status === "Active").length],
          ["Total Savings", "₹" + groups.reduce((s,g) => s + (g.total_savings||0), 0).toLocaleString()],
          ["Report Date", new Date().toLocaleDateString("en-IN")],
        ];
        downloadCSV(headers, rows, "mis_report.csv");
      }

      showToast(`${type.toUpperCase()} report downloaded successfully!`);
    } catch (err) {
      showToast("Download failed — check if backend is running", "error");
    } finally {
      setLoading(l => ({ ...l, [type]: false }));
    }
  };

  const downloadCSV = (headers, rows, filename) => {
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  const reports = [
    {
      id:    "mis",
      title: "MIS Report",
      desc:  "Monthly savings & loan summary for all groups",
      icon:  "📊",
      color: "#3b82f6",
      bg:    "#eff6ff",
    },
    {
      id:    "loans",
      title: "Loan Report",
      desc:  "All active and closed loans with member details",
      icon:  "🏦",
      color: "#8b5cf6",
      bg:    "#f5f3ff",
    },
    {
      id:    "members",
      title: "Member Report",
      desc:  "Complete member directory with savings info",
      icon:  "👥",
      color: "#f59e0b",
      bg:    "#fffbeb",
    },
    {
      id:    "groups",
      title: "Groups Report",
      desc:  "All registered Bachatgat groups with status",
      icon:  "🏘️",
      color: "#10b981",
      bg:    "#f0fdf4",
    },
  ];

  return (
    <div className="page-container">
      {toast && (
        <div className={`ml-toast ml-toast-${toast.type}`}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="ml-breadcrumb">Home <span>/</span> <span className="ml-bc-active">Reports</span></div>
          <h1>Reports & Exports</h1>
          <p className="page-sub">Download live reports directly from the database as CSV</p>
        </div>
        <button className="btn-primary" onClick={() => reports.forEach(r => downloadReport(r.id))}>
          📥 Download All Reports
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {reports.map(r => (
          <div key={r.id} style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: r.bg, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 16,
              border: `1px solid ${r.color}22`
            }}>
              {r.icon}
            </div>
            <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>
              {r.title}
            </h3>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              {r.desc}
            </p>
            <button
              onClick={() => downloadReport(r.id)}
              disabled={loading[r.id]}
              style={{
                width: "100%",
                background: loading[r.id] ? "#f1f5f9" : r.color,
                color: loading[r.id] ? "#94a3b8" : "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: loading[r.id] ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "opacity 0.2s",
              }}
            >
              {loading[r.id] ? (
                <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #94a3b8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Downloading…</>
              ) : (
                <>↓ Download CSV</>
              )}
            </button>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}