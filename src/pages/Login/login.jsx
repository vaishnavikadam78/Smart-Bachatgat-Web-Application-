import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API } from "../../services/api";
import "./login.css";   // ✅ FIXED: was "./Login.css" (wrong casing — caused white screen)
import { useLanguage } from "../../context/LanguageContext";

const roleConfig = {
  admin:  { labelKey:"roleAdmin",  initial:"A", descKey:"roleAdminDesc", color:"#7c3aed" },
  leader: { labelKey:"roleLeader", initial:"L", desc:"Manage your group", color:"#c026d3" },
  member: { labelKey:"roleMember", initial:"M", desc:"View your savings", color:"#9333ea" },
};

const leftCards = [
  { labelKey:"lp_totalSavings",   value:"₹4,82,500", sub:"↑ 12% this month", color:"#e879f9" },
  { labelKey:"lp_activeMembers",  value:"248",        sub:"Across 18 groups", color:"#a78bfa" },
  { labelKey:"lp_loansDisbursed", value:"₹1.2L",      sub:"34 active loans",  color:"#f0abfc" },
];

export default function Login() {
  const [role,     setRole]     = useState("member");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const { t } = useLanguage();

  const handleLogin = async () => {
    setError("");
    if (!username.trim()) { setError(t("enterUsername") || "Please enter your username."); return; }
    if (!password.trim()) { setError(t("enterPassword") || "Please enter your password.");  return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim(), password }),
      });

      let data;
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        const msg = data.detail || "Invalid username or password.";
        setError(msg);
        return;
      }

      login(data.user, data.access_token);
      if (data.user.role === "admin")  navigate("/admin/dashboard");
      if (data.user.role === "leader") navigate("/leader/dashboard");
      if (data.user.role === "member") navigate("/member/dashboard");

    } catch {
      setError(t("serverUnavailable") || "Cannot reach server. Please:\n1. Open CMD as Admin\n2. Run: net start postgresql-x64-13\n3. Run: python -m uvicorn main:app --reload --port 8000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-left">
        <div className="login-left-blob1" />
        <div className="login-left-blob2" />
        <div className="login-left-blob3" />
        <div className="login-left-content">
          <div className="login-logo">
            <div className="login-logo-mark">B</div>
            <span>SmartBachatgat</span>
          </div>
          <div className="login-left-heading">
            <h2>{t("welcomeBack")}</h2>
            <p>{t("loginSub")}</p>
          </div>
          <div className="login-left-cards">
            {leftCards.map((c,i) => (
              <div key={i} className="login-left-card" style={{animationDelay:`${i*0.15}s`}}>
                <div className="login-left-card-dot"  style={{background:c.color}} />
                <div className="login-left-card-body">
                  <div className="login-left-card-val">{c.value}</div>
                  <div className="login-left-card-label">{t(c.labelKey)}</div>
                </div>
                <div className="login-left-card-sub" style={{color:c.color}}>{c.sub}</div>
              </div>
            ))}
          </div>
          <div className="login-left-stats">
            <div className="login-left-stat"><b>500+</b><span>{t("members")}</span></div>
            <div className="login-left-stat-sep" />
            <div className="login-left-stat"><b>₹25L+</b><span>{t("totalSavings")}</span></div>
            <div className="login-left-stat-sep" />
            <div className="login-left-stat"><b>18</b><span>{t("totalGroups")}</span></div>
          </div>
          <div className="login-left-avatars">
            {["SK","RP","MJ","AP","KM","SB"].map((a,i) => (
              <div key={i} className="login-left-avatar" style={{zIndex:6-i}}>{a}</div>
            ))}
            <span className="login-left-avatars-text">+240 active today</span>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-wrap">
          <div className="login-header">
            <h1>{t("signIn")}</h1>
            <p className="login-sub">{t("chooseRoleLogin")}</p>
          </div>

          <div className="login-roles">
            {Object.entries(roleConfig).map(([r,cfg]) => (
              <button key={r} className={`role-btn ${role===r?"active":""}`}
                onClick={() => setRole(r)} style={{"--rc":cfg.color}}>
                <div className="role-btn-avatar" style={{
                  background: role===r ? cfg.color : "#f3f4f6",
                  color:      role===r ? "white"   : "#9ca3af",
                }}>{cfg.initial}</div>
                <span className="role-btn-label">{t(cfg.labelKey)}</span>
                <span className="role-btn-desc">{t(cfg.descKey) || cfg.desc}</span>
                {role===r && <div className="role-btn-check">✓</div>}
              </button>
            ))}
          </div>

          {error && (
            <div className="login-error" style={{whiteSpace:"pre-line"}}>
              ⚠ {error}
            </div>
          )}

          <div className="login-field">
            <label>{t("username")}</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input type="text" placeholder={t("enterUsername")} value={username}
                onChange={e=>{setUsername(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="username" autoFocus />
            </div>
          </div>

          <div className="login-field">
            <label>{t("password")}</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </span>
              <input type={showPass?"text":"password"} placeholder={t("enterPassword")} value={password}
                onChange={e=>{setPassword(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoComplete="current-password" />
              <button className="login-eye-btn" onClick={()=>setShowPass(!showPass)} type="button">
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className={`login-btn ${loading?"login-btn--loading":""}`}
            onClick={handleLogin} disabled={loading}>
            {loading ? <span className="login-spinner"/> : <>{t("signIn")} <span className="login-btn-arrow">→</span></>}
          </button>

          <div className="login-divider">
            <span/>
            <p>{t("loggingInAs")} <strong style={{color:roleConfig[role].color}}>{t(roleConfig[role].labelKey)}</strong></p>
            <span/>
          </div>

          <p className="login-register-link">
            {t("dontHaveAccount")} {" "}
            <span onClick={()=>navigate("/register")}>{t("createOneFree")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}