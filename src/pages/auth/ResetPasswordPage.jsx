import { useState } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400&family=DM+Sans:wght@300;400;500&display=swap');
  .adore-root { --ink:#1a1714;--ivory:#f9f6f1;--warm-mid:#ede8df;--accent:#b07d4e;--muted:#8a8078;--danger:#c0392b;--card-bg:#ffffff;--radius:14px;font-family:'DM Sans',sans-serif; }
  .adore-root * { box-sizing:border-box;margin:0;padding:0; }
  .adore-shell { min-height:100vh;background-color:var(--ivory);display:flex;align-items:center;justify-content:center;padding:24px 16px; }
  .adore-card { width:100%;max-width:440px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--warm-mid);box-shadow:0 2px 4px rgba(26,23,20,.04),0 12px 40px rgba(26,23,20,.08);padding:48px 44px 40px;animation:fadeUp .55s cubic-bezier(.22,1,.36,1) both; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }
  .adore-logo-wrap { display:flex;justify-content:center;margin-bottom:32px; }
  .adore-logo-wrap img { height:40px;object-fit:contain; }
  .adore-title { font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400;color:var(--ink);text-align:center;letter-spacing:-.01em;line-height:1.1; }
  .adore-subtitle { font-size:.8rem;color:var(--muted);text-align:center;margin-top:6px;letter-spacing:.03em;text-transform:uppercase; }
  .adore-divider { height:1px;background:linear-gradient(to right,transparent,var(--warm-mid),transparent);margin:24px 0; }
  .adore-form { display:flex;flex-direction:column;gap:18px; }
  .adore-field { display:flex;flex-direction:column;gap:6px; }
  .adore-label { font-size:.73rem;font-weight:500;color:var(--ink);letter-spacing:.06em;text-transform:uppercase; }
  .adore-input { width:100%;background:var(--ivory);border:1px solid var(--warm-mid);border-radius:8px;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:.875rem;color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s,background .2s; }
  .adore-input::placeholder { color:var(--muted); }
  .adore-input:focus { border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px rgba(176,125,78,.12); }
  .adore-error { font-size:.8rem;color:var(--danger);background:rgba(192,57,43,.06);border:1px solid rgba(192,57,43,.15);border-radius:8px;padding:10px 14px; }
  .adore-success { font-size:.8rem;color:#2d6a4f;background:rgba(45,106,79,.07);border:1px solid rgba(45,106,79,.18);border-radius:8px;padding:10px 14px; }
  .adore-strength { height:3px;border-radius:2px;background:var(--warm-mid);margin-top:6px;overflow:hidden; }
  .adore-strength-fill { height:100%;border-radius:2px;transition:width .35s,background .35s; }
  .adore-btn { width:100%;background:var(--ink);color:#fff;border:none;border-radius:8px;padding:13px;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .15s,box-shadow .2s;margin-top:4px; }
  .adore-btn:hover:not(:disabled) { background:#2d2926;box-shadow:0 6px 20px rgba(26,23,20,.22);transform:translateY(-1px); }
  .adore-btn:disabled { opacity:.5;cursor:not-allowed; }
  .adore-footer { text-align:center;font-size:.8rem;color:var(--muted);margin-top:24px; }
  .adore-link { color:var(--accent);font-weight:500;text-decoration:none;transition:color .2s; }
  .adore-link:hover { color:var(--ink);text-decoration:underline; }
`;

function getStrength(pw) {
  if (!pw) return { width: "0%", color: "transparent" };
  if (pw.length < 4) return { width: "20%", color: "#c0392b" };
  if (pw.length < 7) return { width: "50%", color: "#e67e22" };
  if (pw.length < 10 || !/[^a-zA-Z0-9]/.test(pw)) return { width: "75%", color: "#f1c40f" };
  return { width: "100%", color: "#27ae60" };
}

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || searchParams.get("email") || "";
  const otp = location.state?.otp || searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  if (!otp || !email) {
    return (
      <div className="adore-root">
        <style>{STYLES}</style>
        <div className="adore-shell">
          <div className="adore-card">
            <p style={{ textAlign: "center", color: "var(--danger)", marginBottom: 16 }}>
              Invalid or missing reset session.
            </p>
            <p style={{ textAlign: "center" }}>
              <Link to="/forgot-password" className="adore-link">Request a new code</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      navigate("/login", { state: { message: "Password reset — please sign in." } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adore-root">
      <style>{STYLES}</style>
      <div className="adore-shell">
        <div className="adore-card">
          <div className="adore-logo-wrap" style={{ gap: "20px" }}>
            <img src="/adore.png" alt="Adore" />
            <div style={{ width: "1px", background: "var(--warm-mid)", alignSelf: "stretch" }} />
            <img src="/simtrak.png" alt="Simtrak" />
          </div>
          <h1 className="adore-title">New password</h1>
          <p className="adore-subtitle">Choose a strong password</p>
          <div className="adore-divider" />
          <form onSubmit={handleSubmit} className="adore-form">
            <div className="adore-field">
              <label className="adore-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Min. 6 chars"
                  required
                  className="adore-input"
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:0,color:"var(--muted)",fontSize:15 }}
                  tabIndex={-1}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {password && (
                <div className="adore-strength">
                  <div className="adore-strength-fill" style={{ width: strength.width, background: strength.color }} />
                </div>
              )}
            </div>
            <div className="adore-field">
              <label className="adore-label">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                  placeholder="Re-enter"
                  required
                  className="adore-input"
                  style={{
                    paddingRight: 40,
                    borderColor: confirm && confirm !== password ? "#c0392b"
                      : confirm && confirm === password ? "#27ae60" : undefined,
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:0,color:"var(--muted)",fontSize:15 }}
                  tabIndex={-1}>
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {error && <p className="adore-error">{error}</p>}
            <button type="submit" disabled={loading} className="adore-btn">
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
          <p className="adore-footer">
            <Link to="/login" className="adore-link">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;