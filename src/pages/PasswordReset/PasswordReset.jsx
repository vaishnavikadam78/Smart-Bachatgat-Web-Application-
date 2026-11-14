import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../services/api";
import "./PasswordReset.css";

export default function PasswordReset() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email, otp, password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendOTP = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("OTP sent to your email! ✅");
        setStep("otp");
      } else {
        showToast(data.detail || "Failed to send OTP", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!otp) {
      setErrors({ otp: "OTP is required" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("OTP verified! ✅");
        setStep("password");
      } else {
        showToast(data.detail || "Invalid OTP", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setErrors({});
    const errs = {};
    if (!password) errs.password = "Password is required";
    if (!confirmPassword) errs.confirmPassword = "Confirm password is required";
    if (password && password.length < 6) errs.password = "Password must be at least 6 characters";
    if (password && confirmPassword && password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: password })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Password reset successful! ✅ Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        showToast(data.detail || "Reset failed", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-page">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="pr-container">
        <div className="pr-card">
          <h1>🔐 Password Reset</h1>
          <p className="pr-subtitle">Reset your account password</p>

          {step === "email" && (
            <form onSubmit={sendOTP} className="pr-form">
              <h2>Enter Your Email</h2>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={errors.email ? "error" : ""}
                />
                {errors.email && <p className="error-msg">{errors.email}</p>}
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "⏳ Sending OTP..." : "Send OTP"}
              </button>
              <p className="pr-footer">
                Remember password? <a href="/login">Login here</a>
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOTP} className="pr-form">
              <h2>Enter OTP</h2>
              <p className="pr-description">Enter the OTP sent to {email}</p>
              <div className="form-group">
                <label>OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  maxLength="6"
                  className={errors.otp ? "error" : ""}
                />
                {errors.otp && <p className="error-msg">{errors.otp}</p>}
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "⏳ Verifying..." : "Verify OTP"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep("email")}>
                Back
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={resetPassword} className="pr-form">
              <h2>Set New Password</h2>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={errors.password ? "error" : ""}
                />
                {errors.password && <p className="error-msg">{errors.password}</p>}
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className={errors.confirmPassword ? "error" : ""}
                />
                {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword}</p>}
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "⏳ Resetting..." : "Reset Password"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep("otp")}>
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
