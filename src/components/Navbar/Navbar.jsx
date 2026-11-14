import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import NotificationBell from "../NotificationBell/NotificationBell";
import LanguageSwitcher from "../LanguageSwitcher/LanguageSwitcher";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { t }            = useLanguage();
  const navigate         = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  const roleLabel = { admin: t("roleAdmin") || "Administrator", leader: t("roleLeader") || "Group Leader", member: t("roleMember") || "Member" };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🌿</span>
        <span className="brand-name">Smart Bachatgat</span>
      </div>
      <div className="navbar-right" style={{display:"flex",alignItems:"center",gap:12}}>
        {/* Language Switcher */}
        <LanguageSwitcher compact={true} />

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Info */}
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
          <div>
            <p className="user-name">{user?.name || "User"}</p>
            <p className="user-role">{roleLabel[user?.role] || user?.role}</p>
          </div>
        </div>

        <button className="btn btn-logout" onClick={handleLogout}>{t("logout")}</button>
      </div>
    </header>
  );
};

export default Navbar;