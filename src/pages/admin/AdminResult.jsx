import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getFormResults, getForms } from '../../api/feedbackApi';
import { getDemoResults } from '../../data/demoFeedback';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ─── small components ─────────────────────────── */
const SentimentBadge = ({ sentiment }) => {
    const MAP = {
        positive: { bg: '#dcfce7', color: '#166534', icon: '😊', label: 'Positive' },
        neutral:  { bg: '#fef3c7', color: '#92400e', icon: '😐', label: 'Neutral' },
        negative: { bg: '#fee2e2', color: '#991b1b', icon: '😞', label: 'Negative' },
    };
    const s = MAP[sentiment] || MAP.neutral;
    return (
        <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 99, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {s.icon} {s.label}
        </span>
    );
};

const RatingStars = ({ rating }) => {
    const r = Number(rating) || 0;
    return (
        <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} style={{ fontSize: 14, color: s <= r ? '#f59e0b' : '#e5e7eb' }}>★</span>
            ))}
        </div>
    );
};

const ProgressBar = ({ value, max, color = '#3b82f6' }) => {
    const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
    return (
        <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', flex: 1 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
    );
};

/* ── Draft Mode Banner ── */
const DraftBanner = ({ formTitle }) => (
    <div className="ar-draft-banner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>
            <strong>"{formTitle}"</strong> is in Draft mode — analytics and responses will appear once it is published as <strong>Live</strong>.
        </span>
        <Link to="/admin/forms/new" className="ar-draft-edit-link">Edit Form →</Link>
    </div>
);

/* ═══ AdminResult ════════════════════════════════ */
const AdminResult = () => {
    const { formId } = useParams();
    const navigate   = useNavigate();

    const [allForms, setAllForms]               = useState([]);
    const [result, setResult]                   = useState(null);
    const [isLoading, setIsLoading]             = useState(true);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [search, setSearch]                   = useState('');
    const [hoveredRow, setHoveredRow]           = useState(null);

    /* load form list */
    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getForms();
                setAllForms(Array.isArray(data.forms) ? data.forms : []);
            } catch { setAllForms([]); }
        };
        fetch();
    }, []);

    /* load results for selected form */
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setResult(null);
            setSearch(''); // ← reset search when form changes
            try {
                const currentId = formId || allForms[0]?._id || allForms[0]?.id;
                if (currentId) {
                    const data = await getFormResults(currentId);
                    setResult(data);
                }
            } catch {
                setResult(getDemoResults(formId));
            } finally {
                setIsLoading(false);
            }
        };
        if (formId || allForms.length) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formId, allForms.length]);

    const handleSearchChange = useCallback((e) => {
        setSearch(e.target.value);
    }, []);

    const clearSearch = useCallback(() => {
        setSearch('');
    }, []);

    const formatAnswerValue = (value) => {
        if (value == null) return '—';
        if (typeof value === 'string') return value.trim() ? value : '—';
        if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    if (isLoading && !result) return (
        <>
            <style>{CSS}</style>
            <div className="ar-load-wrap">
                <div className="ar-load-ring" />
                <p className="ar-load-text">Loading Records…</p>
            </div>
        </>
    );

    const analytics       = result?.analytics || {};
    const recentResponses = analytics.recentResponses || [];
    const sentimentData   = analytics.sentimentBreakdown || [];
    const keywords        = analytics.topKeywords || [];
    const totalResponses  = analytics.totalResponses || 0;
    const avgRating       = analytics.averageRating;
    const completionRate  = analytics.completionRate;
    const currentForm     = result?.form;
    const isDraft         = currentForm?.status === 'draft';

    /* ── Filtering: client-side, search resets show all ── */
    const filtered = recentResponses.filter(r => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (r.respondentName  || '').toLowerCase().includes(q) ||
            (r.respondentEmail || '').toLowerCase().includes(q) ||
            (r.respondentRole  || '').toLowerCase().includes(q)
        );
    });

    return (
        <>
            <style>{CSS}</style>

            <main className="ar-main">
                {/* ── Header ── */}
                <div className="ar-top-bar">
                    <div className="ar-top-left">
                        <Link to="/admin" className="ar-back-btn" title="Back to Dashboard">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </Link>
                        <div>
                            <p className="ar-top-eyebrow">Results for</p>
                            <select
                                className="ar-form-select"
                                value={formId || ''}
                                onChange={e => navigate(`/admin/result/${e.target.value}`)}
                            >
                                {allForms.map(f => (
                                    <option key={f._id || f.id} value={f._id || f.id}>{f.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="ar-top-right">
                        {/* Search with clear button */}
                        <div className="ar-search-wrap">
                            <svg className="ar-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input
                                className="ar-search-input"
                                placeholder="Search by name, email…"
                                value={search}
                                onChange={handleSearchChange}
                            />
                            {search && (
                                <button type="button" className="ar-search-clear" onClick={clearSearch} aria-label="Clear search">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            )}
                        </div>
                        <button className="ar-export-btn">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Export
                        </button>
                    </div>
                </div>

                {/* ── Draft Banner ── */}
                {isDraft && currentForm && <DraftBanner formTitle={currentForm.title} />}

                {/* ── KPI Strip — hidden for drafts ── */}
                {!isDraft && (
                    <div className="ar-kpi-row">
                        <div className="ar-kpi">
                            <span className="ar-kpi-val">{totalResponses.toLocaleString()}</span>
                            <span className="ar-kpi-label">Total Responses</span>
                        </div>
                        {avgRating != null && (
                            <div className="ar-kpi">
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                                    <span className="ar-kpi-val">{avgRating}</span>
                                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>/5</span>
                                </div>
                                <span className="ar-kpi-label">Average Rating</span>
                            </div>
                        )}
                        {completionRate != null && (
                            <div className="ar-kpi">
                                <span className="ar-kpi-val">{completionRate}%</span>
                                <span className="ar-kpi-label">Completion Rate</span>
                            </div>
                        )}
                        {sentimentData[0] && (
                            <div className="ar-kpi">
                                <span className="ar-kpi-val" style={{ color: '#10b981' }}>{sentimentData[0].percentage}%</span>
                                <span className="ar-kpi-label">Positive Sentiment</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Body Grid ── */}
                <div className="ar-grid">
                    {/* Table */}
                    <div className="ar-table-card">
                        <div className="ar-table-header">
                            <div>
                                <h2 className="ar-table-title">Response Records</h2>
                                <p className="ar-table-sub">
                                    {isDraft
                                        ? 'No responses yet — form is in draft mode'
                                        : search
                                            ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"`
                                            : `${filtered.length} response${filtered.length !== 1 ? 's' : ''}`
                                    }
                                </p>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="ar-table">
                                <thead>
                                    <tr className="ar-thead">
                                        <th className="ar-th">Respondent</th>
                                        <th className="ar-th ar-th--center">Sentiment</th>
                                        <th className="ar-th">Date</th>
                                        <th className="ar-th ar-th--right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!isDraft && filtered.length > 0 ? filtered.map(resp => {
                                        const id = resp._id || resp.id;
                                        return (
                                            <tr
                                                key={id}
                                                onMouseEnter={() => setHoveredRow(id)}
                                                onMouseLeave={() => setHoveredRow(null)}
                                                className="ar-row"
                                                style={{ background: hoveredRow === id ? '#f8fafc' : '#fff' }}
                                            >
                                                <td className="ar-td-name">
                                                    <div className="ar-avatar">
                                                        {(resp.respondentName || 'A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="ar-resp-name">{resp.respondentName || 'Anonymous'}</p>
                                                        <p className="ar-resp-role">{resp.respondentEmail || resp.respondentRole || 'Respondent'}</p>
                                                    </div>
                                                </td>
                                                <td className="ar-td ar-td--center">
                                                    {resp.sentiment ? <SentimentBadge sentiment={resp.sentiment} /> : '—'}
                                                </td>
                                                <td className="ar-td ar-td--date">
                                                    {resp.submittedAt ? dateFormatter.format(new Date(resp.submittedAt)) : 'N/A'}
                                                </td>
                                                <td className="ar-td ar-td--right">
                                                    <button className="ar-view-btn" onClick={() => setSelectedResponse(resp)}>View</button>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={4} className="ar-empty-row">
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: 32 }}>{isDraft ? '📝' : search ? '🔍' : '📭'}</span>
                                                    <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>
                                                        {isDraft
                                                            ? 'Publish this form to start collecting responses'
                                                            : search
                                                                ? <>No results for "{search}" — <button className="ar-clear-link" onClick={clearSearch}>clear search</button></>
                                                                : 'No responses yet'
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar — hidden for drafts */}
                    {!isDraft && (
                        <div className="ar-sidebar">
                            {sentimentData.length > 0 && (
                                <div className="ar-side-card">
                                    <h3 className="ar-side-title">Sentiment Breakdown</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                                        {[
                                            { data: sentimentData[0], color: '#10b981', emoji: '😊' },
                                            { data: sentimentData[1], color: '#f59e0b', emoji: '😐' },
                                            { data: sentimentData[2], color: '#ef4444', emoji: '😞' },
                                        ].filter(i => i.data).map(item => (
                                            <div key={item.data.sentiment} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 13, width: 20 }}>{item.emoji}</span>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', width: 55 }}>{item.data.label}</span>
                                                <ProgressBar value={item.data.count} max={totalResponses} color={item.color} />
                                                <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', minWidth: 34, textAlign: 'right' }}>{item.data.percentage}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {keywords.length > 0 && (
                                <div className="ar-side-card">
                                    <h3 className="ar-side-title">Top Keywords</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                        {keywords.slice(0, 6).map((k, i) => (
                                            <div key={k.keyword} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', width: 14, textAlign: 'right' }}>{i + 1}</span>
                                                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{k.keyword}</span>
                                                <ProgressBar value={k.count} max={keywords[0].count} color="#6366f1" />
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', minWidth: 22, textAlign: 'right' }}>{k.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentForm && (
                                <div className="ar-side-card">
                                    <h3 className="ar-side-title">Form Info</h3>
                                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {[
                                            ['Type', currentForm.formType],
                                            ['Status', currentForm.status],
                                            ['Questions', currentForm.questionCount],
                                        ].filter(([, v]) => v != null).map(([label, val]) => (
                                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Response Detail Modal ── */}
            {selectedResponse && (
                <div className="ar-overlay" onClick={() => setSelectedResponse(null)}>
                    <div className="ar-modal" onClick={e => e.stopPropagation()}>
                        <div className="ar-modal-header">
                            <div>
                                <h3 className="ar-modal-title">Response Detail</h3>
                                <p className="ar-modal-sub">{dateFormatter.format(new Date(selectedResponse.submittedAt || Date.now()))}</p>
                            </div>
                            <button type="button" className="ar-close-btn" onClick={() => setSelectedResponse(null)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <div className="ar-resp-card">
                            <div className="ar-resp-avatar">{(selectedResponse.respondentName || 'A').charAt(0).toUpperCase()}</div>
                            <div>
                                <p style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>{selectedResponse.respondentName || 'Anonymous'}</p>
                                <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{selectedResponse.respondentEmail || selectedResponse.respondentRole || 'Respondent'}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                    {selectedResponse.sentiment && <SentimentBadge sentiment={selectedResponse.sentiment} />}
                                    {selectedResponse.rating && <RatingStars rating={selectedResponse.rating} />}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Answers</p>
                            {Array.isArray(selectedResponse.answers) && selectedResponse.answers.length > 0
                                ? selectedResponse.answers.map((a, idx) => (
                                    <div key={`${a.questionId || 'q'}-${idx}`} className="ar-answer-box">
                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>{a.prompt || `Answer ${idx + 1}`}</p>
                                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{formatAnswerValue(a.value)}</p>
                                    </div>
                                ))
                                : <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No response data recorded.</p>
                            }
                        </div>

                        <button type="button" className="ar-dismiss-btn" onClick={() => setSelectedResponse(null)}>Dismiss</button>
                    </div>
                </div>
            )}
        </>
    );
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
@keyframes spin    { to { transform:rotate(360deg); } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }

.ar-main    { flex:1; overflow-y:auto; background:#f8fafc; padding:28px 20px 60px; font-family:'DM Sans',system-ui,sans-serif; }
.ar-load-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#f8fafc; gap:12px; font-family:'DM Sans',system-ui,sans-serif; }
.ar-load-ring { width:36px; height:36px; border:3px solid #e8ecf0; border-top-color:#3b82f6; border-radius:50%; animation:spin 0.7s linear infinite; }
.ar-load-text { font-size:12px; font-weight:700; color:#94a3b8; letter-spacing:0.1em; text-transform:uppercase; }

/* Header */
.ar-top-bar  { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
.ar-top-left { display:flex; align-items:center; gap:12px; overflow:hidden; flex:1; min-width:0; }
.ar-top-right { display:flex; gap:10px; align-items:center; flex-shrink:0; flex-wrap:wrap; }
.ar-back-btn { width:36px; height:36px; border-radius:9px; background:#fff; border:1px solid #e8ecf0; display:flex; align-items:center; justify-content:center; color:#64748b; text-decoration:none; box-shadow:0 1px 3px rgba(0,0,0,0.06); flex-shrink:0; transition:background 0.15s; }
.ar-back-btn:hover { background:#f1f5f9; }
.ar-top-eyebrow { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; margin:0 0 2px; }
.ar-form-select { font-size:17px; font-weight:800; color:#0f172a; background:transparent; border:none; outline:none; cursor:pointer; max-width:300px; font-family:'DM Sans',system-ui,sans-serif; letter-spacing:-0.01em; }

/* Search */
.ar-search-wrap  { position:relative; display:flex; align-items:center; }
.ar-search-icon  { position:absolute; left:10px; color:#94a3b8; pointer-events:none; }
.ar-search-input { padding:8px 34px 8px 30px; background:#fff; border:1px solid #e8ecf0; border-radius:9px; font-size:12px; color:#0f172a; outline:none; width:200px; font-family:'DM Sans',system-ui,sans-serif; transition:border 0.15s; }
.ar-search-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.08); }
.ar-search-clear { position:absolute; right:8px; width:20px; height:20px; border-radius:99px; background:#e2e8f0; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:background 0.13s; }
.ar-search-clear:hover { background:#cbd5e1; }
.ar-export-btn   { display:inline-flex; align-items:center; gap:6px; background:#0f172a; color:#fff; padding:8px 14px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; letter-spacing:0.02em; transition:background 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.ar-export-btn:hover { background:#2563eb; }

/* Draft Banner */
.ar-draft-banner {
    display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    background:#fffbeb; border:1px solid #fde68a; border-radius:10px;
    padding:12px 16px; margin-bottom:18px;
    font-size:13px; color:#92400e; font-weight:500;
    line-height:1.5;
}
.ar-draft-edit-link { font-size:12px; font-weight:700; color:#2563eb; text-decoration:none; white-space:nowrap; margin-left:auto; }
.ar-draft-edit-link:hover { text-decoration:underline; }

/* KPIs */
.ar-kpi-row { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.ar-kpi     { background:#fff; border:1px solid #e8ecf0; border-radius:12px; padding:16px 18px; flex:1 1 110px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.ar-kpi-val { font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-0.02em; display:block; line-height:1; }
.ar-kpi-label { font-size:10px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; display:block; margin-top:4px; }

/* Grid */
.ar-grid { display:grid; grid-template-columns:1fr 270px; gap:18px; align-items:start; }

/* Table Card */
.ar-table-card { background:#fff; border-radius:13px; border:1px solid #e8ecf0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.ar-table-header { padding:16px 20px; border-bottom:1px solid #f1f5f9; }
.ar-table-title  { font-size:14px; font-weight:800; color:#0f172a; margin:0; }
.ar-table-sub    { font-size:12px; color:#94a3b8; margin:2px 0 0; }
.ar-table  { width:100%; border-collapse:collapse; min-width:500px; }
.ar-thead  { background:#fafbfc; border-bottom:1px solid #f1f5f9; }
.ar-th     { padding:11px 20px; font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; text-align:left; }
.ar-th--center { text-align:center; }
.ar-th--right  { text-align:right; }
.ar-row    { border-bottom:1px solid #f8fafc; transition:background 0.12s; }
.ar-td-name { padding:13px 20px; display:flex; align-items:center; gap:11px; }
.ar-td      { padding:13px 20px; font-size:13px; }
.ar-td--center { text-align:center; }
.ar-td--right  { text-align:right; }
.ar-td--date   { color:#64748b; }
.ar-avatar  { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ar-resp-name { font-size:13px; font-weight:700; color:#0f172a; margin:0; }
.ar-resp-role { font-size:11px; color:#94a3b8; margin:1px 0 0; }
.ar-view-btn  { font-size:11px; font-weight:700; color:#3b82f6; background:#eff6ff; border:1px solid #bfdbfe; border-radius:7px; padding:5px 11px; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; transition:background 0.13s; font-family:'DM Sans',system-ui,sans-serif; }
.ar-view-btn:hover { background:#dbeafe; }
.ar-empty-row { text-align:center; padding:44px 20px; }
.ar-clear-link { background:none; border:none; color:#3b82f6; font-size:inherit; font-weight:700; cursor:pointer; text-decoration:underline; padding:0; font-family:'DM Sans',system-ui,sans-serif; }

/* Sidebar */
.ar-sidebar  { display:flex; flex-direction:column; gap:13px; }
.ar-side-card { background:#fff; border:1px solid #e8ecf0; border-radius:13px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.ar-side-title { font-size:11px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.07em; margin:0; }

/* Modal */
.ar-overlay  { position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; }
.ar-modal    { background:#fff; border-radius:18px; padding:26px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 70px rgba(0,0,0,0.2); animation:scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1); font-family:'DM Sans',system-ui,sans-serif; }
.ar-modal-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:18px; }
.ar-modal-title  { font-size:17px; font-weight:800; color:#0f172a; margin:0; letter-spacing:-0.01em; }
.ar-modal-sub    { font-size:12px; color:#94a3b8; margin:3px 0 0; }
.ar-close-btn    { width:30px; height:30px; border-radius:8px; background:#f8fafc; border:1px solid #e8ecf0; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; flex-shrink:0; transition:background 0.13s; }
.ar-close-btn:hover { background:#f1f5f9; }
.ar-resp-card   { display:flex; gap:13px; align-items:flex-start; background:#f8fafc; border-radius:11px; padding:13px 14px; border:1px solid #e8ecf0; }
.ar-resp-avatar { width:44px; height:44px; border-radius:11px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; font-weight:800; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ar-answer-box  { background:#fafbfc; border:1px solid #e8ecf0; border-radius:9px; padding:11px 13px; }
.ar-dismiss-btn { margin-top:22px; width:100%; padding:12px; background:#0f172a; color:#fff; border:none; border-radius:11px; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:0.02em; text-transform:uppercase; font-family:'DM Sans',system-ui,sans-serif; transition:background 0.15s; }
.ar-dismiss-btn:hover { background:#2563eb; }

/* Responsive */
@media (max-width:960px) { .ar-grid { grid-template-columns:1fr; } }
@media (max-width:600px) {
    .ar-kpi-row { gap:8px; }
    .ar-kpi { padding:12px 14px; }
    .ar-kpi-val { font-size:22px; }
    .ar-search-input { width:150px; }
    .ar-form-select { font-size:14px; max-width:180px; }
}
`;

export default AdminResult;