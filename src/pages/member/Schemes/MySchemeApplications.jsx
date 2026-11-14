import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./MySchemeApplications.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

const STATUS_BADGE = {
  Pending: { bg: "#fef3c7", text: "#92400e", emoji: "⏳" },
  Approved: { bg: "#dcfce7", text: "#15803d", emoji: "✅" },
  Rejected: { bg: "#fee2e2", text: "#991b1b", emoji: "❌" },
};

export default function MySchemeApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/schemes/my-applications`, { headers: hdrs() });
        if (!res.ok) throw new Error("Failed to load applications");
        const data = await res.json();
        setApps(Array.isArray(data) ? data : []);
      } catch (e) {
        showToast(e.message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1>📋 My Scheme Applications</h1>
          <p className="page-sub">Track your scheme application status</p>
        </div>
      </div>

      <div className="applications-list">
        {loading ? (
          <div className="empty-state"><p>⏳ Loading applications...</p></div>
        ) : apps.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 48 }}>📭</p>
            <h3>No Applications Yet</h3>
            <p>Apply for schemes to track them here.</p>
          </div>
        ) : (
          apps.map(app => {
            const badge = STATUS_BADGE[app.status] || { bg: "#f3f4f6", text: "#374151", emoji: "?" };
            return (
              <div key={app.id} className="app-item">
                <div className="app-item-header">
                  <div>
                    <h3>{app.scheme_name}</h3>
                    <p className="app-category">{app.category}</p>
                  </div>
                  <span className="app-status-badge" style={{ background: badge.bg, color: badge.text }}>
                    {badge.emoji} {app.status}
                  </span>
                </div>
                <p className="app-date">📅 Applied: {app.applied_at ? app.applied_at.split("T")[0] : "—"}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
