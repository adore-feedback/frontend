import { useState } from "react";
import { Link } from "react-router-dom";

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
  .adore-btn { width:100%;background:var(--ink);color:#fff;border:none;border-radius:8px;padding:13px;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .15s,box-shadow .2s;margin-top:4px; }
  .adore-btn:hover:not(:disabled) { background:#2d2926;box-shadow:0 6px 20px rgba(26,23,20,.22);transform:translateY(-1px); }
  .adore-btn:disabled { opacity:.5;cursor:not-allowed; }
  .adore-footer { text-align:center;font-size:.8rem;color:var(--muted);margin-top:24px; }
  .adore-link { color:var(--accent);font-weight:500;text-decoration:none;transition:color .2s; }
  .adore-link:hover { color:var(--ink);text-decoration:underline; }
`;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(data.message);
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
            <img src="/adore.jpeg" alt="Adore" />
            <div style={{ width: "1px", background: "var(--warm-mid)", alignSelf: "stretch" }} />
            <img src="/simtrak.png" alt="Simtrak" />
          </div>
          <h1 className="adore-title">Forgot password?</h1>
          <p className="adore-subtitle">We'll send you a reset link</p>
          <div className="adore-divider" />
          {success ? (
            <>
              <p className="adore-success">{success}</p>
              <p className="adore-footer" style={{ marginTop: 20 }}>
                <Link to="/login" className="adore-link">← Back to sign in</Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="adore-form">
              <div className="adore-field">
                <label className="adore-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  required
                  className="adore-input"
                />
              </div>
              {error && <p className="adore-error">{error}</p>}
              <button type="submit" disabled={loading} className="adore-btn">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
          {!success && (
            <p className="adore-footer">
              <Link to="/login" className="adore-link">← Back to sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;