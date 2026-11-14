import { useState, useEffect } from "react";
import { API } from "../../../services/api";
import "./AdminSchemes.css";

const getToken = () => localStorage.getItem("bachatgat_token") || "";
const hdrs = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` });

const STATUS_BADGE = {
  Pending: { bg: "#fef3c7", text: "#92400e", emoji: "⏳" },
  Approved: { bg: "#dcfce7", text: "#15803d", emoji: "✅" },
  Rejected: { bg: "#fee2e2", text: "#991b1b", emoji: "❌" },
};

export default function AdminSchemes() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState("all");
  const [actionPending, setActionPending] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/schemes/admin/applications`, { headers: hdrs() });
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

  const updateStatus = async (appId, newStatus) => {
    setActionPending(appId);
    try {
      const res = await fetch(`${API}/schemes/admin/applications/${appId}/status`, {
        method: "PATCH",
        headers: hdrs(),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Application ${newStatus.toLowerCase()}! ✅`);
        setApps(apps.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        setDetail(null);
      } else {
        showToast(data.detail || "Update failed", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionPending(null);
    }
  };

  const filteredApps = apps.filter(a => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  const stats = [
    { label: "Pending", count: apps.filter(a => a.status === "Pending").length, color: "#f59e0b" },
    { label: "Approved", count: apps.filter(a => a.status === "Approved").length, color: "#10b981" },
    { label: "Rejected", count: apps.filter(a => a.status === "Rejected").length, color: "#ef4444" },
  ];

  return (
    <div className="page-container">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1>📋 Scheme Applications</h1>
          <p className="page-sub">Review and manage member scheme applications</p>
        </div>
      </div>

      <div className="admin-stats">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-value" style={{ color: s.color }}>{s.count}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="loan-filter-tabs">
        {["all", "Pending", "Approved", "Rejected"].map(tab => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="apps-grid">
        {loading ? (
          <div className="empty-state"><p>⏳ Loading...</p></div>
        ) : filteredApps.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 48 }}>📭</p>
            <h3>No Applications</h3>
            <p>No {filter === "all" ? "applications" : filter} found.</p>
          </div>
        ) : (
          filteredApps.map(app => {
            const badge = STATUS_BADGE[app.status] || { bg: "#f3f4f6", text: "#374151", emoji: "?" };
            return (
              <div key={app.id} className="app-card">
                <div className="app-header">
                  <div>
                    <h3>{app.scheme_name}</h3>
                    <p className="app-category">{app.category}</p>
                  </div>
                  <span className="app-status" style={{ background: badge.bg, color: badge.text }}>
                    {badge.emoji} {app.status}
                  </span>
                </div>

                <div className="app-meta">
                  <p>📅 Applied: {app.applied_at ? app.applied_at.split("T")[0] : "—"}</p>
                </div>

                <div className="app-actions">
                  <button className="btn-view" onClick={() => setDetail(app)}>View</button>
                  {app.status === "Pending" && (
                    <>
                      <button
                        className="btn-approve"
                        disabled={actionPending === app.id}
                        onClick={() => updateStatus(app.id, "Approved")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="btn-reject"
                        disabled={actionPending === app.id}
                        onClick={() => updateStatus(app.id, "Rejected")}
                      >
                        ❌ Reject
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
            <h2>{detail.scheme_name}</h2>
            <p className="detail-category">{detail.category}</p>

            <div className="detail-section">
              <h4>📋 Scheme Details</h4>
              <div className="detail-items">
                <p><strong>Category:</strong> {detail.category}</p>
                <p><strong>Status:</strong> {detail.status}</p>
                <p><strong>Applied On:</strong> {detail.applied_at ? detail.applied_at.split("T")[0] : "—"}</p>
              </div>
            </div>

            {detail.status === "Pending" && (
              <div className="modal-actions">
                <button className="btn-approve" onClick={() => updateStatus(detail.id, "Approved")}>
                  ✅ Approve Application
                </button>
                <button className="btn-reject" onClick={() => updateStatus(detail.id, "Rejected")}>
                  ❌ Reject Application
                </button>
              </div>
            )}

            <button className="btn-secondary" onClick={() => setDetail(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
