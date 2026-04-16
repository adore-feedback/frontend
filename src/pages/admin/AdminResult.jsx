import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getFormResults, getForms } from '../../api/feedbackApi';
import { getDemoResults } from '../../data/demoFeedback';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const SentimentBadge = ({ sentiment }) => {
    const MAP = {
        positive: { bg:'#dcfce7', color:'#166534', icon:'😊', label:'Positive' },
        neutral:  { bg:'#fef3c7', color:'#92400e', icon:'😐', label:'Neutral' },
        negative: { bg:'#fee2e2', color:'#991b1b', icon:'😞', label:'Negative' },
    };
    const s = MAP[sentiment] || MAP.neutral;
    return (
        <span style={{fontSize:10, fontWeight:700, background:s.bg, color:s.color, padding:'3px 8px', borderRadius:99, letterSpacing:'0.05em', textTransform:'uppercase', display:'inline-flex', alignItems:'center', gap:4}}>
            <span>{s.icon}</span>{s.label}
        </span>
    );
};

const RatingStars = ({ rating }) => {
    const r = Number(rating) || 0;
    return (
        <div style={{display:'flex', gap:2}}>
            {[1,2,3,4,5].map(s => (
                <span key={s} style={{fontSize:14, color: s<=r ? '#f59e0b' : '#e5e7eb'}}>★</span>
            ))}
        </div>
    );
};

const ProgressBar = ({ value, max, color = '#3b82f6' }) => {
    const pct = max > 0 ? Math.min(Math.round((value/max)*100), 100) : 0;
    return (
        <div style={{height:6, background:'#f1f5f9', borderRadius:999, overflow:'hidden', flex:1}}>
            <div style={{height:'100%', width:`${pct}%`, background:color, borderRadius:999, transition:'width 0.6s cubic-bezier(0.4,0,0.2,1)'}}/>
        </div>
    );
};

const AdminResult = () => {
    const { formId } = useParams();
    const navigate   = useNavigate();
    const [allForms, setAllForms]             = useState([]);
    const [result, setResult]                 = useState(null);
    const [isLoading, setIsLoading]           = useState(true);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [filters, setFilters]               = useState({ search: '' });
    const [hoveredRow, setHoveredRow]         = useState(null);

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const data = await getForms();
                setAllForms(Array.isArray(data.forms) ? data.forms : []);
            } catch { setAllForms([]); }
        };
        fetchForms();
    }, []);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const currentId = formId || (allForms[0]?._id || allForms[0]?.id);
                if (currentId) {
                    const data = await getFormResults(currentId, filters);
                    setResult(data);
                }
            } catch { setResult(getDemoResults(formId)); }
            finally { setIsLoading(false); }
        };
        load();
    }, [formId, filters, allForms]);

    const formatAnswerValue = (value) => {
        if (value == null) return '—';
        if (typeof value === 'string') return value.trim() ? value : '—';
        if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    };

    if (isLoading && !result) return (
        <div style={S.loadWrap}>
            <div style={S.loadRing}/>
            <p style={S.loadText}>Loading Records…</p>
            <style>{CSS}</style>
        </div>
    );

    const analytics        = result?.analytics || {};
    const recentResponses  = analytics.recentResponses || [];
    const sentimentData    = analytics.sentimentBreakdown || [];
    const keywords         = analytics.topKeywords || [];
    const totalResponses   = analytics.totalResponses || 0;
    const avgRating        = analytics.averageRating;
    const completionRate   = analytics.completionRate;
    const currentForm      = result?.form;

    const filtered = recentResponses.filter(r => {
        if (!filters.search) return true;
        return (r.respondentName||'').toLowerCase().includes(filters.search.toLowerCase());
    });

    return (
        <>
            <style>{CSS}</style>

            <main style={S.main}>
                {/* ── Header ── */}
                <div style={S.topBar}>
                    <div style={{display:'flex', alignItems:'center', gap:12, overflow:'hidden', flex:1}}>
                        <Link to="/admin" style={S.backBtn}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </Link>
                        <div style={{minWidth:0}}>
                            <p style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',margin:0}}>Results for</p>
                            <select
                                style={S.formSelect}
                                value={formId || ''}
                                onChange={e => navigate(`/admin/result/${e.target.value}`)}
                            >
                                {allForms.map(f => <option key={f._id||f.id} value={f._id||f.id}>{f.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{display:'flex', gap:10, alignItems:'center', flexShrink:0}}>
                        <div style={S.searchWrap}>
                            <svg style={S.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input
                                style={S.searchInput}
                                placeholder="Search by name…"
                                value={filters.search}
                                onChange={e => setFilters({ search: e.target.value })}
                            />
                        </div>
                        <button style={S.exportBtn}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Export
                        </button>
                    </div>
                </div>

                {/* ── KPI Strip ── */}
                <div style={S.kpiRow}>
                    <div style={S.kpi}>
                        <span style={S.kpiVal}>{totalResponses.toLocaleString()}</span>
                        <span style={S.kpiLabel}>Total Responses</span>
                    </div>
                    {avgRating != null && (
                        <div style={S.kpi}>
                            <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                                <span style={S.kpiVal}>{avgRating}</span>
                                <span style={{fontSize:12,color:'#94a3b8',fontWeight:500}}>/5</span>
                            </div>
                            <span style={S.kpiLabel}>Average Rating</span>
                        </div>
                    )}
                    {completionRate != null && (
                        <div style={S.kpi}>
                            <span style={S.kpiVal}>{completionRate}%</span>
                            <span style={S.kpiLabel}>Completion Rate</span>
                        </div>
                    )}
                    {sentimentData[0] && (
                        <div style={S.kpi}>
                            <span style={{...S.kpiVal, color:'#10b981'}}>{sentimentData[0].percentage}%</span>
                            <span style={S.kpiLabel}>Positive Sentiment</span>
                        </div>
                    )}
                </div>

                {/* ── Grid ── */}
                <div style={S.grid}>
                    {/* Left: Table */}
                    <div>
                        <div style={S.tableCard}>
                            <div style={S.tableHeader}>
                                <div>
                                    <h2 style={S.tableTitle}>Response Records</h2>
                                    <p style={S.tableSubtitle}>{filtered.length} result{filtered.length!==1?'s':''} {filters.search ? `matching "${filters.search}"` : ''}</p>
                                </div>
                            </div>
                            <div style={{overflowX:'auto'}}>
                                <table style={S.table}>
                                    <thead>
                                        <tr style={S.thead}>
                                            <th style={S.th}>Respondent</th>
                                            <th style={{...S.th,textAlign:'center'}}>Sentiment</th>
                                            <th style={S.th}>Date</th>
                                            <th style={{...S.th,textAlign:'right'}}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length > 0 ? filtered.map(resp => {
                                            const id = resp._id || resp.id;
                                            return (
                                                <tr key={id}
                                                    onMouseEnter={() => setHoveredRow(id)}
                                                    onMouseLeave={() => setHoveredRow(null)}
                                                    style={{...S.row, background: hoveredRow===id ? '#f8fafc' : '#fff'}}>
                                                    <td style={S.tdName}>
                                                        <div style={S.avatar}>
                                                            {(resp.respondentName||'A').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p style={S.respondentName}>{resp.respondentName || 'Anonymous'}</p>
                                                            <p style={S.respondentRole}>{resp.respondentRole || 'Respondent'}</p>
                                                        </div>
                                                    </td>
                                                    <td style={{...S.td,textAlign:'center'}}>
                                                        {resp.sentiment ? <SentimentBadge sentiment={resp.sentiment}/> : '—'}
                                                    </td>
                                                    <td style={{...S.td,color:'#64748b'}}>
                                                        {resp.submittedAt ? dateFormatter.format(new Date(resp.submittedAt)) : 'N/A'}
                                                    </td>
                                                    <td style={{...S.td,textAlign:'right'}}>
                                                        <button onClick={() => setSelectedResponse(resp)} style={S.viewBtn}>
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="4" style={S.emptyRow}>
                                                    <div style={{textAlign:'center'}}>
                                                        <span style={{fontSize:32}}>📭</span>
                                                        <p style={{marginTop:8,fontSize:14,fontWeight:600,color:'#94a3b8'}}>No records found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: Analytics sidebar */}
                    <div style={S.sidebar}>
                        {/* Sentiment Breakdown */}
                        {sentimentData.length > 0 && (
                            <div style={S.sideCard}>
                                <h3 style={S.sideTitle}>Sentiment Breakdown</h3>
                                <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:12}}>
                                    {[
                                        { data:sentimentData[0], color:'#10b981', emoji:'😊' },
                                        { data:sentimentData[1], color:'#f59e0b', emoji:'😐' },
                                        { data:sentimentData[2], color:'#ef4444', emoji:'😞' },
                                    ].filter(item=>item.data).map(item => (
                                        <div key={item.data.sentiment} style={{display:'flex',alignItems:'center',gap:10}}>
                                            <span style={{fontSize:14,width:20}}>{item.emoji}</span>
                                            <span style={{fontSize:11,fontWeight:600,color:'#64748b',width:58}}>{item.data.label}</span>
                                            <ProgressBar value={item.data.count} max={totalResponses} color={item.color}/>
                                            <span style={{fontSize:11,fontWeight:800,color:'#0f172a',minWidth:36,textAlign:'right'}}>{item.data.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Top Keywords */}
                        {keywords.length > 0 && (
                            <div style={S.sideCard}>
                                <h3 style={S.sideTitle}>Top Keywords</h3>
                                <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
                                    {keywords.slice(0,6).map((k,i) => (
                                        <div key={k.keyword} style={{display:'flex',alignItems:'center',gap:10}}>
                                            <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',width:14,textAlign:'right'}}>{i+1}</span>
                                            <span style={{flex:1,fontSize:12,fontWeight:600,color:'#0f172a'}}>{k.keyword}</span>
                                            <ProgressBar value={k.count} max={keywords[0].count} color='#6366f1'/>
                                            <span style={{fontSize:11,fontWeight:700,color:'#6366f1',minWidth:24,textAlign:'right'}}>{k.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Form Info */}
                        {currentForm && (
                            <div style={S.sideCard}>
                                <h3 style={S.sideTitle}>Form Info</h3>
                                <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
                                    {[
                                        ['Type', currentForm.formType],
                                        ['Status', currentForm.status],
                                        ['Questions', currentForm.questionCount],
                                        ['Target', currentForm.targetResponses],
                                    ].map(([label,val]) => val != null && (
                                        <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                            <span style={{fontSize:11,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</span>
                                            <span style={{fontSize:12,fontWeight:700,color:'#0f172a',textTransform:'capitalize'}}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Response Detail Modal ── */}
            {selectedResponse && (
                <div style={S.overlay} onClick={() => setSelectedResponse(null)}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHeader}>
                            <div>
                                <h3 style={S.modalTitle}>Response Detail</h3>
                                <p style={S.modalSub}>{dateFormatter.format(new Date(selectedResponse.submittedAt||Date.now()))}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedResponse(null)} style={S.closeBtn}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        {/* Respondent */}
                        <div style={S.respCard}>
                            <div style={S.respAvatar}>{(selectedResponse.respondentName||'A').charAt(0).toUpperCase()}</div>
                            <div>
                                <p style={{fontWeight:800,fontSize:15,color:'#0f172a',margin:0}}>{selectedResponse.respondentName||'Anonymous'}</p>
                                <p style={{fontSize:12,color:'#94a3b8',margin:0,marginTop:2}}>{selectedResponse.respondentRole||'Respondent'}</p>
                                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8,flexWrap:'wrap'}}>
                                    {selectedResponse.sentiment && <SentimentBadge sentiment={selectedResponse.sentiment}/>}
                                    {selectedResponse.rating && <RatingStars rating={selectedResponse.rating}/>}
                                </div>
                            </div>
                        </div>

                        {/* Answers */}
                        <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:10}}>
                            <p style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Responses</p>
                            {Array.isArray(selectedResponse.answers) && selectedResponse.answers.length > 0 ? (
                                selectedResponse.answers.slice(0,6).map((a,idx) => (
                                    <div key={`${a.questionId||'q'}-${idx}`} style={S.answerBox}>
                                        <p style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 6px'}}>{a.prompt||`Answer ${idx+1}`}</p>
                                        <p style={{fontSize:13,color:'#374151',lineHeight:1.6,margin:0,fontStyle:'italic'}}>
                                            {formatAnswerValue(a.value)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p style={{fontSize:13,color:'#94a3b8',fontStyle:'italic',textAlign:'center',padding:20}}>No response data recorded.</p>
                            )}
                        </div>

                        <button type="button" onClick={() => setSelectedResponse(null)} style={S.dismissBtn}>Dismiss</button>
                    </div>
                </div>
            )}
        </>
    );
};

const S = {
    main:         { flex:1, overflowY:'auto', background:'#f8fafc', padding:'28px 24px 60px', fontFamily:"'DM Sans', system-ui, sans-serif" },
    loadWrap:     { display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:'#f8fafc',gap:12 },
    loadRing:     { width:36,height:36,border:'3px solid #e8ecf0',borderTopColor:'#3b82f6',borderRadius:'50%',animation:'spin 0.7s linear infinite' },
    loadText:     { fontSize:12,fontWeight:700,color:'#94a3b8',letterSpacing:'0.1em',textTransform:'uppercase' },
    topBar:       { display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,gap:12,flexWrap:'wrap' },
    backBtn:      { width:36,height:36,borderRadius:10,background:'#fff',border:'1px solid #e8ecf0',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',textDecoration:'none',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',flexShrink:0 },
    formSelect:   { fontSize:18,fontWeight:800,color:'#0f172a',background:'transparent',border:'none',outline:'none',cursor:'pointer',maxWidth:320,letterSpacing:'-0.01em',fontFamily:"'DM Sans', system-ui, sans-serif" },
    searchWrap:   { position:'relative',display:'flex',alignItems:'center' },
    searchIcon:   { position:'absolute',left:10,color:'#94a3b8',pointerEvents:'none' },
    searchInput:  { paddingLeft:32,paddingRight:14,paddingTop:9,paddingBottom:9,background:'#fff',border:'1px solid #e8ecf0',borderRadius:9,fontSize:12,color:'#0f172a',outline:'none',width:180,fontFamily:"'DM Sans',system-ui" },
    exportBtn:    { display:'inline-flex',alignItems:'center',gap:7,background:'#0f172a',color:'#fff',padding:'9px 16px',borderRadius:9,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',letterSpacing:'0.02em' },
    kpiRow:       { display:'flex',gap:12,marginBottom:24,flexWrap:'wrap' },
    kpi:          { background:'#fff',border:'1px solid #e8ecf0',borderRadius:12,padding:'16px 20px',flex:'1 1 120px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
    kpiVal:       { fontSize:28,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em',display:'block',lineHeight:1 },
    kpiLabel:     { fontSize:10,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',display:'block',marginTop:4 },
    grid:         { display:'grid',gridTemplateColumns:'1fr 280px',gap:20,alignItems:'start' },
    tableCard:    { background:'#fff',borderRadius:14,border:'1px solid #e8ecf0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)' },
    tableHeader:  { padding:'18px 22px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between' },
    tableTitle:   { fontSize:15,fontWeight:800,color:'#0f172a',margin:0 },
    tableSubtitle:{ fontSize:12,color:'#94a3b8',margin:'2px 0 0' },
    table:        { width:'100%',borderCollapse:'collapse',minWidth:520 },
    thead:        { background:'#fafbfc',borderBottom:'1px solid #f1f5f9' },
    th:           { padding:'12px 22px',fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em',textAlign:'left' },
    row:          { borderBottom:'1px solid #f8fafc',transition:'background 0.12s' },
    tdName:       { padding:'14px 22px',display:'flex',alignItems:'center',gap:12 },
    td:           { padding:'14px 22px',fontSize:13 },
    avatar:       { width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#667eea,#764ba2)',color:'#fff',fontWeight:800,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
    respondentName:{ fontSize:13.5,fontWeight:700,color:'#0f172a',margin:0 },
    respondentRole:{ fontSize:11,color:'#94a3b8',margin:'2px 0 0',textTransform:'capitalize' },
    viewBtn:      { fontSize:11,fontWeight:700,color:'#3b82f6',background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:7,padding:'6px 12px',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.05em' },
    emptyRow:     { textAlign:'center',padding:48 },
    sidebar:      { display:'flex',flexDirection:'column',gap:14 },
    sideCard:     { background:'#fff',border:'1px solid #e8ecf0',borderRadius:14,padding:18,boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
    sideTitle:    { fontSize:12,fontWeight:700,color:'#0f172a',textTransform:'uppercase',letterSpacing:'0.07em',margin:0 },
    overlay:      { position:'fixed',inset:0,background:'rgba(15,23,42,0.6)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:20 },
    modal:        { background:'#fff',borderRadius:18,padding:'28px',width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 70px rgba(0,0,0,0.2)',animation:'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' },
    modalHeader:  { display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20 },
    modalTitle:   { fontSize:18,fontWeight:800,color:'#0f172a',margin:0,letterSpacing:'-0.01em' },
    modalSub:     { fontSize:12,color:'#94a3b8',margin:'4px 0 0' },
    closeBtn:     { width:32,height:32,borderRadius:8,background:'#f8fafc',border:'1px solid #e8ecf0',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#64748b',flexShrink:0 },
    respCard:     { display:'flex',gap:14,alignItems:'flex-start',background:'#f8fafc',borderRadius:12,padding:'14px 16px',border:'1px solid #e8ecf0' },
    respAvatar:   { width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#667eea,#764ba2)',color:'#fff',fontWeight:800,fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
    answerBox:    { background:'#fafbfc',border:'1px solid #e8ecf0',borderRadius:10,padding:'12px 14px' },
    dismissBtn:   { marginTop:24,width:'100%',padding:'13px',background:'#0f172a',color:'#fff',border:'none',borderRadius:12,fontSize:13,fontWeight:700,cursor:'pointer',letterSpacing:'0.02em',textTransform:'uppercase' },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
@media (max-width: 900px) {
  .result-grid { grid-template-columns: 1fr !important; }
}
`;

export default AdminResult;