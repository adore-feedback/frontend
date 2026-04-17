import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  {
    to: "/admin",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: "/admin/forms/new",
    label: "Create Form",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    to: "/admin/result",
    label: "Results",
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const Navbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (item) =>
    item.exact
      ? location.pathname === item.to || location.pathname === "/admin"
      : location.pathname.startsWith(item.to);

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="nb-brand">
        <div>
          <span className="block text-[20px] font-extrabold text-slate-900 tracking-tight">
            Feedback Portal
          </span>

          <span className="block text-[12px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            Simtrak Solutions
          </span>

          {/* Your Image */}
          <img
            src="/simtrak.png" // change this
            alt="brand"
            className="mt-3 w-full rounded-lg object-cover"
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="nb-nav">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={`nb-link ${active ? "nb-link--active" : ""}`}
            >
              <span
                className={`nb-link-icon ${active ? "nb-link-icon--active" : ""}`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {active && <span className="nb-active-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer — auth hook preserved for future login */}
      <div className="nb-footer">
        {/* TODO: Replace with real auth user when authentication is added */}
        <button type="button" className="nb-signout-btn" aria-label="Sign out">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* ── Mobile top bar ── */}
      <header className="nb-mobile-header">
        <div className="nb-mobile-brand">
          <div className="nb-logo-mark nb-logo-mark--sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <span className="nb-mobile-title">Feedback Portal</span>
        </div>
        <button
          type="button"
          className="nb-hamburger"
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* ── Mobile overlay ── */}
      {isOpen && (
        <div className="nb-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* ── Sidebar (mobile: slide-in drawer | desktop: static) ── */}
      <aside className={`nb-sidebar ${isOpen ? "nb-sidebar--open" : ""}`}>
        <SidebarContent />
      </aside>
    </>
  );
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

/* ── Mobile Header ── */
.nb-mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 40;
    padding: 0 16px;
    height: 56px;
    background: #fff;
    border-bottom: 1px solid #e8ecf0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    font-family: 'DM Sans', system-ui, sans-serif;
}
.nb-mobile-brand { display: flex; align-items: center; gap: 9px; }
.nb-mobile-title  { font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }

/* ── Hamburger ── */
.nb-hamburger {
    width: 34px; height: 34px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e8ecf0;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #64748b;
    transition: background 0.15s;
}
.nb-hamburger:hover { background: #f1f5f9; }

/* ── Overlay ── */
.nb-overlay {
    position: fixed; inset: 0;
    background: rgba(15,23,42,0.45);
    backdrop-filter: blur(3px);
    z-index: 50;
    animation: nbFadeIn 0.2s ease;
}
@keyframes nbFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Sidebar ── */
.nb-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 240px;
    background: #fff;
    border-right: 1px solid #e8ecf0;
    display: flex;
    flex-direction: column;
    z-index: 60;
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
    font-family: 'DM Sans', system-ui, sans-serif;
    box-shadow: 4px 0 24px rgba(0,0,0,0.08);
}
.nb-sidebar--open { transform: translateX(0); }

/* Desktop: sidebar is always visible, static */
@media (min-width: 768px) {
    .nb-mobile-header { display: none !important; }
    .nb-overlay        { display: none !important; }
    .nb-sidebar {
        position: relative !important;
        transform: none !important;
        width: 240px !important;
        height: 100vh !important;
        flex-shrink: 0 !important;
        box-shadow: none !important;
    }
}

/* ── Brand ── */
.nb-brand {
    display: flex; align-items: center; gap: 10px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid #f1f5f9;
}
.nb-logo-mark {
    width: 32px; height: 32px; border-radius: 9px;
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.nb-logo-mark--sm { width: 28px; height: 28px; border-radius: 7px; }
.nb-brand-name {
    display: block;
    font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;
}
.nb-brand-tag {
    display: block;
    font-size: 9px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px;
}

/* ── Nav ── */
.nb-nav {
    flex: 1;
    padding: 10px 10px 0;
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto;
}
.nb-link {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    border-radius: 9px;
    font-size: 13px; font-weight: 600; color: #64748b;
    text-decoration: none;
    transition: background 0.13s, color 0.13s;
    position: relative;
}
.nb-link:hover { background: #f8fafc; color: #0f172a; }
.nb-link--active { background: #eff6ff; color: #1d4ed8; font-weight: 700; }
.nb-link-icon { flex-shrink: 0; color: #94a3b8; transition: color 0.13s; }
.nb-link-icon--active { color: #3b82f6; }
.nb-active-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #3b82f6; margin-left: auto; flex-shrink: 0;
}

/* ── Footer ── */
.nb-footer {
    padding: 12px 12px 18px;
    border-top: 1px solid #f1f5f9;
    margin-top: auto;
}
.nb-signout-btn {
    display: flex; align-items: center; gap: 8px;
    width: 100%;
    padding: 9px 12px; border-radius: 8px;
    font-size: 11px; font-weight: 700; color: #94a3b8;
    background: none; border: none; cursor: pointer;
    text-transform: uppercase; letter-spacing: 0.06em;
    transition: color 0.15s, background 0.15s;
    font-family: 'DM Sans', system-ui, sans-serif;
}
.nb-signout-btn:hover { color: #ef4444; background: #fff5f5; }
`;

export default Navbar;
