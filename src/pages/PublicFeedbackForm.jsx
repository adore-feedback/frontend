import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicForm, submitPublicFormResponse } from '../api/feedbackApi';

const getSentiment = (rating) => {
    const v = Number(rating);
    return v >= 4 ? 'positive' : v <= 2 ? 'negative' : 'neutral';
};

const StarRating = ({ value, onChange }) => {
    const [hovered, setHovered] = useState(0);
    const current = hovered || Number(value) || 0;
    const LABELS  = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
    return (
        <div>
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 0'}}>
                {[1,2,3,4,5].map(star => (
                    <button
                        key={star} type="button"
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => onChange(String(star))}
                        style={{background:'none',border:'none',cursor:'pointer',padding:4,transition:'transform 0.15s',transform: star<=current?'scale(1.15)':'scale(1)'}}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill={star<=current?'#f59e0b':'none'} stroke={star<=current?'#f59e0b':'#d1d5db'} strokeWidth="1.5">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </button>
                ))}
                {current > 0 && (
                    <span style={{fontSize:13,fontWeight:700,color:'#f59e0b',marginLeft:8}}>
                        {LABELS[current]}
                    </span>
                )}
            </div>
        </div>
    );
};

const PublicFeedbackForm = () => {
    const { formId } = useParams();
    const [form, setForm]           = useState(null);
    const [respondent, setRespondent] = useState({ name:'', email:'', phone:'', uniqueId:'', companyName:'', companyDetails:'' });
    const [answers, setAnswers]     = useState({});
    const [status, setStatus]       = useState({ type:'', message:'' });
    const [isLoading, setIsLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [activeQ, setActiveQ]     = useState(null);

    const loadForm = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPublicForm(formId);
            setForm(data.form);
        } catch (err) { setStatus({ type:'error', message: err.message }); }
        finally { setIsLoading(false); }
    }, [formId]);

    useEffect(() => { loadForm(); }, [loadForm]);

    const ratingQ     = useMemo(() => form?.questions?.find(q => q.type === 'rating'), [form]);
    const ratingValue = answers[ratingQ?.id] || null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            respondent,
            rating: ratingValue || undefined,
            ...(ratingValue != null && ratingValue !== '' ? { sentiment: getSentiment(ratingValue) } : {}),
            answers: form.questions.map(q => ({ questionId: q.id, prompt: q.prompt, type: q.type, value: answers[q.id] ?? '' })),
        };
        try {
            await submitPublicFormResponse(form.id || form.slug, payload);
            setSubmitted(true);
        } catch (err) { setStatus({ type:'error', message: err.message }); }
    };

    if (isLoading) return (
        <div style={S.loadWrap}>
            <style>{CSS}</style>
            <div style={S.loadRing}/>
            <p style={S.loadText}>Loading Form…</p>
        </div>
    );

    if (submitted) return (
        <div style={S.successWrap}>
            <style>{CSS}</style>
            <div style={S.successCard}>
                <div style={S.successIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <h1 style={S.successTitle}>Thank you!</h1>
                <p style={S.successDesc}>
                    Your feedback for <strong style={{color:'#3b82f6'}}>{form?.title}</strong> has been securely recorded.
                </p>
                <div style={S.successDivider}/>
                <p style={{fontSize:12,color:'#94a3b8',margin:0}}>You may close this window.</p>
            </div>
        </div>
    );

    if (!form) return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f8fafc',fontFamily:"'DM Sans',system-ui"}}>
            <style>{CSS}</style>
            <div style={{textAlign:'center',padding:40}}>
                <span style={{fontSize:48}}>❌</span>
                <p style={{fontSize:16,fontWeight:700,color:'#ef4444',marginTop:12}}>{status.message || 'Form not found.'}</p>
            </div>
        </div>
    );

    const FORM_TYPE_ICONS = { webinar:'🎙️', flash:'⚡', survey:'📊', default:'📋' };
    const typeIcon = FORM_TYPE_ICONS[form.formType] || FORM_TYPE_ICONS.default;

    return (
        <main style={S.main}>
            <style>{CSS}</style>

            {/* Hero Header */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.formTypePill}>
                        <span>{typeIcon}</span>
                        <span>{form.formType || 'Feedback Form'}</span>
                    </div>
                    <h1 style={S.heroTitle}>{form.title}</h1>
                    {form.description && <p style={S.heroDesc}>{form.description}</p>}
                </div>
                {/* Decorative dots */}
                <div style={S.heroDots}/>
            </div>

            {/* Progress hint */}
            <div style={{background:'#fff',borderBottom:'1px solid #e8ecf0'}}>
                <div style={{maxWidth:680,margin:'0 auto',padding:'10px 20px',display:'flex',alignItems:'center',gap:8}}>
                    <div style={{height:3,flex:1,background:'#e8ecf0',borderRadius:999,overflow:'hidden'}}>
                        <div style={{height:'100%',width:'20%',background:'linear-gradient(90deg,#3b82f6,#6366f1)',borderRadius:999}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:'#94a3b8',whiteSpace:'nowrap'}}>Secure · Confidential</span>
                </div>
            </div>

            <div style={S.formWrap}>
                <form style={{display:'flex',flexDirection:'column',gap:16}} onSubmit={handleSubmit}>

                    {/* Participant Card */}
                    <div style={S.card}>
                        <div style={S.cardHeader}>
                            <span style={S.cardIcon}>👤</span>
                            <h2 style={S.cardTitle}>Participant Details</h2>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                            <div style={S.inputWrap}>
                                <label style={S.inputLabel}>Full Name <span style={{color:'#ef4444'}}>*</span></label>
                                <input style={S.input} required placeholder="Your full name" value={respondent.name} onChange={e => setRespondent({...respondent,name:e.target.value})}/>
                            </div>
                            <div style={S.inputWrap}>
                                <label style={S.inputLabel}>Email Address</label>
                                <input style={S.input} type="email" placeholder="you@example.com" value={respondent.email} onChange={e => setRespondent({...respondent,email:e.target.value})}/>
                            </div>
                            {form.collectsPhone && (
                                <div style={S.inputWrap}>
                                    <label style={S.inputLabel}>Phone {form.phoneRequired && <span style={{color:'#ef4444'}}>*</span>}</label>
                                    <input style={S.input} type="tel" placeholder="+1 (555) 000-0000" required={form.phoneRequired} value={respondent.phone} onChange={e => setRespondent({...respondent,phone:e.target.value})}/>
                                </div>
                            )}
                            {form.collectsCompanyDetails && (
                                <div style={S.inputWrap}>
                                    <label style={S.inputLabel}>Company Name {form.companyDetailsRequired && <span style={{color:'#ef4444'}}>*</span>}</label>
                                    <input style={S.input} placeholder="Your organization" required={form.companyDetailsRequired} value={respondent.companyName} onChange={e => setRespondent({...respondent,companyName:e.target.value})}/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Questions */}
                    {form.questions.map((q, idx) => (
                        <div key={q.id} style={{...S.card, ...(activeQ===q.id?S.cardFocused:{})}} onClick={() => setActiveQ(q.id)}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                                <div style={S.qNum}>{idx + 1}</div>
                                <label style={S.qPrompt}>
                                    {q.prompt}
                                    {q.required && <span style={{color:'#ef4444',marginLeft:4}}>*</span>}
                                </label>
                            </div>

                            {q.type === 'rating' && (
                                <StarRating value={answers[q.id]||''} onChange={val => setAnswers({...answers,[q.id]:val})}/>
                            )}

                            {q.type === 'text' && (
                                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                    <textarea
                                        style={S.textarea}
                                        required={q.required}
                                        value={answers[q.id]||''}
                                        onChange={e => setAnswers({...answers,[q.id]:e.target.value})}
                                        placeholder="Share your thoughts…"
                                    />
                                    {q.answerTemplates?.length > 0 && (
                                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                                            <span style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em',alignSelf:'center',marginRight:4}}>Templates:</span>
                                            {q.answerTemplates.slice(0,3).map(t => (
                                                <button key={t} type="button" onClick={() => setAnswers({...answers,[q.id]:t})} style={S.templateBtn}>
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {q.type === 'single-choice' && (
                                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                    {(q.options||[]).map(opt => (
                                        <label key={opt} style={{
                                            ...S.choiceLabel,
                                            ...(answers[q.id]===opt ? S.choiceLabelSelected : {}),
                                        }}>
                                            <div style={{
                                                ...S.choiceCircle,
                                                ...(answers[q.id]===opt ? S.choiceCircleSelected : {}),
                                            }}>
                                                {answers[q.id]===opt && <div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                                            </div>
                                            <input type="radio" className="sr-only" checked={answers[q.id]===opt} onChange={() => setAnswers({...answers,[q.id]:opt})} style={{display:'none'}}/>
                                            <span style={{fontSize:13,fontWeight:answers[q.id]===opt?700:500}}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Error */}
                    {status.type === 'error' && (
                        <div style={{background:'#fff5f5',border:'1px solid #fecaca',borderRadius:12,padding:'14px 16px',display:'flex',gap:10,alignItems:'center'}}>
                            <span style={{fontSize:18}}>⚠️</span>
                            <p style={{fontSize:13,color:'#dc2626',fontWeight:600,margin:0}}>{status.message}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit" style={S.submitBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Submit Feedback
                    </button>

                    <p style={{textAlign:'center',fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>
                        🔒 Verified · Secure · Powered by Simtrak Feedback Hub
                    </p>
                </form>
            </div>
        </main>
    );
};

const S = {
    main:        { minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans', system-ui, sans-serif", paddingBottom:60 },
    loadWrap:    { display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#f8fafc',gap:16 },
    loadRing:    { width:40,height:40,border:'3px solid #e8ecf0',borderTopColor:'#3b82f6',borderRadius:'50%',animation:'spin 0.7s linear infinite' },
    loadText:    { fontSize:12,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.1em' },
    successWrap: { display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'linear-gradient(135deg,#f8fafc,#eff6ff)',padding:20,fontFamily:"'DM Sans',system-ui" },
    successCard: { background:'#fff',borderRadius:20,padding:'48px 40px',textAlign:'center',maxWidth:440,boxShadow:'0 20px 60px rgba(59,130,246,0.12)',border:'1px solid #e8ecf0' },
    successIcon: { width:72,height:72,borderRadius:20,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(16,185,129,0.35)' },
    successTitle:{ fontSize:28,fontWeight:800,color:'#0f172a',margin:'0 0 8px',letterSpacing:'-0.02em' },
    successDesc: { fontSize:14,color:'#64748b',lineHeight:1.6,margin:'0 0 20px' },
    successDivider:{ height:1,background:'#f1f5f9',margin:'20px 0' },
    hero:        { background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#1d4ed8 100%)',padding:'60px 20px',position:'relative',overflow:'hidden' },
    heroInner:   { maxWidth:640,margin:'0 auto',position:'relative',zIndex:1 },
    formTypePill:{ display:'inline-flex',alignItems:'center',gap:6,fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',padding:'6px 12px',borderRadius:99,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16 },
    heroTitle:   { fontSize:30,fontWeight:800,color:'#fff',letterSpacing:'-0.02em',lineHeight:1.2,margin:'0 0 10px' },
    heroDesc:    { fontSize:14,color:'rgba(255,255,255,0.7)',lineHeight:1.6,margin:0 },
    heroDots:    { position:'absolute',right:-40,top:-40,width:300,height:300,background:'radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)',borderRadius:'50%' },
    formWrap:    { maxWidth:680,margin:'0 auto',padding:'24px 20px' },
    card:        { background:'#fff',borderRadius:14,border:'1px solid #e8ecf0',padding:'22px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',transition:'border-color 0.2s, box-shadow 0.2s',cursor:'default' },
    cardFocused: { borderColor:'#3b82f6',boxShadow:'0 0 0 3px rgba(59,130,246,0.1)' },
    cardHeader:  { display:'flex',alignItems:'center',gap:10,marginBottom:18 },
    cardIcon:    { fontSize:20 },
    cardTitle:   { fontSize:13,fontWeight:700,color:'#0f172a',textTransform:'uppercase',letterSpacing:'0.06em',margin:0 },
    inputWrap:   { display:'flex',flexDirection:'column',gap:6 },
    inputLabel:  { fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.07em' },
    input:       { width:'100%',background:'#f8fafc',border:'1.5px solid #e8ecf0',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#0f172a',outline:'none',transition:'border 0.15s, background 0.15s',boxSizing:'border-box',fontFamily:"'DM Sans',system-ui" },
    qNum:        { width:26,height:26,borderRadius:8,background:'#0f172a',color:'#fff',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
    qPrompt:     { fontSize:14,fontWeight:700,color:'#0f172a',lineHeight:1.4 },
    textarea:    { width:'100%',minHeight:100,background:'#f8fafc',border:'1.5px solid #e8ecf0',borderRadius:9,padding:'12px 14px',fontSize:13,color:'#0f172a',outline:'none',resize:'vertical',fontFamily:"'DM Sans',system-ui",lineHeight:1.6,boxSizing:'border-box' },
    templateBtn: { fontSize:11,fontWeight:600,color:'#475569',background:'#f1f5f9',border:'1px solid #e8ecf0',borderRadius:99,padding:'5px 12px',cursor:'pointer',transition:'all 0.15s' },
    choiceLabel: { display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:10,border:'1.5px solid #e8ecf0',cursor:'pointer',transition:'all 0.15s',background:'#fafbfc' },
    choiceLabelSelected:{ borderColor:'#3b82f6',background:'#eff6ff',color:'#1d4ed8' },
    choiceCircle:{ width:20,height:20,borderRadius:'50%',border:'2px solid #e8ecf0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.15s' },
    choiceCircleSelected:{ border:'2px solid #3b82f6',background:'#3b82f6' },
    submitBtn:   { display:'flex',alignItems:'center',justifyContent:'center',gap:10,width:'100%',padding:'16px',background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',color:'#fff',border:'none',borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',letterSpacing:'0.02em',textTransform:'uppercase',boxShadow:'0 8px 24px rgba(59,130,246,0.35)',transition:'transform 0.15s, box-shadow 0.15s' },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
input:focus, textarea:focus { border-color: #3b82f6 !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.08) !important; }
button[type="submit"]:hover { transform: translateY(-1px) !important; box-shadow: 0 12px 32px rgba(59,130,246,0.45) !important; }
button[type="submit"]:active { transform: translateY(0) !important; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
@media (max-width: 600px) {
  div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
}
`;

export default PublicFeedbackForm;