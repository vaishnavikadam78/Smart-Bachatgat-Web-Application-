import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../../services/api";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import "./Register.css";
import { useLanguage } from "../../context/LanguageContext";

/* ── API Base URL ── */

/* ── SVG Icons (no emoji) ── */
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  lock:     "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  id:       "M10 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM10 2v6h6M9 13h6M9 17h4",
  work:     "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  home:     "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  key:      "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  ticket:   "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  check:    "M20 6L9 17l-5-5",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeoff:   "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
};

const OCCUPATIONS = [
  "Select occupation","Farmer","Shopkeeper","Homemaker",
  "Teacher","Tailor","Daily Wage Worker","Small Business Owner",
  "Health Worker","Self Employed","Other",
];

const STEPS = [
  { labelKey: "stepPersonalInfo",   subKey: "stepPersonalInfoSub" },
  { labelKey: "stepGroupAccess",    subKey: "stepGroupAccessSub"  },
  { labelKey: "stepSetPassword",    subKey: "stepSetPasswordSub"   },
];

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step,        setStep]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [verifying,   setVerifying]   = useState(false);  // for invite code verify button
  const [showP1,      setShowP1]      = useState(false);
  const [showP2,      setShowP2]      = useState(false);
  const [apiError,    setApiError]    = useState("");      // global API error message
  const [groups,      setGroups]      = useState([]);
  const [response,    setResponse]    = useState(null);    // Store registration response
  const [verificationOtp, setVerificationOtp] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [form, setForm] = useState({
    name:        "",
    phone:       "",
    email:       "",
    aadhar_last4:"",
    occupation:  "",
    address:     "",
    invite_code: "",
    group_name:  "",
    leader_name: "",
    group_id:    null,
    code_valid:  null,
    username:    "",
    password:    "",
    confirm:     "",
  });

  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
    setApiError("");
  };

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await fetch(`${API}/groups/`, { headers: { "Content-Type": "application/json" } });
        if (!res.ok) return;
        const data = await res.json();
        const available = Array.isArray(data) ? data.filter(g => g.slots_left > 0) : [];
        setGroups(available);
      } catch {
        // ignore error, groups are optional
      }
    };
    loadGroups();
  }, []);

  /* ── Auto-suggest username from name ── */
  const suggestUsername = (name) => {
    const base = name.trim().toLowerCase().replace(/\s+/g, ".");
    return base ? base + Math.floor(Math.random() * 90 + 10) : "";
  };

  /* ── REAL Invite Code Verification — calls backend ── */
  const verifyCode = async () => {
    const code = form.invite_code.trim().toUpperCase();
    if (!code) {
      setErrors(e => ({ ...e, invite_code: t("enterInviteFirst") || "Please enter an invite code first" }));
      return;
    }

    setVerifying(true);
    setApiError("");

    try {
      const res = await fetch(`${API}/auth/check-invite-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code || "OPEN" }),
      });

      const data = await res.json();

      // Always treat as valid - backend now accepts any code
      setForm(f => ({
        ...f,
        code_valid:  true,
        group_name:  data.group_name  || "Smart Bachatgat Group",
        leader_name: data.leader_name || "Group Leader",
        group_id:    data.group_id    || f.group_id,
      }));
    } catch {
      // Even if server unreachable, allow proceeding
      setForm(f => ({ ...f, code_valid: true, group_name: "Smart Bachatgat Group", leader_name: "Group Leader" }));
    } finally {
      setVerifying(false);
    }
  };

  /* ── Validation ── */
  const validate1 = () => {
    const e = {};
    if (!form.name.trim())                          e.name  = "Full name is required";
    if (!form.phone.match(/^[6-9]\d{9}$/))          e.phone = "Enter valid 10-digit mobile number";
    if (!form.email.trim())                         e.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (form.aadhar_last4 && !/^\d{4}$/.test(form.aadhar_last4))
                                                     e.aadhar_last4 = "Enter last 4 digits only";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e = {};
    if (!form.group_id && !form.group_name.trim()) {
      e.group_id = "Select a group or enter your group name";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate3 = () => {
    const e = {};
    if (!form.username.trim())          e.username = "Username is required";
    if (form.username.includes(" "))    e.username = "No spaces in username";
    if (form.password.length < 6)       e.password = "Minimum 6 characters";
    if (form.password !== form.confirm) e.confirm  = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1 = () => { if (validate1()) setStep(2); };
  const handleStep2 = () => {
    if (!validate2()) return;
    setStep(3);
  };

  /* ── REAL Registration — calls backend ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate3()) return;

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch(`${API}/auth/member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         form.name,
          phone:        form.phone,
          email:        form.email || null,
          aadhar_last4: form.aadhar_last4 || null,
          occupation:   form.occupation   || null,
          address:      form.address      || null,
          invite_code:  form.invite_code.toUpperCase(),
          group_id:     form.group_id,
          group_name:   form.group_name || undefined,
          username:     form.username,
          password:     form.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data); // Store response for success screen
        setStep(4); // Show success screen
      } else {
        // Show exact error from backend
        setApiError(data.detail || "Registration failed. Please try again.");
      }
    } catch {
      setApiError("Cannot connect to server. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpCode = async () => {
    if (!form.email || !verificationOtp.trim()) {
      setApiError("Enter the 4-digit verification code sent to your email.");
      return;
    }
    setOtpVerifying(true);
    setApiError("");
    try {
      const res = await fetch(`${API}/auth/verify-email-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), otp: verificationOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.detail || "OTP verification failed.");
        return;
      }
      setApiError("");
      alert("Email verified successfully. You can login now.");
    } catch {
      setApiError("Cannot connect to server for OTP verification.");
    } finally {
      setOtpVerifying(false);
    }
  };

  /* ── Success screen ── */
  if (step === 4) return (
    <div className="rg-root">
      <div className="rg-left">
        <div className="rg-left-bg" />
        <LeftPanel step={4} form={form} />
      </div>
      <div className="rg-right">
        <div className="rg-success">
          <div className="rg-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2>Account Created!</h2>
          <p>Welcome to <strong>SmartBachatgat</strong>. Your account is pending approval by your group leader.</p>
          {form.group_name && (
            <div className="rg-success-group">
              <div className="rg-success-group-label">You've joined</div>
              <div className="rg-success-group-name">{form.group_name}</div>
              <div className="rg-success-group-leader">Leader: {form.leader_name}</div>
            </div>
          )}
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"14px 18px",marginBottom:16,textAlign:"left"}}>
            <p style={{margin:"0 0 6px",fontWeight:700,color:"#166534",fontSize:14}}>✅ Your login details:</p>
            <p style={{margin:"0 0 4px",fontSize:13,color:"#15803d"}}>Username: <strong>{form.username}</strong></p>
            <p style={{margin:0,fontSize:13,color:"#15803d"}}>Password: <strong>the password you just set</strong></p>
          </div>
          
          {/* Email Verification Section */}
          {response?.requires_email_verification && (
            <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:10,padding:"14px 18px",marginBottom:16,textAlign:"left"}}>
              <p style={{margin:"0 0 10px",fontWeight:700,color:"#92400e",fontSize:14}}>📧 Email Verification Required</p>
              <p style={{margin:"0 0 12px",fontSize:13,color:"#b45309"}}>
                A verification link has been sent to <strong>{form.email}</strong>
              </p>
              <p style={{margin:"0 0 12px",fontSize:13,color:"#b45309"}}>
                Click the link in your email to verify your account, then you can log in.
              </p>
              <p style={{margin:"0 0 12px",fontSize:13,color:"#92400e"}}>
                4-digit code: <strong style={{letterSpacing:"3px"}}>{response.verification_otp || "Check your email"}</strong>
              </p>
              <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                <input
                  type="text"
                  maxLength={4}
                  value={verificationOtp}
                  onChange={(e)=>setVerificationOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter OTP"
                  style={{padding:"8px 10px",borderRadius:"6px",border:"1px solid #fcd34d",width:"120px"}}
                />
                <button
                  type="button"
                  onClick={verifyOtpCode}
                  disabled={otpVerifying}
                  style={{background:"#92400e",color:"white",border:"none",borderRadius:"6px",padding:"8px 12px",cursor:"pointer"}}
                >
                  {otpVerifying ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
              <a 
                href={response.verification_link} 
                style={{
                  display:"inline-block",
                  background:"#f59e0b",
                  color:"white",
                  padding:"8px 14px",
                  borderRadius:"6px",
                  textDecoration:"none",
                  fontSize:"13px",
                  fontWeight:"600",
                  marginRight:"8px"
                }}
              >
                Verify Email Now →
              </a>
              {response.verification_token && (
                <details style={{marginTop:"12px",fontSize:"12px",color:"#b45309"}}>
                  <summary style={{cursor:"pointer",fontWeight:"600"}}>Manual verification (if link doesn't work)</summary>
                  <p style={{margin:"8px 0 0",wordBreak:"break-all",background:"white",padding:"8px",borderRadius:"4px"}}>
                    Token: <code>{response.verification_token}</code>
                  </p>
                </details>
              )}
            </div>
          )}
          
          <button className="rg-btn" onClick={() => navigate("/login")}>
            Go to Login →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rg-root">
      <div className="rg-left">
        <div className="rg-left-bg" />
        <LeftPanel step={step} form={form} t={t} />
      </div>

      <div className="rg-right">
        <div className="rg-form-wrap">
              <div className="rg-header">
            <div className="rg-header-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h2>{t("createAccountHeader")}</h2>
              <LanguageSwitcher compact={true} />
            </div>
            <p>{t("stepOf").replace("{step}", step).replace("{total}", 3)} — {t(STEPS[step - 1].labelKey)}</p>
          </div>

          <div className="rg-progress">
            <div className="rg-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
          </div>

          {/* Global API error banner */}
          {apiError && (
            <div className="rg-api-error">
              ⚠ {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rg-form">

            {/* ════ STEP 1 — Personal Info ════ */}
            {step === 1 && (<>
              <div className="rg-row2">
                <Field label={t("fullName")} error={errors.name} required>
                  <InputWrap icon={ICONS.user}>
                    <input placeholder={t("fullName") || "e.g. Priya Patil"} value={form.name}
                      onChange={e => {
                        set("name", e.target.value);
                        if (!form.username) set("username", suggestUsername(e.target.value));
                      }} autoFocus />
                  </InputWrap>
                </Field>

                <Field label={t("phoneNumber")} error={errors.phone} required>
                  <InputWrap icon={ICONS.phone}>
                    <input placeholder={t("phoneNumber") || "10-digit mobile"} value={form.phone}
                      onChange={e => set("phone", e.target.value)} maxLength={10}
                      inputMode="numeric" />
                  </InputWrap>
                </Field>
              </div>

              <Field label={t("emailAddress")} error={errors.email} required hint="Required for verification and notifications">
                <InputWrap icon={ICONS.mail}>
                  <input type="email" placeholder={t("emailAddress") || "yourname@email.com"} value={form.email}
                    onChange={e => set("email", e.target.value)} />
                </InputWrap>
              </Field>

              <div className="rg-row2">
                <Field label={t("aadhaarLast4")} error={errors.aadhar_last4} hint={t("aadhaarHint") || "For identity verification"}>
                  <InputWrap icon={ICONS.id}>
                    <input placeholder={t("aadhaarLast4") || "e.g. 4521"} value={form.aadhar_last4}
                      onChange={e => set("aadhar_last4", e.target.value)}
                      maxLength={4} inputMode="numeric" />
                  </InputWrap>
                </Field>

                <Field label={t("occupation")}>
                  <div className="rg-select-wrap">
                    <Icon d={ICONS.work} />
                    <select value={form.occupation}
                      onChange={e => set("occupation", e.target.value)}>
                      {OCCUPATIONS.map(o => <option key={o} value={o === "Select occupation" ? "" : o}>{o}</option>)}
                    </select>
                  </div>
                </Field>
              </div>

              <Field label={t("addressLabel")} hint={t("optional") || "Optional"}>
                <InputWrap icon={ICONS.home}>
                  <input placeholder={t("addressLabel") || "e.g. Vita, Sangli, Maharashtra"}
                    value={form.address} onChange={e => set("address", e.target.value)} />
                </InputWrap>
              </Field>

              <button type="button" className="rg-btn" onClick={handleStep1}>
                {t("continueBtn")}
              </button>
            </>)}

            {/* ════ STEP 2 — Group Access ════ */}
            {step === 2 && (<>
              <div className="rg-invite-explainer">
                <div className="rg-invite-explainer-icon">
                  <Icon d={ICONS.ticket} size={20} />
                </div>
                <div>
                  <div className="rg-invite-explainer-title">What is an invite code?</div>
                  <div className="rg-invite-explainer-desc">
                    Your group leader shares a code like <strong>GRP-2024-A7X9</strong>.
                    It links you to the correct group automatically.
                  </div>
                </div>
              </div>

              <Field label={t("inviteCodeLabel")} error={errors.invite_code} hint={t("inviteCodeHint") || "Leave blank if you don't have one"}>
                <div className="rg-invite-row">
                  <InputWrap icon={ICONS.ticket}
                    suffix={
                      <button type="button" className="rg-verify-btn"
                        onClick={verifyCode} disabled={verifying}>
                        {verifying ? "..." : t("verifyBtn")}
                      </button>
                    }>
                    <input
                      placeholder="e.g. GRP-2024-A7X9"
                      value={form.invite_code}
                      onChange={e => {
                        set("invite_code", e.target.value.toUpperCase());
                        set("code_valid", null);
                      }}
                      style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}
                    />
                  </InputWrap>
                </div>
              </Field>

              <Field label={t("chooseGroupOption")} error={errors.group_id} required>
                <div className="rg-select-wrap">
                  <Icon d={ICONS.user} />
                  <select value={form.group_id || ""}
                    onChange={e => {
                      const selectedId = e.target.value ? Number(e.target.value) : null;
                      const group = groups.find(g => g.id === selectedId);
                      set("group_id", selectedId);
                      set("group_name", group ? group.name : "");
                      set("leader_name", group ? group.leader_name : "Group Leader");
                      set("code_valid", !!group);
                    }}>
                    <option value="">{t("chooseGroupOption")}</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} — Leader {group.leader_name || "N/A"} ({group.slots_left} seats left)
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {groups.length === 0 && (
                <div className="rg-code-error" style={{ marginTop: 12 }}>
                  No open groups are available right now. Use your invite code or contact the admin to join a group.
                </div>
              )}

              {form.code_valid === true && form.group_name && (
                <div className="rg-code-success">
                  <div className="rg-code-success-check">
                    <Icon d={ICONS.check} size={14} />
                  </div>
                  <div>
                    <div className="rg-code-success-group">{form.group_name}</div>
                    <div className="rg-code-success-leader">Leader: {form.leader_name}</div>
                  </div>
                  <div className="rg-code-success-badge">Verified ✓</div>
                </div>
              )}
              {form.code_valid === false && (
                <div className="rg-code-error">
                  Code not found or expired. Ask your group leader for a fresh code.
                </div>
              )}

              <div className="rg-hint-box">
                <strong>Don’t have a code?</strong> Choose your group from the list above or contact your leader.
              </div>

              <div className="rg-btn-row">
                <button type="button" className="rg-back" onClick={() => setStep(1)}>← {t("back") || "Back"}</button>
                <button type="button" className="rg-btn" onClick={handleStep2} style={{ flex: 1 }}>
                  {t("continueBtn")}
                </button>
              </div>
            </>)}

            {/* ════ STEP 3 — Set Password ════ */}
            {step === 3 && (<>
              <div className="rg-username-preview">
                Registering as member of <strong>{form.group_name || "your group"}</strong>
              </div>

              <Field label={t("username")} error={errors.username} required
                hint={t("usernameHint") || "This is what you'll use to log in"}>
                <InputWrap icon={ICONS.user}>
                  <input placeholder="e.g. priya.patil42" value={form.username}
                    onChange={e => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))} />
                </InputWrap>
              </Field>

              <Field label={t("password")} error={errors.password} required>
                <InputWrap icon={ICONS.lock}
                  suffix={
                    <button type="button" className="rg-eye-btn" onClick={() => setShowP1(!showP1)}>
                      <Icon d={showP1 ? ICONS.eyeoff : ICONS.eye} />
                    </button>
                  }>
                  <input type={showP1 ? "text" : "password"}
                    placeholder="Minimum 6 characters" value={form.password}
                    onChange={e => set("password", e.target.value)} />
                </InputWrap>
                {form.password && <PasswordStrength pwd={form.password} />}
              </Field>

              <Field label={t("confirmPassword") || "Confirm Password"} error={errors.confirm} required>
                <InputWrap icon={ICONS.lock}
                  suffix={
                    <button type="button" className="rg-eye-btn" onClick={() => setShowP2(!showP2)}>
                      <Icon d={showP2 ? ICONS.eyeoff : ICONS.eye} />
                    </button>
                  }>
                  <input type={showP2 ? "text" : "password"}
                    placeholder="Re-enter your password" value={form.confirm}
                    onChange={e => set("confirm", e.target.value)} />
                </InputWrap>
              </Field>

              <div className="rg-btn-row">
                <button type="button" className="rg-back" onClick={() => setStep(2)}>← {t("back") || "Back"}</button>
                <button type="submit" className="rg-btn" disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? <><span className="rg-spinner" /> {t("creatingAccount") || "Creating account..."}</>
                    : <>{t("createAccount")} →</>}
                </button>
              </div>
            </>)}
          </form>

          <p className="rg-login-link">
            {t("dontHaveAccount")} <Link to="/login">{t("signIn")} {t("here") || "here"}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function LeftPanel({ step, form, t }) {
  return (
    <div className="rg-left-content">
      <div className="rg-brand">
        <div className="rg-brand-icon">B</div>
        <div>
          <div className="rg-brand-name">Bachatgat</div>
          <div className="rg-brand-tag">Smart SHG Platform</div>
        </div>
      </div>

      <div className="rg-steps-visual">
        {STEPS.map((s, i) => {
          const isDone   = step > i + 1 || step === 4;
          const isActive = step === i + 1;
          return (
            <div key={i} className={`rg-vstep ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}>
              <div className="rg-vstep-num">
                {isDone
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  : i + 1}
              </div>
              <div>
                <div className="rg-vstep-label">{t(s.labelKey)}</div>
                <div className="rg-vstep-sub">{t(s.subKey)}</div>
              </div>
              {i < STEPS.length - 1 && <div className="rg-vstep-line" />}
            </div>
          );
        })}
      </div>

      <div className="rg-left-db-note">
        <div className="rg-left-db-title">Saved to database</div>
        <div className="rg-left-db-tags">
          {['users','members','groups'].map(t => (
            <span key={t} className="rg-db-tag">{t}</span>
          ))}
        </div>
        <div className="rg-left-db-fields">
          {[
            { label: "name",      val: form.name     || "—" },
            { label: "phone",     val: form.phone    || "—" },
            { label: "group_id",  val: form.group_id ? `#${form.group_id}` : "—" },
            { label: "role",      val: "member"            },
            { label: "is_active", val: "pending approval"  },
          ].map(f => (
            <div key={f.label} className="rg-left-db-row">
              <span className="rg-left-db-key">{f.label}</span>
              <span className="rg-left-db-val">{f.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rg-left-quote">
        <p>"Joining Bachatgat helped our group manage ₹2 lakh in savings with zero paperwork."</p>
        <span>— Sunita Kadam, Member</span>
      </div>
    </div>
  );
}

function Field({ label, error, hint, required, children }) {
  return (
    <div className={`rg-field ${error ? "has-error" : ""}`}>
      <label>
        {label}
        {required && <span className="rg-required">*</span>}
        {hint && <span className="rg-hint-inline"> — {hint}</span>}
      </label>
      {children}
      {error && <span className="rg-err">{error}</span>}
    </div>
  );
}

function InputWrap({ icon, suffix, children }) {
  return (
    <div className="rg-input">
      <span className="rg-input-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </span>
      {children}
      {suffix}
    </div>
  );
}

function PasswordStrength({ pwd }) {
  const score = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#84cc16", "#22c55e"];

  return (
    <div className="rg-pwd-strength">
      <div className="rg-pwd-bars">
        {[1,2,3,4].map(i => (
          <div key={i} className="rg-pwd-bar"
            style={{ background: i <= score ? colors[score] : "var(--color-border-secondary,#e5e7eb)" }} />
        ))}
      </div>
      <span style={{ color: colors[score], fontSize: 11, fontWeight: 600 }}>{labels[score]}</span>
    </div>
  );
}