import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createForm } from '../../api/feedbackApi';

const emptyQuestion = () => ({
    prompt: '', type: 'text', required: false,
    optionsText: '', answerTemplatesText: '',
});

const questionTemplates = [
    { label: 'Overall Rating', prompt: 'How would you rate your overall experience?', type: 'rating', required: true },
    { label: 'What Worked', prompt: 'What did you like the most?', type: 'text', required: false, answerTemplatesText: 'The session was useful because..., I liked the speaker because...' },
    { label: 'Improvements', prompt: 'What should be improved?', type: 'text', required: false, answerTemplatesText: 'More examples would help, The session could be shorter' },
    { label: 'Recommend?', prompt: 'Would you recommend this to others?', type: 'single-choice', required: false, optionsText: 'Yes, definitely, Probably yes, Not sure, Probably not' },
];

const splitList = (value) => value.split(',').map(i => i.trim()).filter(Boolean);

const QUESTION_TYPE_ICONS = { text: '✍️', rating: '⭐', 'single-choice': '🔘' };

const FormCreator = () => {
    const [form, setForm] = useState({
        title: '', description: '', formType: '', status: 'draft', visibility: 'public',
        allowedRespondentsText: '', collectsPhone: true, phoneRequired: false,
        collectsCompanyDetails: true, companyDetailsRequired: false,
        duplicateCheckFields: ['email', 'phone', 'uniqueId'],
        opensAt: '', closesAt: '', singleSession: false, sessionKey: '',
        questions: [emptyQuestion()],
    });
    const [status, setStatus] = useState({ type: '', message: '', link: '' });
    const [shareUrl, setShareUrl]     = useState('');
    const [copied, setCopied]         = useState(false);
    const [activeSection, setActiveSection] = useState('info');
    const [dragOver, setDragOver]     = useState(null);

    const copyLink = useCallback(() => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        });
    }, [shareUrl]);

    const updateField = (field, value) => setForm(c => ({ ...c, [field]: value }));
    const updateQuestion = (idx, field, value) => setForm(c => ({
        ...c, questions: c.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q),
    }));
    const addQuestion = () => setForm(c => ({ ...c, questions: [...c.questions, emptyQuestion()] }));
    const addTemplateQuestion = (t) => setForm(c => ({ ...c, questions: [...c.questions, { ...emptyQuestion(), ...t }] }));
    const removeQuestion = (idx) => setForm(c => ({ ...c, questions: c.questions.filter((_, i) => i !== idx) }));
    const moveQuestion = (idx, dir) => {
        setForm(c => {
            const qs = [...c.questions];
            const target = idx + dir;
            if (target < 0 || target >= qs.length) return c;
            [qs[idx], qs[target]] = [qs[target], qs[idx]];
            return { ...c, questions: qs };
        });
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '', link: '' });
        const payload = {
            ...form,
            allowedRespondents: splitList(form.allowedRespondentsText),
            availability: { opensAt: form.opensAt||undefined, closesAt: form.closesAt||undefined, singleSession: form.singleSession, sessionKey: form.sessionKey },
            questions: form.questions.map(q => ({ ...q, options: splitList(q.optionsText), answerTemplates: splitList(q.answerTemplatesText) })),
        };
        try {
            const data   = await createForm(payload);
            const formId = data.form.slug || data.form._id;
            setShareUrl(`${window.location.origin}/form/${formId}`);
            setStatus({ type: 'success', message: 'Form created successfully!', link: `/form/${formId}` });
            setActiveSection('done');
        } catch (err) { setStatus({ type: 'error', message: err.message }); }
    };

    const sections = [
        { id: 'info',      label: 'General Info',   icon: '📋' },
        { id: 'settings',  label: 'Settings',        icon: '⚙️' },
        { id: 'questions', label: `Questions (${form.questions.length})`, icon: '❓' },
    ];

    return (
        <>
            <style>{CSS}</style>
            <main style={S.main}>
                <div style={S.wrap}>
                    {/* Header */}
                    <div style={S.header}>
                        <div>
                            <Link to="/admin" style={S.backLink}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                Back to Hub
                            </Link>
                            <h1 style={S.pageTitle}>Create New Form</h1>
                        </div>
                        <button form="creator-form" type="submit" style={S.saveBtn}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Save Form
                        </button>
                    </div>

                    {/* Step Nav */}
                    <div style={S.stepNav}>
                        {sections.map((s, i) => (
                            <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                                ...S.stepBtn,
                                ...(activeSection === s.id ? S.stepBtnActive : {})
                            }}>
                                <span style={S.stepIcon}>{s.icon}</span>
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <form id="creator-form" onSubmit={submitForm}>
                        {/* Section: General Info */}
                        {activeSection === 'info' && (
                            <div style={S.section}>
                                <div style={S.sectionHeader}>
                                    <div>
                                        <h2 style={S.sectionTitle}>General Information</h2>
                                        <p style={S.sectionDesc}>Set up the basic details for your form</p>
                                    </div>
                                </div>
                                <div style={S.fieldGrid}>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Form Title *</label>
                                        <input style={S.input} required value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Post-Webinar Feedback 2025"/>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Form Type *</label>
                                        <select style={S.input} required value={form.formType} onChange={e => updateField('formType', e.target.value)}>
                                            <option value="">Select a type…</option>
                                            <option value="webinar">🎙️ Webinar Form</option>
                                            <option value="flash">⚡ Flash Form</option>
                                            <option value="survey">📊 Survey</option>
                                            <option value="event">🎫 Event Feedback</option>
                                        </select>
                                    </div>
                                    <div style={{...S.fieldWrap, gridColumn:'1/-1'}}>
                                        <label style={S.label}>Description</label>
                                        <textarea style={{...S.input, height:80, resize:'vertical'}} value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Briefly describe the purpose of this form…"/>
                                    </div>
                                </div>

                                {/* Toggle Chips */}
                                <div style={S.divider}/>
                                <p style={S.subLabel}>Data Collection Options</p>
                                <div style={S.chipRow}>
                                    <button type="button" onClick={() => updateField('collectsPhone', !form.collectsPhone)} style={{...S.chip, ...(form.collectsPhone ? S.chipOn : {})}}>
                                        📱 Collect Phone
                                    </button>
                                    <button type="button" onClick={() => updateField('phoneRequired', !form.phoneRequired)} style={{...S.chip, ...(form.phoneRequired ? S.chipOn : {})}}>
                                        🔒 Phone Required
                                    </button>
                                    <button type="button" onClick={() => updateField('collectsCompanyDetails', !form.collectsCompanyDetails)} style={{...S.chip, ...(form.collectsCompanyDetails ? S.chipOn : {})}}>
                                        🏢 Company Details
                                    </button>
                                    <button type="button" onClick={() => updateField('singleSession', !form.singleSession)} style={{...S.chip, ...(form.singleSession ? S.chipOn : {})}}>
                                        🔐 Single Session
                                    </button>
                                </div>

                                <div style={{display:'flex',justifyContent:'flex-end',marginTop:24}}>
                                    <button type="button" onClick={() => setActiveSection('settings')} style={S.nextBtn}>
                                        Next: Settings
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Section: Settings */}
                        {activeSection === 'settings' && (
                            <div style={S.section}>
                                <div style={S.sectionHeader}>
                                    <div>
                                        <h2 style={S.sectionTitle}>Form Settings</h2>
                                        <p style={S.sectionDesc}>Configure availability, access, and restrictions</p>
                                    </div>
                                </div>
                                <div style={S.fieldGrid}>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Initial Status</label>
                                        <select style={S.input} value={form.status} onChange={e => updateField('status', e.target.value)}>
                                            <option value="draft">Draft</option>
                                            <option value="live">Live</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Visibility</label>
                                        <select style={S.input} value={form.visibility} onChange={e => updateField('visibility', e.target.value)}>
                                            <option value="public">🌐 Public Link</option>
                                            <option value="restricted">🔒 Restricted Users</option>
                                        </select>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Opens At</label>
                                        <input style={S.input} type="datetime-local" value={form.opensAt} onChange={e => updateField('opensAt', e.target.value)}/>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Form Valid Till *</label>
                                        <input style={S.input} type="datetime-local" required value={form.closesAt} onChange={e => updateField('closesAt', e.target.value)}/>
                                    </div>
                                    {form.visibility === 'restricted' && (
                                        <div style={{...S.fieldWrap, gridColumn:'1/-1'}}>
                                            <label style={S.label}>Allowed Respondents (comma-separated emails)</label>
                                            <textarea style={{...S.input, height:72, resize:'vertical'}} placeholder="user1@example.com, user2@example.com" value={form.allowedRespondentsText} onChange={e => updateField('allowedRespondentsText', e.target.value)}/>
                                        </div>
                                    )}
                                </div>

                                <div style={S.divider}/>
                                <p style={S.subLabel}>Duplicate Submission Prevention</p>
                                <div style={S.chipRow}>
                                    {['email','phone','uniqueId'].map(f => {
                                        const on = form.duplicateCheckFields.includes(f);
                                        const labels = {email:'📧 Email', phone:'📱 Phone', uniqueId:'🆔 Unique ID'};
                                        return (
                                            <button key={f} type="button" onClick={() => {
                                                const fields = on ? form.duplicateCheckFields.filter(x=>x!==f) : [...form.duplicateCheckFields, f];
                                                updateField('duplicateCheckFields', fields);
                                            }} style={{...S.chip, ...(on ? S.chipOn : {})}}>
                                                {labels[f]}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}>
                                    <button type="button" onClick={() => setActiveSection('info')} style={S.ghostBtn}>← Back</button>
                                    <button type="button" onClick={() => setActiveSection('questions')} style={S.nextBtn}>
                                        Next: Questions
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Section: Questions */}
                        {activeSection === 'questions' && (
                            <div style={S.section}>
                                <div style={S.sectionHeader}>
                                    <div>
                                        <h2 style={S.sectionTitle}>Form Questions</h2>
                                        <p style={S.sectionDesc}>{form.questions.length} question{form.questions.length !== 1 ? 's' : ''} added</p>
                                    </div>
                                    <button type="button" onClick={addQuestion} style={S.addQBtn}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        Add Question
                                    </button>
                                </div>

                                {/* Template Quick-Add */}
                                <div style={S.templateRow}>
                                    <span style={S.templateLabel}>Quick Templates:</span>
                                    {questionTemplates.map(t => (
                                        <button key={t.label} type="button" onClick={() => addTemplateQuestion(t)} style={S.templateChip}>
                                            + {t.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Questions */}
                                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                                    {form.questions.map((q, idx) => (
                                        <div key={idx} style={{...S.qCard, ...(dragOver === idx ? {borderColor:'#3b82f6',background:'#eff6ff'} : {})}}>
                                            <div style={S.qHeader}>
                                                <div style={{display:'flex',alignItems:'center',gap:10}}>
                                                    <span style={S.qNum}>{idx + 1}</span>
                                                    <span style={{fontSize:16}}>{QUESTION_TYPE_ICONS[q.type]||'❓'}</span>
                                                    <span style={{fontSize:12,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em'}}>{q.type}</span>
                                                </div>
                                                <div style={{display:'flex',gap:4}}>
                                                    <button type="button" onClick={() => moveQuestion(idx,-1)} disabled={idx===0} style={{...S.qIconBtn, ...(idx===0?{opacity:0.3}:{})}} title="Move up">↑</button>
                                                    <button type="button" onClick={() => moveQuestion(idx,1)} disabled={idx===form.questions.length-1} style={{...S.qIconBtn,...(idx===form.questions.length-1?{opacity:0.3}:{})}} title="Move down">↓</button>
                                                    <button type="button" onClick={() => removeQuestion(idx)} style={{...S.qIconBtn,color:'#ef4444'}} title="Remove">✕</button>
                                                </div>
                                            </div>

                                            <div style={S.qBody}>
                                                <div style={{flex:1}}>
                                                    <label style={S.label}>Question Prompt *</label>
                                                    <input style={S.input} required value={q.prompt} onChange={e => updateQuestion(idx,'prompt',e.target.value)} placeholder="Enter your question here…"/>
                                                </div>
                                                <div style={{width:180,flexShrink:0}}>
                                                    <label style={S.label}>Response Type</label>
                                                    <select style={S.input} value={q.type} onChange={e => updateQuestion(idx,'type',e.target.value)}>
                                                        <option value="text">✍️ Text Answer</option>
                                                        <option value="rating">⭐ Star Rating</option>
                                                        <option value="single-choice">🔘 Single Choice</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {(q.type === 'single-choice' || q.type === 'multiple-choice') && (
                                                <div style={{marginTop:10}}>
                                                    <label style={S.label}>Options (comma-separated)</label>
                                                    <input style={S.input} placeholder="Yes, No, Maybe, Not sure" value={q.optionsText} onChange={e => updateQuestion(idx,'optionsText',e.target.value)}/>
                                                </div>
                                            )}

                                            <div style={{marginTop:10}}>
                                                <label style={S.label}>Suggested Answer Templates (comma-separated)</label>
                                                <textarea style={{...S.input, height:56, resize:'vertical'}} placeholder="Great session!, The speaker was excellent..." value={q.answerTemplatesText} onChange={e => updateQuestion(idx,'answerTemplatesText',e.target.value)}/>
                                            </div>

                                            <div style={{marginTop:10,display:'flex',alignItems:'center',gap:8}}>
                                                <input type="checkbox" id={`req-${idx}`} checked={q.required} onChange={e => updateQuestion(idx,'required',e.target.checked)} style={{width:14,height:14,accentColor:'#3b82f6'}}/>
                                                <label htmlFor={`req-${idx}`} style={{fontSize:12,fontWeight:600,color:'#64748b',cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.05em'}}>Mandatory</label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {form.questions.length === 0 && (
                                    <div style={S.emptyQ}>
                                        <span style={{fontSize:40}}>❓</span>
                                        <p style={{marginTop:8,fontSize:14,fontWeight:600,color:'#94a3b8'}}>No questions yet</p>
                                        <p style={{fontSize:12,color:'#cbd5e1'}}>Add a question or use a template above</p>
                                    </div>
                                )}

                                {/* Status Message */}
                                {status.message && (
                                    <div style={{...S.statusBox, ...(status.type==='error' ? S.statusError : S.statusSuccess)}}>
                                        <span style={{fontSize:20}}>{status.type==='error'?'❌':'✅'}</span>
                                        <div style={{flex:1}}>
                                            <p style={{fontWeight:700,fontSize:14,margin:0}}>{status.message}</p>
                                            {shareUrl && (
                                                <div style={S.shareRow}>
                                                    <code style={S.shareCode}>{shareUrl}</code>
                                                    <button type="button" onClick={copyLink} style={S.copyBtn}>{copied?'✓ Copied':'Copy'}</button>
                                                    <Link to={status.link} target="_blank" style={S.openBtn}>Open ↗</Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:24}}>
                                    <button type="button" onClick={() => setActiveSection('settings')} style={S.ghostBtn}>← Back</button>
                                    <button type="submit" style={S.submitBtn}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
                                        Save & Publish Form
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </>
    );
};

const S = {
    main:       { flex:1, overflowY:'auto', background:'#f8fafc', padding:'28px 24px 60px', fontFamily:"'DM Sans', system-ui, sans-serif" },
    wrap:       { maxWidth:860, margin:'0 auto' },
    header:     { display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 },
    backLink:   { display:'inline-flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700, color:'#3b82f6', textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 },
    pageTitle:  { fontSize:24, fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em', margin:0 },
    saveBtn:    { display:'inline-flex', alignItems:'center', gap:8, background:'#0f172a', color:'#fff', padding:'11px 20px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', letterSpacing:'0.01em' },
    stepNav:    { display:'flex', gap:4, background:'#fff', border:'1px solid #e8ecf0', borderRadius:12, padding:6, marginBottom:20, overflowX:'auto' },
    stepBtn:    { flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 16px', borderRadius:8, fontSize:12, fontWeight:700, color:'#64748b', background:'transparent', border:'none', cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.05em' },
    stepBtnActive:{ background:'#0f172a', color:'#fff' },
    stepIcon:   { fontSize:14 },
    section:    { background:'#fff', borderRadius:14, border:'1px solid #e8ecf0', padding:28, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' },
    sectionHeader:{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:12 },
    sectionTitle:{ fontSize:18, fontWeight:800, color:'#0f172a', margin:0, letterSpacing:'-0.01em' },
    sectionDesc:{ fontSize:13, color:'#94a3b8', marginTop:3 },
    fieldGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
    fieldWrap:  { display:'flex', flexDirection:'column', gap:6 },
    label:      { fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em' },
    input:      { width:'100%', background:'#f8fafc', border:'1px solid #e8ecf0', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#0f172a', outline:'none', transition:'border 0.15s, background 0.15s', boxSizing:'border-box', fontFamily:"'DM Sans', system-ui, sans-serif" },
    divider:    { height:1, background:'#f1f5f9', margin:'20px 0' },
    subLabel:   { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 },
    chipRow:    { display:'flex', flexWrap:'wrap', gap:8 },
    chip:       { padding:'7px 14px', borderRadius:99, fontSize:12, fontWeight:600, color:'#64748b', background:'#f8fafc', border:'1.5px solid #e8ecf0', cursor:'pointer', transition:'all 0.15s', letterSpacing:'0.02em' },
    chipOn:     { background:'#0f172a', color:'#fff', borderColor:'#0f172a' },
    nextBtn:    { display:'inline-flex', alignItems:'center', gap:8, background:'#3b82f6', color:'#fff', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', letterSpacing:'0.01em' },
    ghostBtn:   { display:'inline-flex', alignItems:'center', gap:6, background:'transparent', color:'#64748b', padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:600, border:'1.5px solid #e8ecf0', cursor:'pointer' },
    addQBtn:    { display:'inline-flex', alignItems:'center', gap:6, background:'#eff6ff', color:'#2563eb', padding:'9px 16px', borderRadius:9, fontSize:12, fontWeight:700, border:'1.5px solid #bfdbfe', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em' },
    templateRow:{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center', marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e8ecf0' },
    templateLabel:{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginRight:4 },
    templateChip:{ fontSize:11, fontWeight:600, color:'#475569', background:'#fff', border:'1.5px solid #e8ecf0', borderRadius:99, padding:'5px 12px', cursor:'pointer', transition:'all 0.15s' },
    qCard:      { background:'#fafbfc', border:'1.5px solid #e8ecf0', borderRadius:12, padding:'16px 18px', transition:'border-color 0.15s' },
    qHeader:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
    qNum:       { width:26, height:26, borderRadius:8, background:'#0f172a', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
    qBody:      { display:'flex', gap:12, flexWrap:'wrap' },
    qIconBtn:   { width:28, height:28, borderRadius:7, background:'#f1f5f9', border:'1px solid #e8ecf0', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', fontWeight:700 },
    emptyQ:     { textAlign:'center', padding:'40px 20px', border:'2px dashed #e8ecf0', borderRadius:12, marginTop:12 },
    statusBox:  { display:'flex', gap:12, alignItems:'flex-start', padding:'16px 18px', borderRadius:12, marginTop:20, border:'1px solid' },
    statusError:{ background:'#fff5f5', borderColor:'#fecaca', color:'#dc2626' },
    statusSuccess:{ background:'#f0fdf4', borderColor:'#bbf7d0', color:'#166534' },
    shareRow:   { display:'flex', gap:8, alignItems:'center', marginTop:10, flexWrap:'wrap' },
    shareCode:  { fontSize:11, background:'rgba(0,0,0,0.05)', padding:'5px 10px', borderRadius:6, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    copyBtn:    { fontSize:11, fontWeight:700, background:'rgba(0,0,0,0.08)', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', color:'inherit' },
    openBtn:    { fontSize:11, fontWeight:700, textDecoration:'none', color:'inherit', background:'rgba(0,0,0,0.08)', borderRadius:6, padding:'5px 12px' },
    submitBtn:  { display:'inline-flex', alignItems:'center', gap:8, background:'#0f172a', color:'#fff', padding:'12px 24px', borderRadius:10, fontSize:13, fontWeight:700, border:'none', cursor:'pointer', letterSpacing:'0.01em', boxShadow:'0 4px 14px rgba(15,23,42,0.25)' },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
input:focus, select:focus, textarea:focus { border-color: #3b82f6 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
@media (max-width: 640px) {
  .field-grid { grid-template-columns: 1fr !important; }
  .q-body { flex-direction: column !important; }
  .q-body > div:last-child { width: 100% !important; }
}
`;

export default FormCreator;