import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ─── inline styles injected once ─────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  .adore-root {
    --ink:       #1a1714;
    --ivory:     #f9f6f1;
    --warm-mid:  #ede8df;
    --accent:    #b07d4e;
    --accent-lt: #d4a97a;
    --muted:     #8a8078;
    --danger:    #c0392b;
    --card-bg:   #ffffff;
    --radius:    14px;
    font-family: 'DM Sans', sans-serif;
  }

  .adore-root * { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── page shell ── */
  .adore-shell {
    min-height: 100vh;
    background-color: var(--ivory);
    background-image:
      radial-gradient(ellipse 80% 60% at 20% 0%, rgba(176,125,78,.10) 0%, transparent 70%),
      radial-gradient(ellipse 60% 50% at 80% 100%, rgba(176,125,78,.07) 0%, transparent 70%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }

  /* ── card ── */
  .adore-card {
    width: 100%;
    max-width: 440px;
    background: var(--card-bg);
    border-radius: var(--radius);
    border: 1px solid var(--warm-mid);
    box-shadow:
      0 2px 4px rgba(26,23,20,.04),
      0 12px 40px rgba(26,23,20,.08);
    padding: 48px 44px 40px;
    animation: fadeUp .55s cubic-bezier(.22,1,.36,1) both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── logo area ── */
  .adore-logo-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
    animation: fadeUp .55s .08s cubic-bezier(.22,1,.36,1) both;
  }
  .adore-logo-wrap img {
    height: 40px;
    object-fit: contain;
  }

  /* ── headings ── */
  .adore-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 2rem;
    font-weight: 400;
    color: var(--ink);
    text-align: center;
    letter-spacing: -.01em;
    line-height: 1.1;
    animation: fadeUp .55s .12s cubic-bezier(.22,1,.36,1) both;
  }
  .adore-subtitle {
    font-size: .8rem;
    color: var(--muted);
    text-align: center;
    margin-top: 6px;
    letter-spacing: .03em;
    text-transform: uppercase;
    animation: fadeUp .55s .16s cubic-bezier(.22,1,.36,1) both;
  }

  /* ── divider ── */
  .adore-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, var(--warm-mid), transparent);
    margin: 24px 0;
    animation: fadeUp .55s .18s cubic-bezier(.22,1,.36,1) both;
  }

  /* ── form ── */
  .adore-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    animation: fadeUp .55s .22s cubic-bezier(.22,1,.36,1) both;
  }

  .adore-field { display: flex; flex-direction: column; gap: 6px; }

  .adore-label {
    font-size: .73rem;
    font-weight: 500;
    color: var(--ink);
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .adore-input {
    width: 100%;
    background: var(--ivory);
    border: 1px solid var(--warm-mid);
    border-radius: 8px;
    padding: 11px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: .875rem;
    color: var(--ink);
    outline: none;
    transition: border-color .2s, box-shadow .2s, background .2s;
  }
  .adore-input::placeholder { color: var(--muted); }
  .adore-input:focus {
    border-color: var(--accent);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(176,125,78,.12);
  }

  /* ── error ── */
  .adore-error {
    font-size: .8rem;
    color: var(--danger);
    background: rgba(192,57,43,.06);
    border: 1px solid rgba(192,57,43,.15);
    border-radius: 8px;
    padding: 10px 14px;
  }

  /* ── submit button ── */
  .adore-btn {
    width: 100%;
    background: var(--ink);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 13px;
    font-family: 'DM Sans', sans-serif;
    font-size: .85rem;
    font-weight: 500;
    letter-spacing: .06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background .2s, transform .15s, box-shadow .2s;
    margin-top: 4px;
    position: relative;
    overflow: hidden;
  }
  .adore-btn:hover:not(:disabled) {
    background: #2d2926;
    box-shadow: 0 6px 20px rgba(26,23,20,.22);
    transform: translateY(-1px);
  }
  .adore-btn:active:not(:disabled) { transform: translateY(0); }
  .adore-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── footer link ── */
  .adore-footer {
    text-align: center;
    font-size: .8rem;
    color: var(--muted);
    margin-top: 24px;
    animation: fadeUp .55s .28s cubic-bezier(.22,1,.36,1) both;
  }
  .adore-link {
    color: var(--accent);
    font-weight: 500;
    text-decoration: none;
    transition: color .2s;
  }
  .adore-link:hover { color: var(--ink); text-decoration: underline; }

  /* ── registered banner ── */
  .adore-banner {
    font-size: .8rem;
    color: #2d6a4f;
    background: rgba(45,106,79,.07);
    border: 1px solid rgba(45,106,79,.18);
    border-radius: 8px;
    padding: 10px 14px;
    text-align: center;
  }
`;

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const getRoleBasePath = (role) => {
    if (role === "super_admin") return "/super_admin";
    if (role === "admin") return "/admin";
    return "/manager";
  };
  const justRegistered = location.state?.registered;

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loggedInUser = await login(form.email, form.password);
      const destination =
        location.state?.from?.pathname || getRoleBasePath(loggedInUser.role);
      navigate(destination, { replace: true });
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
          {/* Logo */}
          <div
            className="adore-logo-wrap"
            style={{ gap: "20px", marginBottom: "32px" }}
          >
            <img src="/adore.jpeg" alt="Adore" />
            <div
              style={{
                width: "1px",
                background: "var(--warm-mid)",
                alignSelf: "stretch",
              }}
            />
            <img src="/simtrak.png" alt="Simtrak" />
          </div>

          {/* Heading */}
          <h1 className="adore-title">Welcome back</h1>
          <p className="adore-subtitle">Sign in to continue</p>

          <div className="adore-divider" />

          {/* Success banner after registration */}
          {justRegistered && (
            <p className="adore-banner" style={{ marginBottom: 16 }}>
              Account created — please sign in.
            </p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="adore-form">
            <div className="adore-field">
              <label className="adore-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="adore-input"
              />
            </div>

            <div className="adore-field">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label className="adore-label">Password</label>
                <Link
                  to="/forgot-password"
                  className="adore-link"
                  style={{ fontSize: ".75rem" }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="adore-input"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--muted)",
                    fontSize: 15,
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && <p className="adore-error">{error}</p>}

            <button type="submit" disabled={loading} className="adore-btn">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <p className="adore-footer">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="adore-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
