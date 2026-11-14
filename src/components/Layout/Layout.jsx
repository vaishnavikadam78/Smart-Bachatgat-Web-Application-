import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Layout.css";
import { useLanguage } from "../../context/LanguageContext";

const menuItems = {
  admin: [
    { icon: "🏠", key: "dashboard",      path: "/admin/dashboard" },
    { icon: "👑", key: "manageLeaders", path: "/admin/manage-leaders" },
    { icon: "👥", key: "manageGroups",  path: "/admin/manage-groups" },
    { icon: "📊", key: "reports",       path: "/admin/reports" },
  ],
  leader: [
    { icon: "🏠", key: "dashboard",    path: "/leader/dashboard" },
    { icon: "👩", key: "members",      path: "/leader/members" },
    { icon: "💰", key: "transactions", path: "/leader/transactions" },
    { icon: "📅", key: "meetings",     path: "/leader/meetings" },
  ],
  member: [
    { icon: "🏠", key: "dashboard",    path: "/member/dashboard" },
    { icon: "💵", key: "mySavings",    path: "/member/my-savings" },
    { icon: "🏦", key: "myLoans",      path: "/member/my-loans" },
    { icon: "📋", key: "myReports",    path: "/member/my-reports" },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();

  const role = user?.role || "member";
  const items = (menuItems[role] || []).map(it => ({ ...it, label: t(it.key) }));

  const handleLogout = () => { logout(); navigate("/login"); };

  const roleLabel = {
    admin: t("roleAdmin") || "Administrator",
    leader: t("roleLeader") || "Group Leader",
    member: t("roleMember") || "Member"
  }[role];
  const roleColor = { admin: "#c026d3", leader: "#8b5cf6", member: "#f43f5e" }[role];

  return (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="layout-sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <span className="logo-icon">🌸</span>
            {!collapsed && <span className="logo-text">SmartBachatgat</span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {!collapsed && (
          <div className="sidebar-user">
            <div className="user-avatar" style={{ background: roleColor }}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="user-info">
              <p className="user-name">{user?.name || "User"}</p>
              <p className="user-role">{roleLabel}</p>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          {!collapsed && <span>{t("logout")}</span>}
        </button>
      </aside>

      <main className="layout-main">{children}</main>
    </div>
  );
}