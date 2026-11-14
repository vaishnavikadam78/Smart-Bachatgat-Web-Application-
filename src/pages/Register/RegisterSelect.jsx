/* 
  ADD THIS at the top of your existing Register.jsx
  Just replace the first return statement (the main form wrapper)
  with this role selector — OR make a new file RegisterSelect.jsx
  
  This page shows BEFORE member/leader registration
  Route: /register  → shows this
  Route: /register/member → existing Register.jsx
  Route: /register/leader → new LeaderRegister.jsx
*/

import { useNavigate, Link } from "react-router-dom";
import "./Register.css";

export default function RegisterSelect() {
  const navigate = useNavigate();

  return (
    <div className="rg-root">
      {/* LEFT PANEL — same as existing */}
      <div className="rg-left">
        <div className="rg-left-bg" />
        <div className="rg-left-content">
          <div className="rg-brand">
            <div className="rg-brand-icon">B</div>
            <div>
              <div className="rg-brand-name">Bachatgat</div>
              <div className="rg-brand-tag">Smart SHG Platform</div>
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>
              Who can register?
            </div>

            {[
              { role: "Member", desc: "Join an existing bachatgat group using your invite code", icon: "👩" },
              { role: "Leader", desc: "Create and manage your own bachatgat group under an NGO/Organization", icon: "👑" },
            ].map(item => (
              <div key={item.role} style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(251,191,36,0.15)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 12,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{item.role}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rg-left-quote" style={{ marginTop: "auto" }}>
            <p>"SmartBachatgat has helped thousands of women across Maharashtra manage their savings digitally."</p>
            <span>— Maharashtra SHG Network</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="rg-right">
        <div className="rg-form-wrap">
          <div className="rg-header">
            <h2>Create your account</h2>
            <p>Choose how you want to register</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>

            {/* Member Card */}
            <button
              type="button"
              onClick={() => navigate("/register/member")}
              style={{
                background: "white",
                border: "2px solid #fde68a",
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(245,158,11,0.15)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#fde68a";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 13,
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, flexShrink: 0,
              }}>👩</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: "#1c1400", marginBottom: 4 }}>
                  Register as Member
                </div>
                <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                  Join an existing bachatgat group using your invite code from your leader
                </div>
              </div>
              <div style={{ color: "#d97706", fontSize: 20, flexShrink: 0 }}>→</div>
            </button>

            {/* Leader Card */}
            <button
              type="button"
              onClick={() => navigate("/register/leader")}
              style={{
                background: "linear-gradient(135deg, #fffbeb, #fff9f0)",
                border: "2px solid #fde68a",
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#f59e0b";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(245,158,11,0.2)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#fde68a";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 13,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, flexShrink: 0,
              }}>👑</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: "#1c1400", marginBottom: 4 }}>
                  Register as Leader
                </div>
                <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                  Create and manage your own bachatgat group under an Organization & NGO
                </div>
              </div>
              <div style={{ color: "#d97706", fontSize: 20, flexShrink: 0 }}>→</div>
            </button>

          </div>

          <p className="rg-login-link" style={{ marginTop: 28 }}>
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}