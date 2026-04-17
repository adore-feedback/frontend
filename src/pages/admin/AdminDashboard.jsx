import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFormResults, getForms, deleteForm, updateFormSettings } from '../../api/feedbackApi';
import { getDemoResults, demoForms } from '../../data/demoFeedback';

const getFormId = (form) => form?._id || form?.id;

const STATUS_META = {
    draft:  { label: 'Draft',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  text: '#92400e' },
    live:   { label: 'Live',   color: '#10b981', bg: 'rgba(16,185,129,0.12)',  text: '#065f46' },
    closed: { label: 'Closed', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: '#374151' },
};

/* ─── Delete Modal ─────────────────────────────────────────────────────────── */
const DeleteModal = ({ form, onConfirm, onCancel, isDeleting, error }) => (
    <div style={S.overlay} onClick={onCancel} role="presentation">
        <div style={S.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={S.modalIconWrap}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
            </div>
            <h3 style={S.modalTitle}>Delete this form?</h3>
            <p style={S.modalDesc}>You are about to permanently delete <strong style={{ color: '#0f172a' }}>"{form?.title}"</strong>. All associated responses will be lost.</p>
            {error && <p style={S.modalError}>{error}</p>}
            <div style={S.modalActions}>
                <button style={S.btnCancel} onClick={onCancel} disabled={isDeleting}>Cancel</button>
                <button style={S.btnDelete} onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={S.spinner}/> Deleting…</span> : 'Yes, Delete'}
                </button>
            </div>
        </div>
    </div>
);

/* ─── Form Settings Modal ──────────────────────────────────────────────────── */
const SettingsModal = ({ form, onSave, onCancel, isSaving, saveError }) => {
    const id = getFormId(form);

    const toLocalDatetimeValue = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        // Format: YYYY-MM-DDTHH:MM (for datetime-local input)
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const [status, setStatus]     = useState(form.status || 'draft');
    const [visibility, setVisibility] = useState(form.visibility || 'public');
    const [opensAt, setOpensAt]   = useState(toLocalDatetimeValue(form.availability?.opensAt));
    const [closesAt, setClosesAt] = useState(toLocalDatetimeValue(form.availability?.closesAt));
    const [slug, setSlug]         = useState(form.slug || '');
    const [allowedList, setAllowedList] = useState((form.allowedRespondents || []).join('\n'));
    const [duplicateFields, setDuplicateFields] = useState((form.duplicateCheckFields || ['email']).join(', '));

    const handleSave = () => {
        const payload = {
            status,
            visibility,
            slug: slug.trim() || undefined,
            availability: {
                opensAt:  opensAt  ? new Date(opensAt).toISOString()  : null,
                closesAt: closesAt ? new Date(closesAt).toISOString() : null,
            },
            allowedRespondents: visibility === 'restricted'
                ? allowedList.split(/[\n,]/).map(s => s.trim()).filter(Boolean)
                : [],
            duplicateCheckFields: duplicateFields.split(',').map(s => s.trim()).filter(Boolean),
        };
        onSave(id, payload);
    };

    const fieldLabel = (txt, hint) => (
        <div style={{ marginBottom: 4 }}>
            <label style={S.inputLabel}>{txt}</label>
            {hint && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{hint}</p>}
        </div>
    );

    return (
        <div style={S.overlay} onClick={onCancel} role="presentation">
            <div style={{ ...S.modal, maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                        </div>
                        <div>
                            <h3 style={{ ...S.modalTitle, margin: 0, fontSize: 15 }}>Form Settings</h3>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{form.title}</p>
                        </div>
                    </div>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20, lineHeight: 1 }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Status */}
                    <div>
                        {fieldLabel('Form Status')}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['draft','live','closed'].map(s => (
                                <button key={s} type="button"
                                    onClick={() => setStatus(s)}
                                    style={{ flex: 1, padding: '8px 4px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: `1.5px solid ${status === s ? STATUS_META[s].color : '#e2e8f0'}`, background: status === s ? STATUS_META[s].bg : '#f8fafc', color: status === s ? STATUS_META[s].text : '#64748b', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                                    {STATUS_META[s].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Availability window */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            {fieldLabel('Opens At', 'Leave blank to open immediately')}
                            <input type="datetime-local" style={S.settingsInput} value={opensAt} onChange={e => setOpensAt(e.target.value)}/>
                        </div>
                        <div>
                            {fieldLabel('Closes At', 'Leave blank for no closing date')}
                            <input type="datetime-local" style={S.settingsInput} value={closesAt} onChange={e => setClosesAt(e.target.value)}/>
                        </div>
                    </div>

                    {/* Slug / link */}
                    <div>
                        {fieldLabel('Form Slug (URL)', 'Changes the shareable URL: /form/{slug}')}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>/form/</span>
                            <input
                                type="text" style={S.settingsInput}
                                placeholder={id}
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            />
                        </div>
                        {slug && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                <code style={{ fontSize: 11, color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: 6, flex: 1 }}>{window.location.origin}/form/{slug}</code>
                                <button type="button" style={S.copyBtn} onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/form/${slug}`)}>Copy</button>
                            </div>
                        )}
                    </div>

                    {/* Visibility */}
                    <div>
                        {fieldLabel('Visibility')}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[['public','🌐 Public'],['restricted','🔒 Restricted']].map(([v,label]) => (
                                <button key={v} type="button"
                                    onClick={() => setVisibility(v)}
                                    style={{ flex: 1, padding: '9px 8px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: `1.5px solid ${visibility === v ? '#3b82f6' : '#e2e8f0'}`, background: visibility === v ? '#eff6ff' : '#f8fafc', color: visibility === v ? '#1d4ed8' : '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Allowed respondents (restricted only) */}
                    {visibility === 'restricted' && (
                        <div>
                            {fieldLabel('Allowed Respondents (Emails)', 'One email per line or comma-separated. These users can access via common link after email verification, or via personalized links.')}
                            <textarea
                                style={{ ...S.settingsInput, minHeight: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                                placeholder="alice@example.com&#10;bob@example.com"
                                value={allowedList}
                                onChange={e => setAllowedList(e.target.value)}
                            />
                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                {allowedList.split(/[\n,]/).map(s => s.trim()).filter(Boolean).length} email{allowedList.split(/[\n,]/).map(s => s.trim()).filter(Boolean).length !== 1 ? 's' : ''} listed
                            </p>
                        </div>
                    )}

                    {/* Duplicate check fields */}
                    <div>
                        {fieldLabel('Duplicate Check Fields', 'Comma-separated field names used to detect duplicate submissions (e.g. email, phone)')}
                        <input type="text" style={S.settingsInput}
                            value={duplicateFields}
                            onChange={e => setDuplicateFields(e.target.value)}
                            placeholder="email, phone"
                        />
                    </div>
                </div>

                {saveError && <p style={{ ...S.modalError, marginTop: 16 }}>{saveError}</p>}

                <div style={{ ...S.modalActions, marginTop: 22 }}>
                    <button style={S.btnCancel} onClick={onCancel} disabled={isSaving}>Cancel</button>
                    <button style={{ ...S.btnDelete, background: '#2563eb', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }} onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={S.spinner}/> Saving…</span> : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */
const SentimentBar = ({ label, value, max, color, emoji }) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div style={S.sentRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                <span style={{ fontSize: 14 }}>{emoji}</span>
                <span style={S.sentLabel}>{label}</span>
            </div>
            <div style={S.sentTrack}>
                <div style={{ ...S.sentFill, width: `${pct}%`, background: color }}/>
            </div>
            <span style={S.sentVal}>{pct}%</span>
        </div>
    );
};

const StatPill = ({ icon, value, label, accent }) => (
    <div style={{ ...S.statPill, borderColor: accent + '30', background: accent + '08' }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        </div>
    </div>
);

const FormTypeBadge = ({ type }) => {
    const colors = {
        webinar: { bg: '#eff6ff', text: '#1d4ed8' },
        flash:   { bg: '#fdf4ff', text: '#7e22ce' },
        default: { bg: '#f8fafc', text: '#475569' },
    };
    const c = colors[type] || colors.default;
    return <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', background: c.bg, color: c.text, padding: '3px 8px', borderRadius: 6 }}>{type || 'form'}</span>;
};

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
const AdminDashboard = () => {
    const [forms, setForms]                   = useState([]);
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [selectedResult, setSelectedResult] = useState({ analytics: {} });
    const [isLoading, setIsLoading]           = useState(true);
    const [filterStatus, setFilterStatus]     = useState('all');
    const [pendingDelete, setPendingDelete]   = useState(null);
    const [isDeleting, setIsDeleting]         = useState(false);
    const [deleteError, setDeleteError]       = useState('');
    const [hoveredRow, setHoveredRow]         = useState(null);

    // Settings modal state
    const [settingsForm, setSettingsForm]   = useState(null);
    const [isSaving, setIsSaving]           = useState(false);
    const [saveError, setSaveError]         = useState('');
    const [saveSuccess, setSaveSuccess]     = useState('');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await getForms();
                const apiForms = Array.isArray(data.forms) ? data.forms : [];
                const merged = apiForms;
                setForms(merged);
                if (merged.length > 0) setSelectedFormId(getFormId(merged[0]));
            } catch {
                setForms([]);
                if (demoForms.length > 0) setSelectedFormId(getFormId(demoForms[0]));
            } finally { setIsLoading(false); }
        };
        load();
    }, []);

    useEffect(() => {
        if (!selectedFormId) return;
        const load = async () => {
            try {
                const data = await getFormResults(selectedFormId);
                setSelectedResult(data);
            } catch { setSelectedResult(getDemoResults(selectedFormId)); }
        };
        load();
    }, [selectedFormId]);

    const requestDelete = useCallback((e, form) => {
        e.stopPropagation(); setDeleteError(''); setPendingDelete(form);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete) return;
        const id = getFormId(pendingDelete);
        setIsDeleting(true); setDeleteError('');
        try {
            await deleteForm(id);
            setForms(prev => {
                const updated = prev.filter(f => getFormId(f) !== id);
                if (selectedFormId === id) setSelectedFormId(updated[0] ? getFormId(updated[0]) : null);
                return updated;
            });
            setPendingDelete(null);
        } catch { setDeleteError('Could not delete. Please try again.'); }
        finally { setIsDeleting(false); }
    }, [pendingDelete, selectedFormId]);

    const cancelDelete = useCallback(() => {
        if (!isDeleting) { setPendingDelete(null); setDeleteError(''); }
    }, [isDeleting]);

    /* ── Settings ── */
    const openSettings = useCallback((e, form) => {
        e.stopPropagation();
        setSaveError('');
        setSaveSuccess('');
        setSettingsForm(form);
    }, []);

    const closeSettings = useCallback(() => {
        if (!isSaving) setSettingsForm(null);
    }, [isSaving]);

    const saveSettings = useCallback(async (id, payload) => {
        setIsSaving(true);
        setSaveError('');
        try {
            console.log("Saving settings...", id, payload);
            const updated = await updateFormSettings(id, payload);
            setForms(prev => prev.map(f => getFormId(f) === id ? { ...f, ...updated.form } : f));
            setSettingsForm(null);
            setSaveSuccess('Settings saved successfully.');
            setTimeout(() => setSaveSuccess(''), 3500);
        } catch (err) {
            setSaveError(err.message || 'Could not save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }, []);

    const filteredForms = useMemo(() => filterStatus === 'all' ? forms : forms.filter(f => f.status === filterStatus), [forms, filterStatus]);
    const selectedForm  = useMemo(() => forms.find(f => getFormId(f) === selectedFormId) || null, [forms, selectedFormId]);

    const analytics      = selectedResult.analytics || {};
    const totalResponses = analytics.totalResponses  || 0;
    const breakdown      = analytics.sentimentBreakdown || [];
    const positiveCount  = breakdown[0]?.count ?? 0;
    const neutralCount   = breakdown[1]?.count ?? 0;
    const negativeCount  = breakdown[2]?.count ?? 0;
    const liveCount      = forms.filter(f => f.status === 'live').length;
    const draftCount     = forms.filter(f => f.status === 'draft').length;
    const avgRating      = analytics.averageRating || selectedForm?.averageRating || null;

    if (isLoading) return (
        <div style={S.loadWrap}>
            <div style={S.loadRing}/>
            <p style={S.loadText}>Loading Dashboard…</p>
            <style>{ANIM}</style>
        </div>
    );

    return (
        <>
            <style>{ANIM}</style>

            {pendingDelete && (
                <DeleteModal form={pendingDelete} onConfirm={confirmDelete} onCancel={cancelDelete} isDeleting={isDeleting} error={deleteError}/>
            )}

            {settingsForm && (
                <SettingsModal form={settingsForm} onSave={saveSettings} onCancel={closeSettings} isSaving={isSaving} saveError={saveError}/>
            )}

            <main style={S.main}>
                {/* ── Top Bar ── */}
                <div style={S.topBar}>
                    <div>
                        <h1 style={S.pageTitle}>Forms Dashboard</h1>
                        <p style={S.pageSubtitle}>{forms.length} form{forms.length !== 1 ? 's' : ''} · {liveCount} live · {draftCount} draft</p>
                    </div>
                    <Link to="/admin/forms/new" style={S.createBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Create New Form
                    </Link>
                </div>

                {/* Save success toast */}
                {saveSuccess && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                        ✅ {saveSuccess}
                    </div>
                )}

                {/* ── Stat Pills ── */}
                <div style={S.statRow}>
                    <StatPill icon="📋" value={forms.length}              label="Total Forms" accent="#3b82f6"/>
                    <StatPill icon="🟢" value={liveCount}                 label="Live"        accent="#10b981"/>
                    <StatPill icon="📬" value={totalResponses.toLocaleString()} label="Responses" accent="#8b5cf6"/>
                    {avgRating && <StatPill icon="⭐" value={avgRating}   label="Avg Rating"  accent="#f59e0b"/>}
                </div>

                {/* ── Main Grid ── */}
                <div style={S.grid} className="dash-grid">
                    {/* Left – Forms Table */}
                    <div style={S.tableCard}>
                        <div style={S.filterRow}>
                            <span style={S.tableHeading}>All Forms</span>
                            <div style={S.filterTabs}>
                                {['all','live','draft','closed'].map(s => (
                                    <button key={s} onClick={() => setFilterStatus(s)} style={{ ...S.filterTab, ...(filterStatus === s ? S.filterTabActive : {}) }}>
                                        {s.charAt(0).toUpperCase()+s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={S.table}>
                                <thead>
                                    <tr style={S.thead}>
                                        <th style={S.th}>Form</th>
                                        <th style={{ ...S.th, textAlign: 'center' }}>Status</th>
                                        <th style={{ ...S.th, textAlign: 'right' }}>Responses</th>
                                        <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredForms.length === 0 ? (
                                        <tr><td colSpan="4" style={S.emptyRow}>No forms found.</td></tr>
                                    ) : filteredForms.map(form => {
                                        const id = getFormId(form);
                                        const sm = STATUS_META[form.status] || STATUS_META.draft;
                                        const isSelected = selectedFormId === id;
                                        const isHovered  = hoveredRow === id;
                                        const isDraft    = form.status === 'draft';
                                        return (
                                            <tr key={id}
                                                onClick={() => setSelectedFormId(id)}
                                                onMouseEnter={() => setHoveredRow(id)}
                                                onMouseLeave={() => setHoveredRow(null)}
                                                style={{ ...S.row, background: isSelected ? '#eff6ff' : isHovered ? '#f8fafc' : '#fff' }}
                                            >
                                                <td style={S.tdName}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                            <span style={S.formTitle}>{form.title}</span>
                                                            <FormTypeBadge type={form.formType}/>
                                                        </div>
                                                        <p style={S.formDesc}>{form.description}</p>
                                                        {form.slug && (
                                                            <code style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, display: 'block' }}>/form/{form.slug}</code>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ ...S.td, textAlign: 'center' }}>
                                                    <span style={{ ...S.statusBadge, background: sm.bg, color: sm.text }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.color, display: 'inline-block' }}/>
                                                        {sm.label}
                                                    </span>
                                                </td>
                                                <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                                                    {(form.responseCount || 0).toLocaleString()}
                                                </td>
                                                <td style={{ ...S.td, textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                        {isDraft && (
                                                            <Link to={`/admin/forms/edit/${id}`} onClick={e => e.stopPropagation()} style={S.actionEdit} title="Continue editing this draft">
                                                                ✏️ Edit
                                                            </Link>
                                                        )}
                                                        {/* Settings button — all statuses */}
                                                        <button onClick={e => openSettings(e, form)} style={S.actionSettings} title="Edit form settings, links & availability">
                                                            ⚙️ Settings
                                                        </button>
                                                        <Link to={`/admin/result/${id}`} onClick={e => e.stopPropagation()} style={S.actionView}>Results</Link>
                                                        <button onClick={e => requestDelete(e, form)} style={S.actionDelete}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right – Analytics Sidebar */}
                    <div style={S.sidebar} className="sidebar">
                        {selectedForm ? (
                            <>
                                {/* Form Preview Card */}
                                <div style={S.sideCard}>
                                    {selectedForm.imageUrl && (
                                        <div style={{ height: 100, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                                            <img src={selectedForm.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                        <div>
                                            <p style={S.sideFormTitle}>{selectedForm.title}</p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                                <FormTypeBadge type={selectedForm.formType}/>
                                                <span style={{ ...S.statusBadge, background: STATUS_META[selectedForm.status]?.bg||'#f8fafc', color: STATUS_META[selectedForm.status]?.text||'#64748b' }}>
                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_META[selectedForm.status]?.color||'#94a3b8', display: 'inline-block' }}/>
                                                    {STATUS_META[selectedForm.status]?.label||'Draft'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Settings button in sidebar — always visible */}
                                        <button
                                            onClick={e => openSettings(e, selectedForm)}
                                            style={S.sideSettingsBtn}
                                            title="Edit settings, links & availability"
                                        >
                                            ⚙️ Settings
                                        </button>
                                    </div>

                                    {/* Closing time indicator */}
                                    {selectedForm.availability?.closesAt && (
                                        <div style={{ marginTop: 10, fontSize: 11, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            Closes {new Date(selectedForm.availability.closesAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}

                                    <div style={S.divider}/>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div style={S.miniStat}>
                                            <span style={S.miniVal}>{(analytics.totalResponses||0).toLocaleString()}</span>
                                            <span style={S.miniLabel}>Responses</span>
                                        </div>
                                        <div style={S.miniStat}>
                                            <span style={S.miniVal}>{analytics.averageRating||selectedForm.averageRating||'—'}</span>
                                            <span style={S.miniLabel}>Avg Rating</span>
                                        </div>
                                        <div style={S.miniStat}>
                                            <span style={S.miniVal}>{analytics.completionRate||'—'}{analytics.completionRate?'%':''}</span>
                                            <span style={S.miniLabel}>Completion</span>
                                        </div>
                                        <div style={S.miniStat}>
                                            <span style={S.miniVal}>{selectedForm.questionCount||0}</span>
                                            <span style={S.miniLabel}>Questions</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sentiment */}
                                <div style={S.sideCard}>
                                    <p style={S.sideCardTitle}>
                                        <span>Sentiment</span>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>{totalResponses} total</span>
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                                        <SentimentBar label="Positive" value={positiveCount} max={totalResponses} color="#10b981" emoji="😊"/>
                                        <SentimentBar label="Neutral"  value={neutralCount}  max={totalResponses} color="#f59e0b" emoji="😐"/>
                                        <SentimentBar label="Negative" value={negativeCount} max={totalResponses} color="#ef4444" emoji="😞"/>
                                    </div>
                                </div>

                                {/* Keywords */}
                                {analytics.topKeywords?.length > 0 && (
                                    <div style={S.sideCard}>
                                        <p style={S.sideCardTitle}><span>Top Keywords</span></p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                            {analytics.topKeywords.slice(0,6).map(k => (
                                                <span key={k.keyword} style={S.keyword}>
                                                    {k.keyword}
                                                    <span style={{ marginLeft: 4, background: '#3b82f6', color: '#fff', borderRadius: 99, padding: '1px 5px', fontSize: 9, fontWeight: 700 }}>{k.count}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                <Link to={`/admin/result/${getFormId(selectedForm)}`} style={S.ctaBtn}>
                                    <span>View Full Results</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </Link>

                                {/* Share link */}
                                {selectedForm.status === 'live' && (
                                    <div style={S.shareBox}>
                                        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Share Link</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <code style={{ flex: 1, fontSize: 10, color: '#3b82f6', background: '#eff6ff', padding: '6px 10px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                /form/{selectedForm.slug || getFormId(selectedForm)}
                                            </code>
                                            <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/form/${selectedForm.slug || getFormId(selectedForm)}`)} style={S.copyBtn}>Copy</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={S.sideCard}>
                                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>Select a form to view analytics</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const S = {
    main:        { flex: 1, overflowY: 'auto', padding: '28px 24px 48px', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#f8fafc' },
    topBar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    pageTitle:   { fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 },
    pageSubtitle:{ fontSize: 13, color: '#94a3b8', marginTop: 3, fontWeight: 500 },
    createBtn:   { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'background 0.2s', letterSpacing: '0.01em' },
    statRow:     { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
    statPill:    { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#fff', border: '1px solid', borderRadius: 12, flex: '1 1 140px', minWidth: 120, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    grid:        { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' },
    tableCard:   { background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    filterRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 10 },
    tableHeading:{ fontSize: 14, fontWeight: 700, color: '#0f172a' },
    filterTabs:  { display: 'flex', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 9, border: '1px solid #e8ecf0' },
    filterTab:   { padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' },
    filterTabActive:{ background: '#fff', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    table:       { width: '100%', borderCollapse: 'collapse', minWidth: 520 },
    thead:       { background: '#fafbfc', borderBottom: '1px solid #f1f5f9' },
    th:          { padding: '12px 20px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'left' },
    row:         { borderBottom: '1px solid #f8fafc', transition: 'background 0.12s', cursor: 'pointer' },
    tdName:      { padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 340 },
    td:          { padding: '14px 20px', fontSize: 13 },
    formTitle:   { fontSize: 13.5, fontWeight: 700, color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 },
    formDesc:    { fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 },
    statusBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' },
    actionEdit:      { fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '5px 10px', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' },
    actionSettings:  { fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' },
    actionView:      { fontSize: 11, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 10px', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' },
    actionDelete:    { fontSize: 11, fontWeight: 700, color: '#dc2626', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' },
    emptyRow:    { textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 40 },
    sidebar:     { display: 'flex', flexDirection: 'column', gap: 14 },
    sideCard:    { background: '#fff', border: '1px solid #e8ecf0', borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
    sideFormTitle:   { fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, margin: 0 },
    sideCardTitle:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
    sideSettingsBtn: { fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
    divider:     { height: 1, background: '#f1f5f9', margin: '14px 0' },
    miniStat:    { background: '#f8fafc', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
    miniVal:     { fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
    miniLabel:   { fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' },
    sentRow:     { display: 'flex', alignItems: 'center', gap: 10 },
    sentLabel:   { fontSize: 11, fontWeight: 600, color: '#64748b' },
    sentTrack:   { flex: 1, height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' },
    sentFill:    { height: '100%', borderRadius: 999, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' },
    sentVal:     { fontSize: 11, fontWeight: 700, color: '#0f172a', minWidth: 32, textAlign: 'right' },
    keyword:     { fontSize: 11, fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center' },
    ctaBtn:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#0f172a', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 13, fontWeight: 700, transition: 'background 0.2s', letterSpacing: '0.01em' },
    shareBox:    { background: '#f8fafc', border: '1px solid #e8ecf0', borderRadius: 12, padding: 14 },
    copyBtn:     { fontSize: 10, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' },
    loadWrap:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', gap: 12 },
    loadRing:    { width: 36, height: 36, border: '3px solid #e8ecf0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
    loadText:    { fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' },
    overlay:     { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 },
    modal:       { background: '#fff', borderRadius: 18, padding: '28px 26px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' },
    modalIconWrap:{ width: 48, height: 48, background: '#fff5f5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    modalTitle:  { fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 },
    modalDesc:   { fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 },
    modalError:  { fontSize: 12, color: '#dc2626', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 16 },
    modalActions:{ display: 'flex', gap: 10 },
    btnCancel:   { flex: 1, padding: 11, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' },
    btnDelete:   { flex: 1, padding: 11, background: '#dc2626', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' },
    spinner:     { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' },
    inputLabel:  { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' },
    settingsInput:{ width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '9px 13px', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', system-ui", transition: 'border 0.15s' },
};

const ANIM = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
input[type="datetime-local"]:focus, input[type="text"]:focus, textarea:focus {
  border-color: #3b82f6 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
}
@media (max-width: 900px) {
  .dash-grid { grid-template-columns: 1fr !important; }
  .sidebar { display: none !important; }
}
`;

export default AdminDashboard;