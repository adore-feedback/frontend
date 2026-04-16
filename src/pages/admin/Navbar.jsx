import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
    { to: '/admin',            label: 'Dashboard', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
    ), exact: true },
    { to: '/admin/forms/new',  label: 'Create Form', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
    ) },
    { to: '/admin/result',     label: 'Results', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    ) },
];

const Navbar = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const isActive = (item) => {
        if (item.exact) return location.pathname === item.to || location.pathname === '/admin';
        return location.pathname.startsWith(item.to);
    };

    return (
        <>
            <style>{CSS}</style>

            {/* Mobile Top Header */}
            <header style={MOBILE_HEADER}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={S.logoMark}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                    </div>
                    <span style={S.mobileBrand}>Simtrak</span>
                </div>
                <button type="button" onClick={() => setIsOpen(o => !o)} style={S.hamburger} aria-label={isOpen?'Close menu':'Open menu'}>
                    {isOpen ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    )}
                </button>
            </header>

            {/* Mobile Overlay */}
            {isOpen && (
                <div style={S.overlay} onClick={() => setIsOpen(false)}/>
            )}

            {/* Sidebar */}
            <aside style={{
                ...S.sidebar,
                ...(isOpen ? S.sidebarOpen : {}),
            }}>
                {/* Brand */}
                <div style={S.brand}>
                    <div style={S.logoMark}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                    </div>
                    <div>
                        <span style={S.brandName}>Simtrak Solutions</span>
                        <span style={S.brandTag}>Feedback Portal</span>
                    </div>
                </div>

                {/* Logo Image */}
                <div style={S.logoWrap}>
                    <img
                        src="/simtrak.png"
                        alt="Simtrak Solutions"
                        style={S.logoImg}
                        onError={e => { e.target.src = 'https://via.placeholder.com/200x80?text=Simtrak'; }}
                    />
                </div>

                {/* Nav Items */}
                <nav style={{flex:1,padding:'0 12px',display:'flex',flexDirection:'column',gap:4}}>
                    {NAV_ITEMS.map(item => {
                        const active = isActive(item);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    ...S.navLink,
                                    ...(active ? S.navLinkActive : {}),
                                }}
                            >
                                <span style={{
                                    ...S.navIcon,
                                    color: active ? '#3b82f6' : '#94a3b8',
                                }}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                                {active && <span style={S.activeDot}/>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div style={S.footer}>
                    <div style={S.footerBadge}>
                        <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div style={{minWidth:0}}>
                            <p style={{fontSize:13,fontWeight:700,color:'#0f172a',margin:0}}>Admin</p>
                            <p style={{fontSize:10,color:'#94a3b8',margin:0,textTransform:'uppercase',letterSpacing:'0.05em'}}>Simtrak Solutions</p>
                        </div>
                    </div>
                    <button type="button" style={S.signoutBtn} aria-label="Sign out">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};

const MOBILE_HEADER = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 40,
    padding: '0 16px',
    height: 60,
    background: '#fff',
    borderBottom: '1px solid #e8ecf0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    fontFamily: "'DM Sans', system-ui, sans-serif",
};

const S = {
    overlay:      { position:'fixed',inset:0,background:'rgba(15,23,42,0.5)',backdropFilter:'blur(4px)',zIndex:50 },
    sidebar:      {
        position: 'fixed', inset:'0 auto 0 0', width:248, background:'#fff',
        borderRight: '1px solid #e8ecf0', display:'flex', flexDirection:'column',
        boxShadow: '2px 0 20px rgba(0,0,0,0.06)', zIndex:60, transform:'translateX(-100%)',
        transition:'transform 0.3s ease', fontFamily:"'DM Sans', system-ui, sans-serif",
    },
    sidebarOpen:  { transform: 'translateX(0)' },
    brand:        { display:'flex',alignItems:'center',gap:10,padding:'20px 18px 16px',borderBottom:'1px solid #f1f5f9' },
    logoMark:     { width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
    brandName:    { fontSize:17,fontWeight:800,color:'#0f172a',display:'block',letterSpacing:'-0.01em' },
    brandTag:     { fontSize:9,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em',display:'block' },
    logoWrap:     { margin:'14px 14px 6px',background:'#f8fafc',borderRadius:10,padding:10,border:'1px solid #e8ecf0',overflow:'hidden' },
    logoImg:      { width:'100%',height:60,objectFit:'contain',display:'block',filter:'grayscale(0.3)',transition:'filter 0.4s' },
    navLink:      { display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,color:'#64748b',textDecoration:'none',transition:'all 0.15s',position:'relative' },
    navLinkActive:{ background:'#eff6ff',color:'#1d4ed8',fontWeight:700 },
    navIcon:      { flexShrink:0,transition:'color 0.15s' },
    activeDot:    { width:6,height:6,borderRadius:'50%',background:'#3b82f6',marginLeft:'auto' },
    footer:       { padding:'14px 14px 20px',borderTop:'1px solid #f1f5f9',display:'flex',flexDirection:'column',gap:12 },
    footerBadge:  { display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f8fafc',borderRadius:10,border:'1px solid #e8ecf0' },
    signoutBtn:   { display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:700,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',padding:'6px 12px',borderRadius:8,transition:'color 0.15s',textTransform:'uppercase',letterSpacing:'0.05em' },
    mobileBrand:  { fontSize:17,fontWeight:800,color:'#0f172a',letterSpacing:'-0.01em' },
    hamburger:    { width:36,height:36,borderRadius:9,background:'#f8fafc',border:'1px solid #e8ecf0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b' },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

/* Desktop: sidebar is always visible and static */
@media (min-width: 768px) {
  aside {
    position: relative !important;
    transform: none !important;
    width: 248px !important;
    height: 100vh !important;
    flex-shrink: 0 !important;
  }
  header[style] { display: none !important; }
  [data-overlay] { display: none !important; }
}

/* Mobile header visible only on small screens */
@media (min-width: 768px) {
  .mobile-header { display: none !important; }
}

aside nav a:hover:not([style*="background:#eff6ff"]) {
  background: #f8fafc;
  color: #0f172a;
}
aside nav a:hover svg { color: #475569 !important; }
aside footer button:hover { color: #ef4444 !important; }
aside img:hover { filter: grayscale(0) !important; }
`;

export default Navbar;