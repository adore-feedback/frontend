import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { createForm, updateForm, updateFormSettings, getForm } from "../../api/feedbackApi";

/* ─── helpers ──────────────────────────────────────── */
const DRAFT_KEY = "simtrak_form_draft";
const TEMPLATES_KEY = "simtrak_question_templates";

const emptyQuestion = () => ({
  prompt: "",
  type: "text",
  required: false,
  optionsText: "",
  answerTemplatesText: "",
});

const splitList = (v) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const saveDraft = (data) => {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...data, _savedAt: Date.now() }),
    );
  } catch {}
};
const loadDraft = () => {
  try {
    const d = localStorage.getItem(DRAFT_KEY);
    return d ? JSON.parse(d) : null;
  } catch {
    return null;
  }
};
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
};

/* ── Question template persistence ── */
const loadSavedTemplates = () => {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const saveTemplate = (tpl) => {
  try {
    const existing = loadSavedTemplates();
    // Avoid exact-prompt duplicates — update savedAt instead
    const filtered = existing.filter((t) => t.prompt !== tpl.prompt);
    const updated = [{ ...tpl, savedAt: Date.now() }, ...filtered];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};
const deleteTemplate = (prompt) => {
  try {
    const existing = loadSavedTemplates();
    const updated = existing.filter((t) => t.prompt !== prompt);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

/**
 * Compute a default closesAt value.
 * Flash forms: required (no default — user must set).
 * All others: default to now + 5 days.
 */
const defaultClosesAt = (formType) => {
  if (formType === "flash") return ""; // must be set explicitly
  const d = new Date();
  d.setDate(d.getDate() + 5);
  // datetime-local format: YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
};

/** Convert a saved form (from API) back to FormCreator's working state shape */
const formToState = (apiForm) => ({
  title: apiForm.title || "",
  description: apiForm.description || "",
  formType: apiForm.formType || "",
  status: apiForm.status || "draft",
  visibility: apiForm.visibility || "public",
  allowedRespondentsText: (apiForm.allowedRespondents || []).join(", "),
  collectsPhone: !!apiForm.collectsPhone,
  phoneRequired: !!apiForm.phoneRequired,
  collectsCompanyDetails: !!apiForm.collectsCompanyDetails,
  companyDetailsRequired: !!apiForm.companyDetailsRequired,
  duplicateCheckFields: apiForm.duplicateCheckFields || ["email"],
  opensAt: apiForm.availability?.opensAt
    ? new Date(apiForm.availability.opensAt).toISOString().slice(0, 16)
    : "",
  closesAt: apiForm.availability?.closesAt
    ? new Date(apiForm.availability.closesAt).toISOString().slice(0, 16)
    : "",
  singleSession: !!apiForm.availability?.singleSession,
  sessionKey: apiForm.availability?.sessionKey || "",
  questions: (apiForm.questions || []).map((q) => ({
    ...q,
    optionsText: (q.options || []).join(", "),
    answerTemplatesText: (q.answerTemplates || []).join(", "),
  })),
  personalizations: apiForm.personalizations || [],
});

const BUILTIN_QUESTION_TEMPLATES = [
  {
    label: "Overall Rating",
    prompt: "How would you rate your overall experience?",
    type: "rating",
    required: true,
    optionsText: "",
    answerTemplatesText: "",
  },
  {
    label: "What Worked",
    prompt: "What did you like the most?",
    type: "text",
    required: false,
    optionsText: "",
    answerTemplatesText:
      "The session was useful because...,I liked the presenter because...",
  },
  {
    label: "Improvements",
    prompt: "What could be improved?",
    type: "text",
    required: false,
    optionsText: "",
    answerTemplatesText: "More examples would help,The session was too long",
  },
  {
    label: "Recommend?",
    prompt: "Would you recommend this to others?",
    type: "single-choice",
    required: false,
    optionsText: "Yes definitely,Probably yes,Not sure,Probably not",
    answerTemplatesText: "",
  },
];

const QTYPE_ICONS = {
  text: "✍️",
  rating: "⭐",
  "single-choice": "🔘",
  "multiple-choice": "☑️",
};

const INITIAL_FORM = {
  title: "",
  description: "",
  formType: "",
  status: "draft",
  visibility: "public",
  allowedRespondentsText: "",
  collectsPhone: true,
  phoneRequired: false,
  collectsCompanyDetails: true,
  companyDetailsRequired: false,
  duplicateCheckFields: ["email", "phone"],
  opensAt: "",
  closesAt: "",
  singleSession: false,
  sessionKey: "",
  questions: [emptyQuestion()],
  personalizations: [],
};

/* ─── sub-components ───────────────────────────────── */
const DraftBanner = ({ draft, onRestore, onDiscard }) => (
  <div className="fc-draft-banner">
    <div className="fc-draft-banner-left">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#b45309"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span>
        You have an unsaved draft from{" "}
        <strong>
          {new Date(draft._savedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </strong>
        . Restore it?
      </span>
    </div>
    <div className="fc-draft-banner-actions">
      <button type="button" className="fc-draft-restore" onClick={onRestore}>
        Restore
      </button>
      <button type="button" className="fc-draft-discard" onClick={onDiscard}>
        Discard
      </button>
    </div>
  </div>
);

const PersonalizationEditor = ({ respondents, personalizations, onChange }) => {
  const getP = (id) =>
    personalizations.find((p) => p.identifier === id) || {
      identifier: id,
      name: "",
      prefillData: {},
    };

  const update = (id, field, value) => {
    const existing = getP(id);
    const updated = { ...existing, [field]: value };
    const rest = personalizations.filter((p) => p.identifier !== id);
    onChange([...rest, updated]);
  };

  if (!respondents.length)
    return (
      <div className="fc-empty-state" style={{ padding: "16px", marginTop: 8 }}>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
          Add allowed respondent emails above to configure personalization.
        </p>
      </div>
    );

  return (
    <div className="fc-personalization-list">
      {respondents.map((id) => {
        const p = getP(id);
        return (
          <div key={id} className="fc-person-row">
            <div className="fc-person-id">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{id}</span>
            </div>
            <input
              className="fc-input fc-person-name"
              placeholder="Greeting name (e.g. John)"
              value={p.name || ""}
              onChange={(e) => update(id, "name", e.target.value)}
            />
            <input
              className="fc-input fc-person-company"
              placeholder="Pre-fill company name (optional)"
              value={p.prefillData?.companyName || ""}
              onChange={(e) =>
                update(id, "prefillData", {
                  ...p.prefillData,
                  companyName: e.target.value,
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
};

/* ── PersonalizedLinksPanel ── */
const PersonalizedLinksPanel = ({
  formId,
  formSlug,
  personalizations,
  allowedRespondents,
}) => {
  const [copied, setCopied] = useState("");
  const base = `${window.location.origin}/form/${formSlug || formId}`;

  const buildUrl = (identifier, p) => {
    const params = new URLSearchParams();
    params.set("email", identifier);
    if (p?.name) params.set("name", p.name);
    if (p?.prefillData?.companyName)
      params.set("company", p.prefillData.companyName);
    return `${base}?${params.toString()}`;
  };

  const copyAll = () => {
    const text = allowedRespondents
      .map((id) => {
        const p = personalizations.find((x) => x.identifier === id);
        return `${p?.name || id}: ${buildUrl(id, p)}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied("all");
      setTimeout(() => setCopied(""), 2000);
    });
  };

  if (!allowedRespondents.length) return null;

  return (
    <div className="fc-personalized-links">
      <div className="fc-personalized-links-header">
        <p className="fc-sub-label" style={{ margin: 0 }}>
          🔗 Personalized Links
        </p>
        <button type="button" className="fc-copy-btn" onClick={copyAll}>
          {copied === "all" ? "✓ Copied All" : "Copy All"}
        </button>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "#64748b",
          margin: "6px 0 12px",
          lineHeight: 1.5,
        }}
      >
        Each link pre-fills the respondent's details and greets them by name.
      </p>
      <div className="fc-pl-list">
        {allowedRespondents.map((id) => {
          const p = personalizations.find((x) => x.identifier === id);
          const url = buildUrl(id, p);
          return (
            <div key={id} className="fc-pl-row">
              <div className="fc-pl-info">
                <span className="fc-pl-name">{p?.name || id}</span>
                <span className="fc-pl-email">{id}</span>
              </div>
              <code className="fc-pl-url" title={url}>
                {url}
              </code>
              <button
                type="button"
                className="fc-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(id);
                    setTimeout(() => setCopied(""), 2000);
                  });
                }}
              >
                {copied === id ? "✓" : "Copy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── SavedTemplatesPanel ── */
const SavedTemplatesPanel = ({ savedTemplates, onUse, onDelete }) => {
  const [open, setOpen] = useState(false);
  if (!savedTemplates.length) return null;
  return (
    <div className="fc-saved-tpl-wrap">
      <button
        type="button"
        className="fc-saved-tpl-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        My Templates ({savedTemplates.length})
        <span style={{ marginLeft: "auto", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="fc-saved-tpl-list">
          {savedTemplates.map((t) => (
            <div key={t.prompt} className="fc-saved-tpl-row">
              <div className="fc-saved-tpl-info">
                <span className="fc-saved-tpl-prompt">{t.prompt}</span>
                <span className="fc-saved-tpl-meta">
                  {QTYPE_ICONS[t.type] || "❓"} {t.type}
                  {t.savedAt ? ` · ${new Date(t.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                </span>
              </div>
              <button type="button" className="fc-template-chip" onClick={() => onUse(t)}>
                + Use
              </button>
              <button
                type="button"
                className="fc-q-icon-btn fc-q-icon-btn--danger"
                style={{ width: 24, height: 24, fontSize: 11 }}
                onClick={() => onDelete(t.prompt)}
                title="Delete template"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══ FormCreator ═══════════════════════════════════ */
const FormCreator = () => {
  const { editFormId } = useParams();
  const isEditMode = !!editFormId;

  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState({ type: "", message: "", link: "" });
  const [shareUrl, setShareUrl] = useState("");
  const [publishedFormId, setPublishedFormId] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("info");
  const [draftData, setDraftData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(isEditMode);
  const [savedFormId, setSavedFormId] = useState(isEditMode ? editFormId : null);
  const [savedTemplates, setSavedTemplates] = useState(loadSavedTemplates);
  // Track which question index is being saved as template
  const [savingTplIdx, setSavingTplIdx] = useState(null);
  const autoSaveTimerRef = useRef(null);

  /* ── Load existing form when in edit mode ── */
  useEffect(() => {
    if (!isEditMode) return;
    const load = async () => {
      setIsLoadingEdit(true);
      try {
        const data = await getForm(editFormId);
        const apiForm = data.form || data;
        setForm(formToState(apiForm));
        setSavedFormId(apiForm._id || apiForm.id || editFormId);
        clearDraft();
      } catch (err) {
        setStatus({ type: "error", message: `Could not load form: ${err.message}` });
      } finally {
        setIsLoadingEdit(false);
      }
    };
    load();
  }, [editFormId, isEditMode]);

  /* ── Load local draft on mount (only for new forms) ── */
  useEffect(() => {
    if (isEditMode) return;
    const d = loadDraft();
    if (d && d._savedAt) setDraftData(d);
  }, [isEditMode]);

  /* ── When formType changes, set default closesAt (for new forms only) ── */
  useEffect(() => {
    if (isEditMode) return;
    if (!form.formType) return;
    if (form.formType !== "flash" && !form.closesAt) {
      setForm((c) => ({ ...c, closesAt: defaultClosesAt(c.formType) }));
    }
    // Flash: clear the auto-default if it was set
    if (form.formType === "flash" && form.closesAt === defaultClosesAt("webinar")) {
      setForm((c) => ({ ...c, closesAt: "" }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.formType, isEditMode]);

  /* ── Debounced auto-save to localStorage ── */
  useEffect(() => {
    if (!isDirty) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { saveDraft(form); }, 3000);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [form, isDirty]);

  /* ── Block navigation when dirty ── */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === "blocked") {
      saveDraft(form);
      blocker.proceed();
    }
  }, [blocker, form]);

  const restoreDraft = () => {
    const { _savedAt, ...rest } = draftData;
    setForm({ ...INITIAL_FORM, ...rest });
    setDraftData(null);
    setIsDirty(true);
  };
  const discardDraft = () => {
    clearDraft();
    setDraftData(null);
  };

  /* ── Field helpers ── */
  const updateField = useCallback((field, value) => {
    setForm((c) => ({ ...c, [field]: value }));
    setIsDirty(true);
  }, []);

  const updateQuestion = useCallback((idx, field, value) => {
    setForm((c) => ({
      ...c,
      questions: c.questions.map((q, i) =>
        i === idx ? { ...q, [field]: value } : q,
      ),
    }));
    setIsDirty(true);
  }, []);

  const addQuestion = () => {
    setForm((c) => ({ ...c, questions: [...c.questions, emptyQuestion()] }));
    setIsDirty(true);
  };
  const removeQuestion = (idx) => {
    setForm((c) => ({ ...c, questions: c.questions.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  };
  const addTemplate = (t) => {
    const { label, savedAt, ...rest } = t;
    setForm((c) => ({
      ...c,
      questions: [...c.questions, { ...emptyQuestion(), ...rest }],
    }));
    setIsDirty(true);
  };
  const moveQuestion = (idx, dir) => {
    setForm((c) => {
      const qs = [...c.questions];
      const target = idx + dir;
      if (target < 0 || target >= qs.length) return c;
      [qs[idx], qs[target]] = [qs[target], qs[idx]];
      return { ...c, questions: qs };
    });
    setIsDirty(true);
  };

  /* ── Save current question as template ── */
  const handleSaveAsTemplate = (idx) => {
    const q = form.questions[idx];
    if (!q.prompt.trim()) return;
    setSavingTplIdx(idx);
    const tpl = {
      prompt: q.prompt,
      type: q.type,
      required: q.required,
      optionsText: q.optionsText,
      answerTemplatesText: q.answerTemplatesText,
    };
    const updated = saveTemplate(tpl);
    setSavedTemplates(updated);
    setTimeout(() => setSavingTplIdx(null), 1200);
  };

  const handleDeleteTemplate = (prompt) => {
    const updated = deleteTemplate(prompt);
    setSavedTemplates(updated);
  };

  const allowedRespondents = splitList(form.allowedRespondentsText);

  /* ── Build content payload (questions + basic info, NO settings) ── */
  const buildContentPayload = () => ({
    title: form.title,
    description: form.description,
    formType: form.formType,
    collectsPhone: form.collectsPhone,
    phoneRequired: form.phoneRequired,
    collectsCompanyDetails: form.collectsCompanyDetails,
    companyDetailsRequired: form.companyDetailsRequired,
    personalizations: form.personalizations,
    questions: form.questions.map((q) => ({
      ...q,
      options: splitList(q.optionsText),
      answerTemplates: splitList(q.answerTemplatesText),
    })),
  });

  /* ── Build settings payload (sent to /settings endpoint) ── */
  const buildSettingsPayload = (overrideStatus) => ({
    status: overrideStatus || form.status,
    visibility: form.visibility,
    allowedRespondents,
    personalizations: form.personalizations,
    duplicateCheckFields: form.duplicateCheckFields,
    availability: {
      opensAt: form.opensAt || null,
      closesAt: form.closesAt || null,
      singleSession: form.singleSession,
      sessionKey: form.sessionKey,
    },
  });

  /* ── Save as Draft (to server) ── */
  const saveDraftToServer = async () => {
    setIsSaving(true);
    try {
      let fId = savedFormId;
      const contentPayload = buildContentPayload();
      if (fId) {
        await updateForm(fId, contentPayload);
      } else {
        const data = await createForm({ ...contentPayload, status: "draft" });
        fId = data.form._id || data.form.id;
        setSavedFormId(fId);
      }
      // Now save settings separately
      await updateFormSettings(fId, buildSettingsPayload("draft"));
      clearDraft();
      setIsDirty(false);
      setStatus({ type: "draft", message: "Draft saved. You can continue editing or publish it later." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Could not save draft." });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Publish / Submit ── */
  const submitForm = async (e) => {
    e.preventDefault();
    // Flash forms must have a closing time
    if (form.formType === "flash" && !form.closesAt) {
      setStatus({ type: "error", message: "Flash forms must have a closing time. Please set it in Settings." });
      setActiveSection("settings");
      return;
    }
    setStatus({ type: "", message: "", link: "" });
    setIsSaving(true);
    try {
      let fId = savedFormId;
      const contentPayload = buildContentPayload();
      let fSlug;
      if (fId) {
        const data = await updateForm(fId, contentPayload);
        fSlug = data.form?.slug || fId;
      } else {
        const data = await createForm({ ...contentPayload, status: "draft" });
        fId = data.form._id || data.form.id;
        fSlug = data.form?.slug || fId;
        setSavedFormId(fId);
      }
      // Push settings + go live
      const settingsData = await updateFormSettings(fId, buildSettingsPayload("live"));
      fSlug = settingsData.form?.slug || fSlug;

      setPublishedFormId(fId);
      setPublishedSlug(fSlug);
      setShareUrl(`${window.location.origin}/form/${fSlug}`);
      setStatus({
        type: "success",
        message: "Form published successfully!",
        link: `/form/${fSlug}`,
      });
      clearDraft();
      setIsDirty(false);
      setActiveSection("done");
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Could not publish form." });
    } finally {
      setIsSaving(false);
    }
  };

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const SECTIONS = [
    { id: "info", label: "General Info", icon: "📋" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "questions", label: `Questions (${form.questions.length})`, icon: "❓" },
  ];

  if (isLoadingEdit)
    return (
      <main className="fc-main">
        <style>{CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <span className="fc-spinner" style={{ width: 28, height: 28, border: "3px solid #e8ecf0", borderTopColor: "#3b82f6" }} />
          <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Loading form…</p>
        </div>
      </main>
    );

  return (
    <>
      <style>{CSS}</style>
      <main className="fc-main">
        <div className="fc-wrap">
          {!isEditMode && draftData && (
            <DraftBanner draft={draftData} onRestore={restoreDraft} onDiscard={discardDraft} />
          )}

          {/* Header */}
          <div className="fc-header">
            <div>
              <Link to="/admin" className="fc-back-link">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="fc-page-title">
                {isEditMode ? "✏️ Edit Draft Form" : "Create New Form"}
              </h1>
              {isEditMode && (
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 }}>
                  Picking up where you left off — changes auto-save to your draft.
                </p>
              )}
            </div>
            {activeSection !== "done" && (
              <div className="fc-header-actions">
                {isDirty && (
                  <button type="button" className="fc-save-draft-btn" onClick={saveDraftToServer} disabled={isSaving}>
                    {isSaving ? (
                      <><span className="fc-spinner" /> Saving…</>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                        </svg>
                        Save Draft
                      </>
                    )}
                  </button>
                )}
                <button form="creator-form" type="submit" className="fc-publish-btn" disabled={isSaving}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Publish
                </button>
              </div>
            )}
          </div>

          {/* Status banners */}
          {status.type === "draft" && (
            <div className="fc-status fc-status--draft">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {status.message}
            </div>
          )}

          {status.type === "success" && activeSection === "done" && (
            <div className="fc-status fc-status--success">
              <span>✅</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 8px" }}>{status.message}</p>
                {shareUrl && (
                  <div className="fc-share-row">
                    <code className="fc-share-code">{shareUrl}</code>
                    <button type="button" className="fc-copy-btn" onClick={copyLink}>
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                    <Link to={status.link} target="_blank" className="fc-open-btn">Open ↗</Link>
                  </div>
                )}
                {form.visibility === "restricted" && allowedRespondents.length > 0 && (
                  <PersonalizedLinksPanel
                    formId={publishedFormId}
                    formSlug={publishedSlug}
                    personalizations={form.personalizations}
                    allowedRespondents={allowedRespondents}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step Nav */}
          {activeSection !== "done" && (
            <div className="fc-step-nav">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`fc-step-btn ${activeSection === s.id ? "fc-step-btn--active" : ""}`}
                >
                  <span className="fc-step-icon">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {activeSection !== "done" && (
            <form id="creator-form" onSubmit={submitForm}>

              {/* ── Section: General Info ── */}
              {activeSection === "info" && (
                <div className="fc-section">
                  <div className="fc-section-header">
                    <h2 className="fc-section-title">General Information</h2>
                    <p className="fc-section-desc">Set up the basic details for your form</p>
                  </div>
                  <div className="fc-field-grid">
                    <div className="fc-field">
                      <label className="fc-label">Form Title <span className="fc-req">*</span></label>
                      <input
                        className="fc-input"
                        required
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="e.g. Post-Webinar Feedback 2025"
                      />
                    </div>
                    <div className="fc-field">
                      <label className="fc-label">Form Type <span className="fc-req">*</span></label>
                      <select
                        className="fc-input"
                        required
                        value={form.formType}
                        onChange={(e) => updateField("formType", e.target.value)}
                      >
                        <option value="">Select a type…</option>
                        <option value="webinar">🎙️ Webinar Form</option>
                        <option value="flash">⚡ Flash Form</option>
                        <option value="survey">📊 Survey</option>
                        <option value="event">🎫 Event Feedback</option>
                      </select>
                    </div>
                    <div className="fc-field fc-field--full">
                      <label className="fc-label">Description</label>
                      <textarea
                        className="fc-input fc-textarea"
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Briefly describe the purpose of this form…"
                      />
                    </div>
                  </div>

                  <div className="fc-divider" />
                  <p className="fc-sub-label">Data Collection</p>
                  <div className="fc-chip-row">
                    {[
                      ["collectsPhone", "📱 Collect Phone"],
                      ["phoneRequired", "🔒 Phone Required"],
                      ["collectsCompanyDetails", "🏢 Company Details"],
                      ["singleSession", "🔐 Single Session"],
                    ].map(([key, lbl]) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => updateField(key, !form[key])}
                        className={`fc-chip ${form[key] ? "fc-chip--on" : ""}`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="fc-nav-row">
                    <span />
                    <button type="button" className="fc-next-btn" onClick={() => setActiveSection("settings")}>
                      Next: Settings
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Section: Settings ── */}
              {activeSection === "settings" && (
                <div className="fc-section">
                  <div className="fc-section-header">
                    <h2 className="fc-section-title">Form Settings</h2>
                    <p className="fc-section-desc">Configure availability, access, and restrictions</p>
                  </div>
                  <div className="fc-field-grid">
                    <div className="fc-field">
                      <label className="fc-label">Initial Status</label>
                      <select className="fc-input" value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                        <option value="draft">Draft</option>
                        <option value="live">Live</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="fc-field">
                      <label className="fc-label">Visibility</label>
                      <select className="fc-input" value={form.visibility} onChange={(e) => updateField("visibility", e.target.value)}>
                        <option value="public">🌐 Public Link</option>
                        <option value="restricted">🔒 Restricted Users</option>
                      </select>
                    </div>
                    <div className="fc-field">
                      <label className="fc-label">Opens At</label>
                      <input
                        className="fc-input"
                        type="datetime-local"
                        value={form.opensAt}
                        onChange={(e) => updateField("opensAt", e.target.value)}
                      />
                    </div>
                    <div className="fc-field">
                      <label className="fc-label">
                        Closes At{" "}
                        {form.formType === "flash"
                          ? <span className="fc-req">*</span>
                          : <span className="fc-hint">(defaults to 5 days)</span>
                        }
                      </label>
                      <input
                        className="fc-input"
                        type="datetime-local"
                        required={form.formType === "flash"}
                        value={form.closesAt}
                        onChange={(e) => updateField("closesAt", e.target.value)}
                      />
                      {form.formType === "flash" && !form.closesAt && (
                        <span style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>
                          Flash forms require a closing time.
                        </span>
                      )}
                    </div>
                    {form.visibility === "restricted" && (
                      <div className="fc-field fc-field--full">
                        <label className="fc-label">
                          Allowed Respondents <span className="fc-hint">(comma-separated emails or IDs)</span>
                        </label>
                        <textarea
                          className="fc-input fc-textarea"
                          style={{ height: 68 }}
                          placeholder="user1@example.com, user2@example.com"
                          value={form.allowedRespondentsText}
                          onChange={(e) => updateField("allowedRespondentsText", e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {form.visibility === "restricted" && (
                    <>
                      <div className="fc-divider" />
                      <div className="fc-personalization-header">
                        <p className="fc-sub-label" style={{ margin: 0 }}>Personalization</p>
                        <span className="fc-badge-info">Restricted only</span>
                      </div>
                      <p className="fc-personalization-hint">
                        Pre-fill greeting names and company details per respondent. After publishing,
                        you'll get unique links like <code>?name=John&amp;email=…</code> for each person.
                      </p>
                      <PersonalizationEditor
                        respondents={allowedRespondents}
                        personalizations={form.personalizations}
                        onChange={(v) => updateField("personalizations", v)}
                      />
                    </>
                  )}

                  <div className="fc-divider" />
                  <p className="fc-sub-label">Duplicate Submission Prevention</p>
                  <div className="fc-chip-row">
                    {[
                      ["email", "📧 Email"],
                      ["phone", "📱 Phone"],
                      ["uniqueId", "🆔 Unique ID"],
                    ].map(([f, lbl]) => {
                      const on = form.duplicateCheckFields.includes(f);
                      return (
                        <button
                          type="button"
                          key={f}
                          onClick={() => {
                            const fields = on
                              ? form.duplicateCheckFields.filter((x) => x !== f)
                              : [...form.duplicateCheckFields, f];
                            updateField("duplicateCheckFields", fields);
                          }}
                          className={`fc-chip ${on ? "fc-chip--on" : ""}`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>

                  <div className="fc-nav-row">
                    <button type="button" className="fc-ghost-btn" onClick={() => setActiveSection("info")}>← Back</button>
                    <button type="button" className="fc-next-btn" onClick={() => setActiveSection("questions")}>
                      Next: Questions
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Section: Questions ── */}
              {activeSection === "questions" && (
                <div className="fc-section">
                  <div className="fc-section-header">
                    <div>
                      <h2 className="fc-section-title">Form Questions</h2>
                      <p className="fc-section-desc">
                        {form.questions.length} question{form.questions.length !== 1 ? "s" : ""} added
                      </p>
                    </div>
                    <button type="button" className="fc-add-q-btn" onClick={addQuestion}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Question
                    </button>
                  </div>

                  {/* Built-in quick templates */}
                  <div className="fc-template-row">
                    <span className="fc-template-label">Quick add:</span>
                    {BUILTIN_QUESTION_TEMPLATES.map((t) => (
                      <button key={t.label} type="button" className="fc-template-chip" onClick={() => addTemplate(t)}>
                        + {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Saved templates panel (latest first — stored in reverse insert order) */}
                  <SavedTemplatesPanel
                    savedTemplates={savedTemplates}
                    onUse={addTemplate}
                    onDelete={handleDeleteTemplate}
                  />

                  <div className="fc-q-list">
                    {form.questions.map((q, idx) => (
                      <div key={idx} className="fc-q-card">
                        <div className="fc-q-head">
                          <div className="fc-q-meta">
                            <span className="fc-q-num">{idx + 1}</span>
                            <span style={{ fontSize: 15 }}>{QTYPE_ICONS[q.type] || "❓"}</span>
                            <span className="fc-q-type-label">{q.type}</span>
                          </div>
                          <div className="fc-q-controls">
                            <button type="button" className="fc-q-icon-btn" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>↑</button>
                            <button type="button" className="fc-q-icon-btn" onClick={() => moveQuestion(idx, 1)} disabled={idx === form.questions.length - 1}>↓</button>
                            {/* Save as template */}
                            <button
                              type="button"
                              className="fc-q-icon-btn"
                              title="Save as template"
                              onClick={() => handleSaveAsTemplate(idx)}
                              disabled={!q.prompt.trim()}
                              style={{ fontSize: 13 }}
                            >
                              {savingTplIdx === idx ? "✓" : "📄"}
                            </button>
                            <button
                              type="button"
                              className="fc-q-icon-btn fc-q-icon-btn--danger"
                              onClick={() => removeQuestion(idx)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="fc-q-body">
                          <div className="fc-q-prompt-wrap">
                            <label className="fc-label">Question Prompt <span className="fc-req">*</span></label>
                            <input
                              className="fc-input"
                              required
                              value={q.prompt}
                              onChange={(e) => updateQuestion(idx, "prompt", e.target.value)}
                              placeholder="Enter your question here…"
                            />
                          </div>
                          <div className="fc-q-type-wrap">
                            <label className="fc-label">Response Type</label>
                            <select
                              className="fc-input"
                              value={q.type}
                              onChange={(e) => updateQuestion(idx, "type", e.target.value)}
                            >
                              <option value="text">✍️ Text Answer</option>
                              <option value="rating">⭐ Star Rating</option>
                              <option value="single-choice">🔘 Single Choice</option>
                            </select>
                          </div>
                        </div>
                        {(q.type === "single-choice" || q.type === "multiple-choice") && (
                          <div style={{ marginTop: 10 }}>
                            <label className="fc-label">Options <span className="fc-hint">(comma-separated)</span></label>
                            <input
                              className="fc-input"
                              placeholder="Yes, No, Maybe, Not sure"
                              value={q.optionsText}
                              onChange={(e) => updateQuestion(idx, "optionsText", e.target.value)}
                            />
                          </div>
                        )}
                        <div style={{ marginTop: 10 }}>
                          <label className="fc-label">
                            Suggested Answer Templates <span className="fc-hint">(comma-separated)</span>
                          </label>
                          <textarea
                            className="fc-input fc-textarea"
                            style={{ height: 52 }}
                            placeholder="Great session!, The speaker was excellent…"
                            value={q.answerTemplatesText}
                            onChange={(e) => updateQuestion(idx, "answerTemplatesText", e.target.value)}
                          />
                        </div>
                        <div className="fc-q-required">
                          <input
                            type="checkbox"
                            id={`req-${idx}`}
                            checked={q.required}
                            onChange={(e) => updateQuestion(idx, "required", e.target.checked)}
                            style={{ width: 14, height: 14, accentColor: "#3b82f6" }}
                          />
                          <label htmlFor={`req-${idx}`} className="fc-label" style={{ cursor: "pointer", margin: 0 }}>
                            Mandatory
                          </label>
                        </div>
                      </div>
                    ))}
                    {form.questions.length === 0 && (
                      <div className="fc-empty-q">
                        <span style={{ fontSize: 36 }}>❓</span>
                        <p>No questions yet. Add one or use a template above.</p>
                      </div>
                    )}
                  </div>

                  {status.type === "error" && (
                    <div className="fc-status fc-status--error">
                      <span>❌</span>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{status.message}</p>
                    </div>
                  )}

                  <div className="fc-nav-row">
                    <button type="button" className="fc-ghost-btn" onClick={() => setActiveSection("settings")}>← Back</button>
                    <button type="submit" className="fc-submit-btn" disabled={isSaving}>
                      {isSaving ? (
                        <><span className="fc-spinner" /> Publishing…</>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>{" "}
                          Save &amp; Publish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </>
  );
};

/* ══ CSS ═══════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

.fc-main { flex:1; overflow-y:auto; background:#f8fafc; padding:28px 20px 60px; font-family:'DM Sans',system-ui,sans-serif; }
.fc-wrap { max-width:860px; margin:0 auto; }

/* Draft Banner */
.fc-draft-banner {
    display:flex; align-items:center; justify-content:space-between; gap:12; flex-wrap:wrap;
    background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px;
    margin-bottom:16px; font-size:13px; color:#92400e; font-weight:500;
}
.fc-draft-banner-left { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
.fc-draft-banner-actions { display:flex; gap:8px; flex-shrink:0; }
.fc-draft-restore { padding:5px 14px; border-radius:7px; background:#f59e0b; color:#fff; border:none; font-size:12px; font-weight:700; cursor:pointer; }
.fc-draft-discard { padding:5px 12px; border-radius:7px; background:transparent; color:#92400e; border:1px solid #fde68a; font-size:12px; font-weight:600; cursor:pointer; }

/* Header */
.fc-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
.fc-back-link { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#3b82f6; text-decoration:none; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px; }
.fc-page-title { font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-0.02em; margin:0; }
.fc-header-actions { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.fc-save-draft-btn { display:inline-flex; align-items:center; gap:7px; background:#fffbeb; color:#92400e; padding:9px 16px; border-radius:9px; font-size:12px; font-weight:700; border:1.5px solid #fde68a; cursor:pointer; transition:background 0.15s; }
.fc-save-draft-btn:hover:not(:disabled) { background:#fef3c7; }
.fc-save-draft-btn:disabled { opacity:0.6; cursor:not-allowed; }
.fc-publish-btn { display:inline-flex; align-items:center; gap:7px; background:#0f172a; color:#fff; padding:9px 18px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:background 0.15s; }
.fc-publish-btn:hover:not(:disabled) { background:#2563eb; }
.fc-publish-btn:disabled { opacity:0.6; cursor:not-allowed; }

/* Status messages */
.fc-status { display:flex; align-items:flex-start; gap:10px; padding:14px 16px; border-radius:10px; margin-bottom:16px; border:1px solid; font-size:13px; }
.fc-status--draft   { background:#fffbeb; border-color:#fde68a; color:#92400e; }
.fc-status--success { background:#f0fdf4; border-color:#bbf7d0; color:#166534; }
.fc-status--error   { background:#fff5f5; border-color:#fecaca; color:#dc2626; }
.fc-share-row { display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap; }
.fc-share-code { font-size:11px; background:rgba(0,0,0,0.06); padding:5px 10px; border-radius:6px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fc-copy-btn { font-size:11px; font-weight:700; background:rgba(0,0,0,0.07); border:none; border-radius:6px; padding:5px 12px; cursor:pointer; color:inherit; white-space:nowrap; flex-shrink:0; }
.fc-open-btn { font-size:11px; font-weight:700; text-decoration:none; color:inherit; background:rgba(0,0,0,0.07); border-radius:6px; padding:5px 12px; white-space:nowrap; flex-shrink:0; }

/* Personalized links panel */
.fc-personalized-links { margin-top:14px; padding-top:14px; border-top:1px solid rgba(0,0,0,0.08); }
.fc-personalized-links-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
.fc-pl-list { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
.fc-pl-row { display:grid; grid-template-columns:160px 1fr auto; gap:8px; align-items:center; background:rgba(0,0,0,0.04); border-radius:8px; padding:8px 10px; }
.fc-pl-info { display:flex; flex-direction:column; gap:1px; overflow:hidden; min-width:0; }
.fc-pl-name { font-size:12px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-pl-email { font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-pl-url { font-size:10px; color:#2563eb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:rgba(59,130,246,0.08); padding:4px 8px; border-radius:5px; min-width:0; }

/* Step nav */
.fc-step-nav { display:flex; gap:4px; background:#fff; border:1px solid #e8ecf0; border-radius:11px; padding:5px; margin-bottom:18px; overflow-x:auto; }
.fc-step-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:9px 14px; border-radius:8px; font-size:11.5px; font-weight:700; color:#64748b; background:transparent; border:none; cursor:pointer; transition:all 0.15s; white-space:nowrap; text-transform:uppercase; letter-spacing:0.05em; font-family:'DM Sans',system-ui,sans-serif; }
.fc-step-btn--active { background:#0f172a; color:#fff; }
.fc-step-icon { font-size:13px; }

/* Section */
.fc-section { background:#fff; border-radius:14px; border:1px solid #e8ecf0; padding:26px; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.fc-section-header { margin-bottom:20px; display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.fc-section-title { font-size:17px; font-weight:800; color:#0f172a; margin:0 0 3px; letter-spacing:-0.01em; }
.fc-section-desc  { font-size:12.5px; color:#94a3b8; margin:0; }

/* Fields */
.fc-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fc-field { display:flex; flex-direction:column; gap:5px; }
.fc-field--full { grid-column:1/-1; }
.fc-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; }
.fc-req   { color:#ef4444; }
.fc-hint  { text-transform:none; font-weight:500; letter-spacing:0; color:#cbd5e1; font-size:10px; }
.fc-input {
    width:100%; background:#f8fafc; border:1px solid #e8ecf0; border-radius:9px;
    padding:10px 12px; font-size:13px; color:#0f172a; outline:none;
    transition:border 0.15s,background 0.15s; box-sizing:border-box;
    font-family:'DM Sans',system-ui,sans-serif;
}
.fc-input:focus { border-color:#3b82f6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
.fc-textarea { height:80px; resize:vertical; }

/* Chips */
.fc-divider  { height:1px; background:#f1f5f9; margin:18px 0; }
.fc-sub-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:10px; }
.fc-chip-row { display:flex; flex-wrap:wrap; gap:7px; }
.fc-chip { padding:7px 14px; border-radius:99px; font-size:12px; font-weight:600; color:#64748b; background:#f8fafc; border:1.5px solid #e8ecf0; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-chip:hover { background:#f1f5f9; }
.fc-chip--on  { background:#0f172a; color:#fff; border-color:#0f172a; }

/* Nav row */
.fc-nav-row  { display:flex; justify-content:space-between; align-items:center; margin-top:22px; }
.fc-next-btn { display:inline-flex; align-items:center; gap:8px; background:#3b82f6; color:#fff; padding:10px 18px; border-radius:9px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; transition:background 0.15s; }
.fc-next-btn:hover { background:#2563eb; }
.fc-ghost-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; color:#64748b; padding:10px 14px; border-radius:9px; font-size:12.5px; font-weight:600; border:1.5px solid #e8ecf0; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; }
.fc-submit-btn { display:inline-flex; align-items:center; gap:8px; background:#0f172a; color:#fff; padding:11px 22px; border-radius:9px; font-size:13px; font-weight:700; border:none; cursor:pointer; box-shadow:0 4px 14px rgba(15,23,42,0.2); transition:background 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-submit-btn:hover:not(:disabled) { background:#2563eb; }
.fc-submit-btn:disabled { opacity:0.6; cursor:not-allowed; }

/* Spinner */
.fc-spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:currentColor; border-radius:50%; animation:fc-spin 0.6s linear infinite; display:inline-block; }
@keyframes fc-spin { to { transform:rotate(360deg); } }

/* Questions */
.fc-q-list { display:flex; flex-direction:column; gap:10px; margin-top:4px; }
.fc-add-q-btn { display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#2563eb; padding:8px 14px; border-radius:8px; font-size:11.5px; font-weight:700; border:1.5px solid #bfdbfe; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; font-family:'DM Sans',system-ui,sans-serif; }
.fc-template-row { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:10px; padding:11px 13px; background:#f8fafc; border-radius:9px; border:1px solid #e8ecf0; }
.fc-template-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; }
.fc-template-chip { font-size:11px; font-weight:600; color:#475569; background:#fff; border:1.5px solid #e8ecf0; border-radius:99px; padding:5px 11px; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-template-chip:hover { background:#eff6ff; border-color:#bfdbfe; color:#2563eb; }

/* Saved templates panel */
.fc-saved-tpl-wrap { margin-bottom:14px; border:1.5px solid #e8ecf0; border-radius:10px; overflow:hidden; }
.fc-saved-tpl-toggle { width:100%; display:flex; align-items:center; gap:8px; padding:10px 14px; background:#fafbfc; border:none; cursor:pointer; font-size:12px; font-weight:700; color:#475569; font-family:'DM Sans',system-ui,sans-serif; text-align:left; }
.fc-saved-tpl-toggle:hover { background:#f1f5f9; }
.fc-saved-tpl-list { display:flex; flex-direction:column; gap:0; border-top:1px solid #e8ecf0; }
.fc-saved-tpl-row { display:grid; grid-template-columns:1fr auto auto; gap:10px; align-items:center; padding:10px 14px; border-bottom:1px solid #f1f5f9; }
.fc-saved-tpl-row:last-child { border-bottom:none; }
.fc-saved-tpl-info { display:flex; flex-direction:column; gap:2px; min-width:0; }
.fc-saved-tpl-prompt { font-size:12.5px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-saved-tpl-meta { font-size:10px; color:#94a3b8; font-weight:500; }

.fc-q-card { background:#fafbfc; border:1.5px solid #e8ecf0; border-radius:11px; padding:14px 16px; transition:border-color 0.15s; }
.fc-q-card:focus-within { border-color:#3b82f6; }
.fc-q-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.fc-q-meta { display:flex; align-items:center; gap:8px; }
.fc-q-num  { width:24px; height:24px; border-radius:7px; background:#0f172a; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fc-q-type-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; }
.fc-q-controls { display:flex; gap:4px; }
.fc-q-icon-btn { width:27px; height:27px; border-radius:6px; background:#f1f5f9; border:1px solid #e8ecf0; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; color:#64748b; font-weight:700; transition:all 0.13s; }
.fc-q-icon-btn:hover:not(:disabled) { background:#e2e8f0; }
.fc-q-icon-btn:disabled { opacity:0.3; cursor:not-allowed; }
.fc-q-icon-btn--danger { color:#ef4444; }
.fc-q-icon-btn--danger:hover { background:#fff5f5; border-color:#fecaca; }
.fc-q-body { display:flex; gap:12px; flex-wrap:wrap; }
.fc-q-prompt-wrap { flex:1; min-width:180px; display:flex; flex-direction:column; gap:5px; }
.fc-q-type-wrap   { width:170px; flex-shrink:0; display:flex; flex-direction:column; gap:5px; }
.fc-q-required    { display:flex; align-items:center; gap:7px; margin-top:10px; }
.fc-empty-q { text-align:center; padding:36px 20px; border:2px dashed #e8ecf0; border-radius:11px; color:#94a3b8; font-size:13px; }
.fc-empty-state { border-radius:9px; background:#f8fafc; }

/* Personalization */
.fc-personalization-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.fc-badge-info { font-size:10px; font-weight:700; color:#2563eb; background:#eff6ff; border:1px solid #bfdbfe; padding:3px 9px; border-radius:99px; }
.fc-personalization-hint { font-size:12px; color:#94a3b8; margin:0 0 12px; line-height:1.5; }
.fc-personalization-hint code { background:#f1f5f9; padding:1px 5px; border-radius:4px; font-size:11px; }
.fc-personalization-list { display:flex; flex-direction:column; gap:8px; }
.fc-person-row { display:grid; grid-template-columns:1fr 140px 160px; gap:8px; align-items:center; background:#fff; border:1px solid #e8ecf0; border-radius:9px; padding:10px 12px; }
.fc-person-id { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.fc-person-name, .fc-person-company { font-size:12px; }

/* Responsive */
@media (max-width:640px) {
    .fc-field-grid { grid-template-columns:1fr !important; }
    .fc-q-body { flex-direction:column; }
    .fc-q-type-wrap { width:100% !important; }
    .fc-person-row { grid-template-columns:1fr; }
    .fc-step-btn { font-size:10px; padding:8px 10px; }
    .fc-pl-row { grid-template-columns:1fr; }
    .fc-header { flex-direction:column; align-items:flex-start; }
    .fc-header-actions { width:100%; justify-content:flex-end; }
    .fc-pl-url { max-width:100%; }
    .fc-share-row { flex-direction:column; align-items:flex-start; }
    .fc-share-code { width:100%; }
    .fc-saved-tpl-row { grid-template-columns:1fr auto auto; }
}
`;

export default FormCreator;