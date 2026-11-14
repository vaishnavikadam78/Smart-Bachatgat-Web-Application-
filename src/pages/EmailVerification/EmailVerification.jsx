import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API } from "../../services/api";
import "./EmailVerification.css";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const verifyStarted = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Verification token not found");
      setLoading(false);
      return;
    }

    if (verifyStarted.current) return;
    verifyStarted.current = true;

    const verify = async () => {
      try {
        const res = await fetch(
          `${API}/auth/verify-email?token=${encodeURIComponent(token.trim())}`,
          { method: "POST", headers: { "Content-Type": "application/json" } }
        );
        const data = await res.json();
        if (res.ok) {
          setVerified(true);
          setTimeout(() => navigate("/login"), 3000);
        } else {
          setError(data.detail || "Verification failed");
        }
      } catch (e) {
        setError(e.message || "Could not verify email");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="email-verify-page">
      <div className="ev-container">
        <div className="ev-card">
          {loading && (
            <>
              <div className="ev-spinner"></div>
              <h1>Verifying Email...</h1>
              <p>Please wait while we verify your email address</p>
            </>
          )}

          {verified && !loading && (
            <>
              <div className="ev-success">✅</div>
              <h1>Email Verified!</h1>
              <p>Your email has been successfully verified.</p>
              <p className="ev-redirect">Redirecting to login...</p>
            </>
          )}

          {error && !loading && (
            <>
              <div className="ev-error">❌</div>
              <h1>Verification Failed</h1>
              <p>{error}</p>
              <button onClick={() => navigate("/login")} className="btn-primary">
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
