import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/* ─── shared style block (same design system as LoginPage) ─────────────────── */
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

  .adore-shell {
    min-height: 100vh;
    background-color: var(--ivory);
    background-image:
      radial-gradient(ellipse 80% 60% at 80% 0%, rgba(176,125,78,.10) 0%, transparent 70%),
      radial-gradient(ellipse 60% 50% at 20% 100%, rgba(176,125,78,.07) 0%, transparent 70%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }

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

  .adore-logo-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
    animation: fadeUp .55s .08s cubic-bezier(.22,1,.36,1) both;
  }
  .adore-logo-wrap img { height: 40px; object-fit: contain; }

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

  /* role badge */
  .adore-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(176,125,78,.1);
    border: 1px solid rgba(176,125,78,.22);
    color: var(--accent);
    font-size: .72rem;
    font-weight: 500;
    letter-spacing: .05em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 20px;
  }
  .adore-badge-wrap {
    display: flex;
    justify-content: center;
    margin-top: 10px;
    animation: fadeUp .55s .18s cubic-bezier(.22,1,.36,1) both;
  }

  .adore-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, var(--warm-mid), transparent);
    margin: 24px 0;
    animation: fadeUp .55s .20s cubic-bezier(.22,1,.36,1) both;
  }

  .adore-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    animation: fadeUp .55s .24s cubic-bezier(.22,1,.36,1) both;
  }

  /* two-column row */
  .adore-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
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

  /* password strength bar */
  .adore-strength {
    height: 3px;
    border-radius: 2px;
    background: var(--warm-mid);
    margin-top: 6px;
    overflow: hidden;
  }
  .adore-strength-fill {
    height: 100%;
    border-radius: 2px;
    transition: width .35s, background .35s;
  }

  .adore-error {
    font-size: .8rem;
    color: var(--danger);
    background: rgba(192,57,43,.06);
    border: 1px solid rgba(192,57,43,.15);
    border-radius: 8px;
    padding: 10px 14px;
  }

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
  }
  .adore-btn:hover:not(:disabled) {
    background: #2d2926;
    box-shadow: 0 6px 20px rgba(26,23,20,.22);
    transform: translateY(-1px);
  }
  .adore-btn:active:not(:disabled) { transform: translateY(0); }
  .adore-btn:disabled { opacity: .5; cursor: not-allowed; }

  .adore-footer {
    text-align: center;
    font-size: .8rem;
    color: var(--muted);
    margin-top: 24px;
    animation: fadeUp .55s .30s cubic-bezier(.22,1,.36,1) both;
  }
  .adore-link {
    color: var(--accent);
    font-weight: 500;
    text-decoration: none;
    transition: color .2s;
  }
  .adore-link:hover { color: var(--ink); text-decoration: underline; }
`;

/* Simple password-strength helper (visual only) */
function getStrength(pw) {
  if (!pw) return { width: "0%", color: "transparent", label: "" };
  if (pw.length < 4) return { width: "20%", color: "#c0392b", label: "Weak" };
  if (pw.length < 7) return { width: "50%", color: "#e67e22", label: "Fair" };
  if (pw.length < 10 || !/[^a-zA-Z0-9]/.test(pw))
    return { width: "75%", color: "#f1c40f", label: "Good" };
  return { width: "100%", color: "#27ae60", label: "Strong" };
}

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.password);

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
          <h1 className="adore-title">Create your account</h1>
          <p className="adore-subtitle">You'll be added as</p>
          <div className="adore-badge-wrap">
            <span className="adore-badge">✦ Manager of the Portal</span>
          </div>

          <div className="adore-divider" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="adore-form">
            <div className="adore-field">
              <label className="adore-label">Full name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your Name"
                required
                className="adore-input"
              />
            </div>

            <div className="adore-field">
              <label className="adore-label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="yourmail@example.com"
                required
                className="adore-input"
              />
            </div>

            {/* Passwords side-by-side */}
            <div className="adore-row">
              <div className="adore-field">
                <label className="adore-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 chars"
                  required
                  className="adore-input"
                />
                {form.password && (
                  <div className="adore-strength">
                    <div
                      className="adore-strength-fill"
                      style={{
                        width: strength.width,
                        background: strength.color,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="adore-field">
                <label className="adore-label">Confirm</label>
                <input
                  type="password"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Re-enter"
                  required
                  className="adore-input"
                  style={{
                    borderColor:
                      form.confirm && form.confirm !== form.password
                        ? "#c0392b"
                        : form.confirm && form.confirm === form.password
                          ? "#27ae60"
                          : undefined,
                  }}
                />
              </div>
            </div>

            {error && <p className="adore-error">{error}</p>}

            <button type="submit" disabled={loading} className="adore-btn">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          {/* Footer */}
          <p className="adore-footer">
            Already have an account?{" "}
            <Link to="/login" className="adore-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
