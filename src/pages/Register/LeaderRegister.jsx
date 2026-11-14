import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API } from "../../services/api";
import "./Register.css"; // same CSS as Register.jsx

/* ── API Base URL ── */

/* ── SVG Icons (same as Register.jsx) ── */
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  user:   "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mail:   "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  lock:   "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  id:     "M10 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM10 2v6h6M9 13h6M9 17h4",
  work:   "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  home:   "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  org:    "M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7H3l2-4h14l2 4",
  ngo:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  map:    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeoff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  check:  "M20 6L9 17l-5-5",
};

/* ── Maharashtra Organizations ── */
const ORGANIZATIONS = [
  { id: "", name: "Select Organization" },
  { id: "mavim",      name: "MAVIM (Mahila Arthik Vikas Mahamandal)" },
  { id: "msrlm",     name: "MSRLM (Maharashtra State Rural Livelihoods Mission)" },
  { id: "chaitanya", name: "Chaitanya - Rural Development Organisation" },
  { id: "ssp",       name: "Swayam Shikshan Prayog (SSP)" },
  { id: "pragati",   name: "Pragati Pratisthan" },
  { id: "grameen",   name: "Grameen Mahila Sanstha" },
  { id: "stree",     name: "Stree Shakti Mandal" },
  { id: "nabard",    name: "NABARD - Sponsored SHG" },
  { id: "other",     name: "Other" },
];

/* ── NGOs under each Organization (Maharashtra based) ── */
const NGOS = {
  mavim:      ["MAVIM Pune Division", "MAVIM Nashik Division", "MAVIM Aurangabad Division", "MAVIM Amravati Division", "MAVIM Nagpur Division", "MAVIM Konkan Division"],
  msrlm:      ["MSRLM Sangli Unit", "MSRLM Kolhapur Unit", "MSRLM Solapur Unit", "MSRLM Satara Unit"],
  chaitanya:  ["Chaitanya Pune", "Chaitanya Sangli", "Chaitanya Kolhapur", "Chaitanya Satara"],
  ssp:        ["SSP Osmanabad", "SSP Latur", "SSP Nanded", "SSP Hingoli"],
  pragati:    ["Pragati Nashik", "Pragati Ahmednagar", "Pragati Jalgaon"],
  grameen:    ["Grameen Wardha", "Grameen Yavatmal", "Grameen Akola"],
  stree:      ["Stree Shakti Pune", "Stree Shakti Mumbai", "Stree Shakti Thane"],
  nabard:     ["NABARD Pune Region", "NABARD Nashik Region", "NABARD Aurangabad Region", "NABARD Amravati Region"],
  other:      ["Other NGO"],
};

/* ── Maharashtra Talukas ── */
const TALUKAS = [
  "Select Taluka",
  "Pune", "Haveli", "Mulshi", "Maval", "Velhe", "Bhor", "Purandar", "Shirur", "Baramati", "Daund", "Indapur",
  "Nashik", "Igatpuri", "Trimbakeshwar", "Sinnar", "Niphad", "Dindori", "Chandwad",
  "Sangli", "Miraj", "Vita", "Tasgaon", "Islampur", "Atpadi", "Palus", "Kadegaon",
  "Kolhapur", "Hatkanangale", "Panhala", "Shahuwadi", "Radhanagari",
  "Satara", "Karad", "Patan", "Wai", "Khandala", "Phaltan",
  "Solapur", "Akkalkot", "Mangalwedha", "Pandharpur", "Barshi", "Mohol",
  "Aurangabad", "Paithan", "Sillod", "Kannad", "Vaijapur",
  "Nagpur", "Kamthi", "Ramtek", "Hingna", "Parseoni",
  "Nanded", "Mukhed", "Biloli", "Kandhar", "Deglur",
  "Latur", "Udgir", "Nilanga", "Ausa", "Chakur",
  "Wardha", "Hinganghat", "Arvi", "Deoli", "Seloo",
  "Amravati", "Achalpur", "Anjangaon", "Daryapur", "Chandur",
  "Thane", "Kalyan", "Murbad", "Shahapur", "Bhiwandi",
  "Ratnagiri", "Chiplun", "Dapoli", "Guhagar", "Khed",
  "Other",
];

const OCCUPATIONS = [
  "Select occupation","Farmer","Shopkeeper","Homemaker",
  "Teacher","Tailor","Daily Wage Worker","Small Business Owner",
  "Health Worker","Self Employed","Other",
];

const STEPS = [
  { label: "Personal Info",    sub: "Your basic details"        },
  { label: "Organization",     sub: "Select your Org & Taluka"  },
  { label: "Set Password",     sub: "Secure your account"       },
];

export default function LeaderRegister() {
  const navigate = useNavigate();

  const [step,      setStep]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [showP1,    setShowP1]    = useState(false);
  const [showP2,    setShowP2]    = useState(false);
  const [apiError,  setApiError]  = useState("");
  const [groups,    setGroups]    = useState([]);
  const [response,  setResponse]  = useState(null);    // Store registration response

  const [form, setForm] = useState({
    name:          "",
    phone:         "",
    email:         "",
    aadhar_last4:  "",
    occupation:    "",
    address:       "",
    organization:  "",
    ngo:           "",
    taluka:        "",
    group_id:      null,
    group_name:    "",
    username:      "",
    password:      "",
    confirm:       "",
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
        const available = Array.isArray(data) ? data.filter(g => !g.leader_id) : [];
        setGroups(available);
      } catch {
        // ignore group list failure
      }
    };
    loadGroups();
  }, []);

  const suggestUsername = (name) => {
    const base = name.trim().toLowerCase().replace(/\s+/g, ".");
    return base ? base + Math.floor(Math.random() * 90 + 10) : "";
  };

  /* ── Validations ── */
  const validate1 = () => {
    const e = {};
    if (!form.name.trim())                         e.name  = "Full name is required";
    if (!form.phone.match(/^[6-9]\d{9}$/))         e.phone = "Enter valid 10-digit mobile number";
    if (form.email && !form.email.includes("@"))   e.email = "Enter a valid email address";
    if (form.aadhar_last4 && !/^\d{4}$/.test(form.aadhar_last4))
                                                    e.aadhar_last4 = "Enter last 4 digits only";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e = {};
    if (!form.organization)       e.organization = "Please select an organization";
    if (!form.ngo)                e.ngo          = "Please select an NGO";
    if (!form.taluka || form.taluka === "Select Taluka") e.taluka = "Please select a taluka";
    if (!form.group_id && !form.group_name.trim())  e.group_name   = "Please select or enter a group name";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate3 = () => {
    const e = {};
    if (!form.username.trim())         e.username = "Username is required";
    if (form.username.includes(" "))   e.username = "No spaces in username";
    if (form.password.length < 6)      e.password = "Minimum 6 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1 = () => { if (validate1()) setStep(2); };
  const handleStep2 = () => { if (validate2()) setStep(3); };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate3()) return;

    // Race-guard: ensure selected group still has no leader
    if (form.group_id) {
      const sel = groups.find(g => Number(g.id) === Number(form.group_id));
      if (sel && sel.leader_id) {
        setErrors(er => ({ ...er, group_name: "This group already has a leader" }));
        setApiError("Selected group already has a leader. Choose another group or create a new one.");
        return;
      }
    }

    setLoading(true);
    setApiError("");

    try {
      const res = await fetch(`${API}/auth/register-leader`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          form.name,
          phone:         form.phone,
          email:         form.email         || null,
          aadhar_last4:  form.aadhar_last4  || null,
          occupation:    form.occupation    || null,
          address:       form.address       || null,
          organization:  form.organization,
          ngo:           form.ngo,
          taluka:        form.taluka,
          group_id:      form.group_id,
          group_name:    form.group_name,
          username:      form.username,
          password:      form.password,
          role:          "leader",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResponse(data); // Store response for success screen
        setStep(4);
      } else {
        setApiError(data.detail || "Registration failed. Please try again.");
      }
    } catch {
      setApiError("Cannot connect to server. Make sure backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success Screen ── */
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
          <h2>Leader Account Created!</h2>
          <p>Welcome to <strong>SmartBachatgat</strong>. Your account is pending approval by the Admin.</p>
          <div className="rg-success-group">
            <div className="rg-success-group-label">Your Group</div>
            <div className="rg-success-group-name">{form.group_name}</div>
            <div className="rg-success-group-leader">{form.ngo} — {form.taluka} Taluka</div>
          </div>
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
        <LeftPanel step={step} form={form} />
      </div>

      <div className="rg-right">
        <div className="rg-form-wrap">
          <div className="rg-header">
            <h2>Register as Leader</h2>
            <p>Step {step} of 3 — {STEPS[step - 1].label}</p>
          </div>

          <div className="rg-progress">
            <div className="rg-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
          </div>

          {apiError && (
            <div className="rg-api-error">
              ⚠ {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="rg-form">

            {/* ════ STEP 1 — Personal Info ════ */}
            {step === 1 && (<>
              <div className="rg-row2">
                <Field label="Full Name" error={errors.name} required>
                  <InputWrap icon={ICONS.user}>
                    <input placeholder="e.g. Sunita Patil" value={form.name}
                      onChange={e => {
                        set("name", e.target.value);
                        if (!form.username) set("username", suggestUsername(e.target.value));
                      }} autoFocus />
                  </InputWrap>
                </Field>

                <Field label="Phone Number" error={errors.phone} required>
                  <InputWrap icon={ICONS.phone}>
                    <input placeholder="10-digit mobile" value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      maxLength={10} inputMode="numeric" />
                  </InputWrap>
                </Field>
              </div>

              <Field label="Email Address" error={errors.email} hint="Optional">
                <InputWrap icon={ICONS.mail}>
                  <input type="email" placeholder="yourname@email.com" value={form.email}
                    onChange={e => set("email", e.target.value)} />
                </InputWrap>
              </Field>

              <div className="rg-row2">
                <Field label="Aadhaar (last 4 digits)" error={errors.aadhar_last4} hint="Optional">
                  <InputWrap icon={ICONS.id}>
                    <input placeholder="e.g. 4521" value={form.aadhar_last4}
                      onChange={e => set("aadhar_last4", e.target.value)}
                      maxLength={4} inputMode="numeric" />
                  </InputWrap>
                </Field>

                <Field label="Occupation">
                  <div className="rg-select-wrap">
                    <Icon d={ICONS.work} />
                    <select value={form.occupation}
                      onChange={e => set("occupation", e.target.value)}>
                      {OCCUPATIONS.map(o => (
                        <option key={o} value={o === "Select occupation" ? "" : o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>

              <Field label="Village / Address" hint="Optional">
                <InputWrap icon={ICONS.home}>
                  <input placeholder="e.g. Vita, Sangli, Maharashtra"
                    value={form.address} onChange={e => set("address", e.target.value)} />
                </InputWrap>
              </Field>

              <button type="button" className="rg-btn" onClick={handleStep1}>
                Continue →
              </button>
            </>)}

            {/* ════ STEP 2 — Organization ════ */}
            {step === 2 && (<>
              <div className="rg-invite-explainer">
                <div className="rg-invite-explainer-icon">
                  <Icon d={ICONS.org} size={20} />
                </div>
                <div>
                  <div className="rg-invite-explainer-title">Select your Organization & Taluka</div>
                  <div className="rg-invite-explainer-desc">
                    Choose the organization you are working under, select your NGO and taluka, then enter your group name.
                  </div>
                </div>
              </div>

              {/* Organization */}
              <Field label="Organization" error={errors.organization} required>
                <div className="rg-select-wrap">
                  <Icon d={ICONS.org} />
                  <select value={form.organization}
                    onChange={e => {
                      set("organization", e.target.value);
                      set("ngo", ""); // reset NGO when org changes
                    }}>
                    {ORGANIZATIONS.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* NGO — shows only after org selected */}
              {form.organization && (
                <Field label="NGO / Federation" error={errors.ngo} required>
                  <div className="rg-select-wrap">
                    <Icon d={ICONS.ngo} />
                    <select value={form.ngo}
                      onChange={e => set("ngo", e.target.value)}>
                      <option value="">Select NGO</option>
                      {(NGOS[form.organization] || []).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </Field>
              )}

              {/* Taluka */}
              <Field label="Taluka" error={errors.taluka} required>
                <div className="rg-select-wrap">
                  <Icon d={ICONS.map} />
                  <select value={form.taluka}
                    onChange={e => set("taluka", e.target.value)}>
                    {TALUKAS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Choose Existing Group" hint="Optional — select a pre-created group">
                <div className="rg-select-wrap">
                  <Icon d={ICONS.user} />
                  <select value={form.group_id || ""}
                    onChange={e => {
                      const groupId = e.target.value ? Number(e.target.value) : null;
                      const selected = groups.find(g => g.id === groupId);
                      set("group_id", groupId);
                      if (selected) {
                        set("group_name", selected.name);
                      } else {
                        set("group_name", "");
                      }
                    }}>
                    <option value="">Create a new group instead</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.slots_left} seats available)
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Your Group Name" error={errors.group_name} required
                hint="The bachatgat you will lead">
                <InputWrap icon={ICONS.user}>
                  <input placeholder="e.g. Asha Mahila Bachatgat"
                    value={form.group_name}
                    onChange={e => set("group_name", e.target.value)}
                    disabled={!!form.group_id} />
                </InputWrap>
              </Field>

              {/* Preview card */}
              {form.organization && form.ngo && form.taluka && form.taluka !== "Select Taluka" && (
                <div className="rg-code-success">
                  <div className="rg-code-success-check">
                    <Icon d={ICONS.check} size={14} />
                  </div>
                  <div>
                    <div className="rg-code-success-group">{form.ngo}</div>
                    <div className="rg-code-success-leader">{form.taluka} Taluka</div>
                  </div>
                  <div className="rg-code-success-badge">Selected ✓</div>
                </div>
              )}

              <div className="rg-btn-row">
                <button type="button" className="rg-back" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="rg-btn" onClick={handleStep2} style={{ flex: 1 }}>
                  Continue →
                </button>
              </div>
            </>)}

            {/* ════ STEP 3 — Set Password ════ */}
            {step === 3 && (<>
              <div className="rg-username-preview">
                Registering as leader of <strong>{form.group_name || "your group"}</strong> under <strong>{form.ngo || "your NGO"}</strong>
              </div>

              <Field label="Username" error={errors.username} required
                hint="Used to log in">
                <InputWrap icon={ICONS.user}>
                  <input placeholder="e.g. sunita.patil42" value={form.username}
                    onChange={e => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))} />
                </InputWrap>
              </Field>

              <Field label="Create Password" error={errors.password} required>
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

              <Field label="Confirm Password" error={errors.confirm} required>
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
                <button type="button" className="rg-back" onClick={() => setStep(2)}>← Back</button>
                <button type="submit" className="rg-btn" disabled={loading} style={{ flex: 1 }}>
                  {loading
                    ? <><span className="rg-spinner" /> Creating account...</>
                    : "Create Leader Account →"}
                </button>
              </div>
            </>)}
          </form>

          <p className="rg-login-link">
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
          <p className="rg-login-link" style={{ marginTop: 6 }}>
            Registering as member? <Link to="/register">Member Registration</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components (same pattern as Register.jsx) ── */

function LeftPanel({ step, form }) {
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
                <div className="rg-vstep-label">{s.label}</div>
                <div className="rg-vstep-sub">{s.sub}</div>
              </div>
              {i < STEPS.length - 1 && <div className="rg-vstep-line" />}
            </div>
          );
        })}
      </div>

      <div className="rg-left-db-note">
        <div className="rg-left-db-title">Saved to database</div>
        <div className="rg-left-db-tags">
          {["users", "leaders", "groups", "organizations"].map(t => (
            <span key={t} className="rg-db-tag">{t}</span>
          ))}
        </div>
        <div className="rg-left-db-fields">
          {[
            { label: "name",         val: form.name         || "—" },
            { label: "phone",        val: form.phone        || "—" },
            { label: "organization", val: form.organization || "—" },
            { label: "ngo",          val: form.ngo          || "—" },
            { label: "taluka",       val: form.taluka       || "—" },
            { label: "role",         val: "leader"                  },
            { label: "is_active",    val: "pending approval"        },
          ].map(f => (
            <div key={f.label} className="rg-left-db-row">
              <span className="rg-left-db-key">{f.label}</span>
              <span className="rg-left-db-val">{f.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rg-left-quote">
        <p>"As a group leader, SmartBachatgat made it easy to manage savings and loans for all my members."</p>
        <span>— Meena Shinde, Group Leader, Sangli</span>
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