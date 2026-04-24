import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import {
  createForm,
  updateForm,
  updateFormSettings,
  getForm,
  generateInviteTokens,
} from "../../api/feedbackApi";

/* ─── helpers ──────────────────────────────────── */
const DRAFT_KEY     = "simtrak_form_draft";
const TEMPLATES_KEY = "simtrak_question_templates";

const emptyQuestion = () => ({
  prompt: "", type: "text", required: false, optionsText: "", answerTemplatesText: "",
});

const splitList = (v) =>
  v.split(",").map((s) => s.trim()).filter(Boolean);

const saveDraft  = (data) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, _savedAt: Date.now() })); } catch {} };
const loadDraft  = ()     => { try { const d = localStorage.getItem(DRAFT_KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
const clearDraft = ()     => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const loadSavedTemplates = () => {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return [...parsed].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  } catch { return []; }
};

const saveTemplate = (tpl) => {
  try {
    const existing = loadSavedTemplates();
    const filtered = existing.filter((t) => t.prompt !== tpl.prompt);
    const newEntry = { ...tpl, savedAt: Date.now() };
    const updated = [newEntry, ...filtered];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
};

const deleteTemplate = (prompt) => {
  try {
    const existing = loadSavedTemplates();
    const updated = existing.filter((t) => t.prompt !== prompt);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    return updated;
  } catch { return []; }
};

const defaultClosesAt = (formType) => {
  if (formType === "flash") return "";
  const d = new Date();
  d.setDate(d.getDate() + 5);
  // Return local datetime string for datetime-local input
  return toLocalDatetimeString(d);
};

/**
 * FIX: opensAt / closesAt datetime conversion
 * datetime-local inputs give "YYYY-MM-DDTHH:mm" in LOCAL time.
 * We must NOT use new Date(localString).toISOString() because that converts
 * to UTC and shifts the time. Instead we keep the string as-is and only
 * convert to ISO when sending to the server.
 */
const toLocalDatetimeString = (dateOrIso) => {
  if (!dateOrIso) return "";
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const localDatetimeToISO = (localStr) => {
  if (!localStr) return null;
  // localStr is "YYYY-MM-DDTHH:mm" — treat as local time
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const formToState = (apiForm) => ({
  title:                  apiForm.title        || "",
  displayTitle:           apiForm.displayTitle !== undefined ? apiForm.displayTitle : apiForm.title || "",
  showTitleToUser:        apiForm.showTitleToUser !== undefined ? apiForm.showTitleToUser : false,
  description:            apiForm.description  || "",
  formType:               apiForm.formType     || "",
  status:                 apiForm.status       || "draft",
  visibility:             apiForm.visibility   || "public",
  allowedRespondentsText: (apiForm.allowedRespondents || []).join(", "),
  collectsName:           apiForm.collectsName !== undefined ? apiForm.collectsName : true,
  collectsPhone:          !!apiForm.collectsPhone,
  phoneRequired:          !!apiForm.phoneRequired,
  collectsCompanyDetails: !!apiForm.collectsCompanyDetails,
  companyDetailsRequired: !!apiForm.companyDetailsRequired,
  duplicateCheckFields:   apiForm.duplicateCheckFields || ["email"],
  // FIX: convert stored ISO → local datetime string for the input
  opensAt:    apiForm.availability?.opensAt  ? toLocalDatetimeString(new Date(apiForm.availability.opensAt))  : "",
  closesAt:   apiForm.availability?.closesAt ? toLocalDatetimeString(new Date(apiForm.availability.closesAt)) : "",
  singleSession: !!apiForm.availability?.singleSession,
  sessionKey:    apiForm.availability?.sessionKey || "",
  questions: (apiForm.questions || []).map((q) => ({
    ...q,
    optionsText:         (q.options         || []).join(", "),
    answerTemplatesText: (q.answerTemplates || []).join(", "),
  })),
  personalizations: apiForm.personalizations || [],
});

const BUILTIN_QUESTION_TEMPLATES = [
  { label: "Overall Rating",  prompt: "How would you rate your overall experience?", type: "rating",           required: true,  optionsText: "", answerTemplatesText: "" },
  { label: "What Worked",     prompt: "What did you like the most?",                type: "text",             required: false, optionsText: "", answerTemplatesText: "The session was useful because...,I liked the presenter because..." },
  { label: "Improvements",    prompt: "What could be improved?",                   type: "text",             required: false, optionsText: "", answerTemplatesText: "More examples would help,The session was too long" },
  { label: "Recommend?",      prompt: "Would you recommend this to others?",       type: "single-choice",    required: false, optionsText: "Yes definitely,Probably yes,Not sure,Probably not", answerTemplatesText: "" },
  { label: "Multi Select",    prompt: "Which topics were most useful?",            type: "multiple-choice",  required: false, optionsText: "Topic A,Topic B,Topic C,Topic D", answerTemplatesText: "" },
];

const QTYPE_ICONS = { text: "✍️", rating: "⭐", "single-choice": "🔘", "multiple-choice": "☑️" };

const INITIAL_FORM = {
  title: "", displayTitle: "", showTitleToUser: false,
  description: "", formType: "", status: "draft", visibility: "public",
  allowedRespondentsText: "",
  collectsName: true,
  collectsPhone: true, phoneRequired: false,
  collectsCompanyDetails: true, companyDetailsRequired: false,
  duplicateCheckFields: ["email", "phone"], opensAt: "", closesAt: "",
  singleSession: false, sessionKey: "", questions: [emptyQuestion()], personalizations: [],
};

/* ─── sub-components ───────────────────────────────── */
const DraftBanner = ({ draft, onRestore, onDiscard }) => (
  <div className="fc-draft-banner">
    <div className="fc-draft-banner-left">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
      </svg>
      <span>
        You have an unsaved draft from{" "}
        <strong>{new Date(draft._savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>.
        Restore it?
      </span>
    </div>
    <div className="fc-draft-banner-actions">
      <button type="button" className="fc-draft-restore" onClick={onRestore}>Restore</button>
      <button type="button" className="fc-draft-discard" onClick={onDiscard}>Discard</button>
    </div>
  </div>
);

const PersonalizationEditor = ({ respondents, personalizations, onChange }) => {
  const getP = (id) => personalizations.find((p) => p.identifier === id) || { identifier: id, name: "", prefillData: {} };
  const update = (id, field, value) => {
    const existing = getP(id);
    const updated  = { ...existing, [field]: value };
    const rest     = personalizations.filter((p) => p.identifier !== id);
    onChange([...rest, updated]);
  };
  if (!respondents.length)
    return <div className="fc-empty-state" style={{ padding: "16px", marginTop: 8 }}><p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Add allowed respondent emails above to configure personalization.</p></div>;
  return (
    <div className="fc-personalization-list">
      {respondents.map((id) => {
        const p = getP(id);
        return (
          <div key={id} className="fc-person-row">
            <div className="fc-person-id">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span>{id}</span>
            </div>
            <input className="fc-input fc-person-name" placeholder="Greeting name" value={p.name || ""} onChange={(e) => update(id, "name", e.target.value)} />
            <input className="fc-input fc-person-company" placeholder="Pre-fill company name (optional)" value={p.prefillData?.companyName || ""} onChange={(e) => update(id, "prefillData", { ...p.prefillData, companyName: e.target.value })} />
          </div>
        );
      })}
    </div>
  );
};

const PersonalizedLinksPanel = ({ formId, formSlug, allowedRespondents, personalizations }) => {
  const [copied, setCopied]   = useState("");
  const [tokens, setTokens]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!formId || !allowedRespondents.length) {
      setTokens([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    generateInviteTokens(formId, allowedRespondents)
      .then((data) => {
        if (cancelled) return;
        const origin     = window.location.origin;
        const identifier = formSlug || formId;
        const enriched   = (data.tokens || []).map((t) => ({
          ...t,
          url: `${origin}/form/${identifier}?token=${t.token}`,
        }));
        setTokens(enriched);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not generate links.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, formSlug, allowedRespondents.join(",")]);

  const copyAll = () => {
    const text = tokens
      .map((t) => `${t.name || t.email}: ${t.url}`)
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
        <p className="fc-sub-label" style={{ margin: 0 }}>🔗 Personalized Links</p>
        {tokens.length > 0 && (
          <button type="button" className="fc-copy-btn" onClick={copyAll}>
            {copied === "all" ? "✓ Copied All" : "Copy All"}
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 12px", lineHeight: 1.5 }}>
        Each link is cryptographically signed for the recipient's email address.
        Only that person can open and submit — the email cannot be swapped in the URL.
        Links expire in <strong>7 days</strong>.
      </p>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", fontSize: 12, color: "#64748b" }}>
          <span className="fc-spinner" style={{ borderColor: "#cbd5e1", borderTopColor: "#3b82f6", width: 13, height: 13 }} />
          Generating secure links…
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "#dc2626", padding: "8px 0" }}>⚠️ {error}</div>
      )}

      {!loading && !error && tokens.length > 0 && (
        <div className="fc-pl-list">
          {tokens.map((t) => (
            <div key={t.email} className="fc-pl-row">
              <div className="fc-pl-info">
                <span className="fc-pl-name">{t.name || t.email}</span>
                <span className="fc-pl-email">{t.email}</span>
              </div>
              <code className="fc-pl-url" title={t.url}>{t.url}</code>
              <button
                type="button"
                className="fc-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(t.url).then(() => {
                    setCopied(t.email);
                    setTimeout(() => setCopied(""), 2000);
                  });
                }}
              >
                {copied === t.email ? "✓" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SavedTemplatesPanel = ({ savedTemplates, onUse, onDelete }) => {
  const [open, setOpen] = useState(true);

  if (!savedTemplates.length) return null;

  const sorted = [...savedTemplates].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

  return (
    <div className="fc-saved-tpl-wrap">
      <button type="button" className="fc-saved-tpl-toggle" onClick={() => setOpen((v) => !v)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
        </svg>
        <span>My Saved Templates</span>
        <span className="fc-saved-tpl-count">{savedTemplates.length}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="fc-saved-tpl-list">
          {sorted.map((t) => (
            <div key={t.prompt} className="fc-saved-tpl-row">
              <div className="fc-saved-tpl-type-icon">{QTYPE_ICONS[t.type] || "❓"}</div>
              <div className="fc-saved-tpl-info">
                <span className="fc-saved-tpl-prompt">{t.prompt}</span>
                <span className="fc-saved-tpl-meta">
                  {t.type}
                  {t.savedAt ? ` · Saved ${new Date(t.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  {t.required ? " · Required" : ""}
                  {t.optionsText ? ` · Options: ${t.optionsText.split(",").length}` : ""}
                </span>
              </div>
              <button type="button" className="fc-tpl-use-btn" onClick={() => onUse(t)} title="Add this question to the top of the form">
                + Use
              </button>
              <button type="button" className="fc-tpl-del-btn" onClick={() => onDelete(t.prompt)} title="Delete this template">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
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

  const [form, setForm]                   = useState(INITIAL_FORM);
  const [status, setStatus]               = useState({ type: "", message: "", link: "" });
  const [shareUrl, setShareUrl]           = useState("");
  const [publishedFormId, setPublishedFormId] = useState("");
  const [publishedSlug, setPublishedSlug] = useState("");
  const [copied, setCopied]               = useState(false);
  const [activeSection, setActiveSection] = useState("info");
  const [draftData, setDraftData]         = useState(null);
  const [isDirty, setIsDirty]             = useState(false);
  const [isSaving, setIsSaving]           = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(isEditMode);

  const [savedFormId, setSavedFormId]     = useState(isEditMode ? editFormId : null);
  const [savedFormSlug, setSavedFormSlug] = useState("");

  const [savedTemplates, setSavedTemplates] = useState(() => loadSavedTemplates());
  const [savingTplIdx, setSavingTplIdx]   = useState(null);
  const [tplToast, setTplToast]           = useState("");

  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    if (!isEditMode) return;
    const load = async () => {
      setIsLoadingEdit(true);
      try {
        const data    = await getForm(editFormId);
        const apiForm = data.form || data;
        setForm(formToState(apiForm));
        setSavedFormId(apiForm._id || apiForm.id || editFormId);
        setSavedFormSlug(apiForm.slug || "");
        clearDraft();
      } catch (err) {
        setStatus({ type: "error", message: `Could not load form: ${err.message}` });
      } finally {
        setIsLoadingEdit(false);
      }
    };
    load();
  }, [editFormId, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    const d = loadDraft();
    if (d && d._savedAt) setDraftData(d);
  }, [isEditMode]);

  useEffect(() => { setSavedTemplates(loadSavedTemplates()); }, []);

  useEffect(() => {
    if (isEditMode) return;
    if (!form.formType) return;
    if (form.formType === "flash") {
      setForm((c) => {
        const wasDefault = c.closesAt && c.closesAt === defaultClosesAt("webinar");
        return wasDefault ? { ...c, closesAt: "" } : c;
      });
    } else if (!form.closesAt) {
      setForm((c) => ({ ...c, closesAt: defaultClosesAt(c.formType) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.formType, isEditMode]);

  useEffect(() => {
    if (!isDirty) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { saveDraft(form); }, 3000);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [form, isDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state === "blocked") { saveDraft(form); blocker.proceed(); }
  }, [blocker, form]);

  const restoreDraft = () => {
    const { _savedAt, ...rest } = draftData;
    setForm({ ...INITIAL_FORM, ...rest });
    setDraftData(null);
    setIsDirty(true);
  };
  const discardDraft = () => { clearDraft(); setDraftData(null); };

  const updateField    = useCallback((field, value) => { setForm((c) => ({ ...c, [field]: value })); setIsDirty(true); }, []);
  const updateQuestion = useCallback((idx, field, value) => {
    setForm((c) => ({ ...c, questions: c.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q) }));
    setIsDirty(true);
  }, []);

  const addQuestion    = () => { setForm((c) => ({ ...c, questions: [...c.questions, emptyQuestion()] })); setIsDirty(true); };
  const removeQuestion = (idx) => { setForm((c) => ({ ...c, questions: c.questions.filter((_, i) => i !== idx) })); setIsDirty(true); };

  const addTemplate = (t) => {
    const { label, savedAt, ...rest } = t;
    setForm((c) => ({ ...c, questions: [{ ...emptyQuestion(), ...rest }, ...c.questions] }));
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

  const handleSaveAsTemplate = useCallback((idx) => {
    const q = form.questions[idx];
    if (!q.prompt.trim()) return;

    setSavingTplIdx(idx);

    const tpl = {
      prompt:              q.prompt.trim(),
      type:                q.type,
      required:            q.required,
      optionsText:         q.optionsText,
      answerTemplatesText: q.answerTemplatesText,
    };

    const updated = saveTemplate(tpl);
    setSavedTemplates(updated);

    setTplToast(`"${q.prompt.trim().slice(0, 40)}${q.prompt.trim().length > 40 ? "…" : ""}" saved as template`);
    setTimeout(() => setTplToast(""), 3000);
    setTimeout(() => setSavingTplIdx(null), 1200);
  }, [form.questions]);

  const handleDeleteTemplate = useCallback((prompt) => {
    const updated = deleteTemplate(prompt);
    setSavedTemplates(updated);
  }, []);

  const allowedRespondents = splitList(form.allowedRespondentsText);

  // REPLACE WITH
const buildContentPayload = () => ({
  title:                  form.title,
  displayTitle:           form.showTitleToUser ? (form.displayTitle || form.title) : "",
  showTitleToUser:        form.showTitleToUser,
  description:            form.description,
  formType:               form.formType,
  // Include visibility + respondents so slug is generated correctly on first save
  visibility:             form.visibility,
  allowedRespondents:     splitList(form.allowedRespondentsText),
  collectsName:           form.collectsName,
  collectsPhone:          form.collectsPhone,
  phoneRequired:          form.phoneRequired,
  collectsCompanyDetails: form.collectsCompanyDetails,
  companyDetailsRequired: form.companyDetailsRequired,
  personalizations:       form.personalizations,
  questions: form.questions
    .filter((q) => q.prompt && q.prompt.trim())
    .map((q) => ({ ...q, options: splitList(q.optionsText), answerTemplates: splitList(q.answerTemplatesText) })),
});

  // FIX: Convert local datetime strings to ISO before sending to server
  const buildSettingsPayload = (overrideStatus) => ({
    status:               overrideStatus || form.status,
    visibility:           form.visibility,
    allowedRespondents,
    personalizations:     form.personalizations,
    duplicateCheckFields: form.duplicateCheckFields,
    availability: {
      opensAt:       localDatetimeToISO(form.opensAt),
      closesAt:      localDatetimeToISO(form.closesAt),
      singleSession: form.singleSession,
      sessionKey:    form.sessionKey,
    },
  });

  const saveDraftToServer = async () => {
    if (!form.title?.trim()) {
      setStatus({ type: "error", message: "Please enter a form title before saving the draft." });
      setActiveSection("basics");
      return;
    }
    if (!form.formType) {
      setStatus({ type: "error", message: "Please select a form type before saving the draft." });
      setActiveSection("basics");
      return;
    }
    setStatus({ type: "", message: "", link: "" });
    setIsSaving(true);
    try {
      let fId   = savedFormId;
      let fSlug = savedFormSlug;
      const contentPayload = buildContentPayload();

      if (fId) {
        const data = await updateForm(fId, contentPayload);
        fSlug = data.form?.slug || fSlug;
      } else {
        const data = await createForm({ ...contentPayload, status: "draft" });
        fId    = data.form._id || data.form.id;
        fSlug  = data.form?.slug || fId;
        setSavedFormId(fId);
        setSavedFormSlug(fSlug);
      }
      const settingsData = await updateFormSettings(fId, buildSettingsPayload("draft"));
      fSlug = settingsData.form?.slug || fSlug;
      setSavedFormSlug(fSlug);

      clearDraft();
      setIsDirty(false);
      setStatus({ type: "draft", message: "Draft saved. You can continue editing or publish it later." });
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Could not save draft." });
    } finally {
      setIsSaving(false);
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (form.formType === "flash" && !form.closesAt) {
      setStatus({ type: "error", message: "Flash forms must have a closing time. Please set it in Settings." });
      setActiveSection("settings");
      return;
    }
    setStatus({ type: "", message: "", link: "" });
    setIsSaving(true);
    try {
      let fId   = savedFormId;
      let fSlug = savedFormSlug;
      const contentPayload = buildContentPayload();

      if (fId) {
        const data = await updateForm(fId, contentPayload);
        fSlug = data.form?.slug || fSlug;
      } else {
        const data = await createForm({ ...contentPayload, status: "draft" });
        fId    = data.form._id || data.form.id;
        fSlug  = data.form?.slug || fId;
        setSavedFormId(fId);
        setSavedFormSlug(fSlug);
      }

      const settingsData = await updateFormSettings(fId, buildSettingsPayload("live"));
      fSlug = settingsData.form?.slug || fSlug;
      setSavedFormSlug(fSlug);

      setPublishedFormId(fId);
      setPublishedSlug(fSlug);
      const origin = window.location.origin;
      setShareUrl(`${origin}/form/${fSlug}`);
      setStatus({ type: "success", message: "Form published successfully!", link: `/form/${fSlug}` });
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
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [shareUrl]);

  const SECTIONS = [
    { id: "info",      label: "Info",                              icon: "📋" },
    { id: "settings",  label: "Settings",                          icon: "⚙️" },
    { id: "questions", label: `Questions (${form.questions.length})`, icon: "❓" },
  ];

  const showLinksInSettings =
    form.visibility === "restricted" &&
    Boolean(savedFormId) &&
    allowedRespondents.length > 0;

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

      {tplToast && (
        <div className="fc-tpl-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {tplToast}
        </div>
      )}

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
              <h1 className="fc-page-title">{isEditMode ? "✏️ Edit Form" : "Create New Form"}</h1>
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
                    {isSaving ? <><span className="fc-spinner" /> Saving…</> : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg> Save Draft</>
                    )}
                  </button>
                )}
                <button form="creator-form" type="submit" className="fc-publish-btn" disabled={isSaving}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Publish
                </button>
              </div>
            )}
          </div>

          {/* Status banners */}
          {status.type === "draft" && (
            <div className="fc-status fc-status--draft">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              {status.message}
            </div>
          )}

          {status.type === "error" && activeSection !== "done" && (
            <div className="fc-status fc-status--error">
              <span>❌</span>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{status.message}</p>
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
                    <button type="button" className="fc-copy-btn" onClick={copyLink}>{copied ? "✓ Copied" : "Copy"}</button>
                    <Link to={status.link} target="_blank" className="fc-open-btn">Open ↗</Link>
                  </div>
                )}
                {form.visibility === "restricted" && allowedRespondents.length > 0 && (
                  <PersonalizedLinksPanel
                    formId={publishedFormId}
                    formSlug={publishedSlug}
                    allowedRespondents={allowedRespondents}
                    personalizations={form.personalizations}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step Nav */}
          {activeSection !== "done" && (
            <div className="fc-step-nav">
              {SECTIONS.map((s) => (
                <button key={s.id} type="button" onClick={() => setActiveSection(s.id)}
                  className={`fc-step-btn ${activeSection === s.id ? "fc-step-btn--active" : ""}`}>
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
                      <label className="fc-label">
                        Internal Form Title <span className="fc-req">*</span>
                        <span className="fc-hint"> (for your reference only)</span>
                      </label>
                      <input
                        className="fc-input"
                        required
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="e.g. Team Name"
                      />
                    </div>
                    <div className="fc-field">
                      <label className="fc-label">Form Type <span className="fc-req">*</span></label>
                      <select className="fc-input" required value={form.formType} onChange={(e) => updateField("formType", e.target.value)}>
                        <option value="">Select a type…</option>
                        <option value="webinar">🎙️ Webinar Form</option>
                        <option value="flash">⚡ Flash Form</option>
                        <option value="survey">📊 Survey</option>
                        <option value="event">🎫 Event Feedback</option>
                      </select>
                    </div>

                    {/* FIX: Show Title toggle — default OFF (title hidden from respondents) */}
                    <div className="fc-field fc-field--full">
                      <div className="fc-toggle-row">
                        <div className="fc-toggle-info">
                          <span className="fc-label" style={{ marginBottom: 0 }}>Show Title to Respondent</span>
                          <span className="fc-toggle-desc">
                            {form.showTitleToUser
                              ? "Respondents will see the display title on the form header."
                              : "Title is hidden from respondents (internal use only). Default: OFF."}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`fc-toggle-btn ${form.showTitleToUser ? "fc-toggle-btn--on" : ""}`}
                          onClick={() => updateField("showTitleToUser", !form.showTitleToUser)}
                        >
                          <span className="fc-toggle-thumb" />
                        </button>
                      </div>
                    </div>

                    {/* Display title — only shown when showTitleToUser is ON */}
                    {form.showTitleToUser && (
                      <div className="fc-field fc-field--full">
                        <label className="fc-label">
                          Display Title <span className="fc-hint">(what respondents see — leave blank to use internal title)</span>
                        </label>
                        <input
                          className="fc-input"
                          value={form.displayTitle}
                          onChange={(e) => updateField("displayTitle", e.target.value)}
                          placeholder={form.title || "Shown to respondents on the form header"}
                        />
                      </div>
                    )}

                    <div className="fc-field fc-field--full">
                      <label className="fc-label">Description</label>
                      <textarea className="fc-input fc-textarea" value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Briefly describe the purpose of this form…" />
                    </div>
                  </div>

                  <div className="fc-divider" />
                  <p className="fc-sub-label">Data Collection</p>

                  {/* FIX: collectsName chip — now clearly labelled and functional */}
                  <div className="fc-chip-row">
                    {[
                      ["collectsName",           "👤 Collect Name"],
                      ["collectsPhone",          "📱 Collect Phone"],
                      ["phoneRequired",          "🔒 Phone Required"],
                      ["collectsCompanyDetails", "🏢 Company Details"],
                      ["singleSession",          "🔐 Single Session"],
                    ].map(([key, lbl]) => (
                      <button type="button" key={key} onClick={() => updateField(key, !form[key])}
                        className={`fc-chip ${form[key] ? "fc-chip--on" : ""}`}>{lbl}</button>
                    ))}
                  </div>

                  {/* Info notes */}
                  {!form.collectsName && (
                    <div className="fc-info-note" style={{ marginTop: 10 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Name field will be hidden from respondents. Responses will appear as "Anonymous".</span>
                    </div>
                  )}

                  <div className="fc-nav-row">
                    <span />
                    <button type="button" className="fc-next-btn" onClick={() => setActiveSection("settings")}>
                      Next: Settings
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
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

                    {/* FIX: datetime-local inputs now store local time directly — no UTC shift */}
                    <div className="fc-field">
                      <label className="fc-label">Opens At <span className="fc-hint">(your local time)</span></label>
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
                          ? <span className="fc-req">* required for flash</span>
                          : <span className="fc-hint">(defaults to 5 days · your local time)</span>}
                      </label>
                      <input
                        className="fc-input"
                        type="datetime-local"
                        required={form.formType === "flash"}
                        value={form.closesAt}
                        onChange={(e) => updateField("closesAt", e.target.value)}
                      />
                      {form.formType === "flash" && !form.closesAt && (
                        <span style={{ fontSize: 10, color: "#ef4444", marginTop: 2, display: "block" }}>
                          ⚡ Flash forms require a closing time before publishing.
                        </span>
                      )}
                    </div>
                    {form.visibility === "restricted" && (
                      <div className="fc-field fc-field--full">
                        <label className="fc-label">Allowed Respondents <span className="fc-hint">(comma-separated emails)</span></label>
                        <textarea className="fc-input fc-textarea" style={{ height: 68 }} placeholder="user1@example.com, user2@example.com" value={form.allowedRespondentsText} onChange={(e) => updateField("allowedRespondentsText", e.target.value)} />
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
                      <p className="fc-personalization-hint">Pre-fill greeting names and company details per respondent.</p>
                      <PersonalizationEditor respondents={allowedRespondents} personalizations={form.personalizations} onChange={(v) => updateField("personalizations", v)} />
                    </>
                  )}

                  <div className="fc-divider" />
                  <p className="fc-sub-label">Duplicate Submission Prevention</p>
                  <div className="fc-chip-row">
                    {[["email", "📧 Email"], ["phone", "📱 Phone"], ["uniqueId", "🆔 Unique ID"]].map(([f, lbl]) => {
                      const on = form.duplicateCheckFields.includes(f);
                      return (
                        <button type="button" key={f}
                          onClick={() => {
                            const fields = on ? form.duplicateCheckFields.filter((x) => x !== f) : [...form.duplicateCheckFields, f];
                            updateField("duplicateCheckFields", fields);
                          }}
                          className={`fc-chip ${on ? "fc-chip--on" : ""}`}>{lbl}</button>
                      );
                    })}
                  </div>

                  {showLinksInSettings && (
                    <>
                      <div className="fc-divider" />
                      <PersonalizedLinksPanel
                        formId={savedFormId}
                        formSlug={savedFormSlug}
                        allowedRespondents={allowedRespondents}
                        personalizations={form.personalizations}
                      />
                      {isDirty && <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, fontStyle: "italic" }}>⚠️ You have unsaved changes — save the draft to refresh the links.</p>}
                    </>
                  )}

                  {form.visibility === "restricted" && allowedRespondents.length > 0 && !savedFormId && (
                    <>
                      <div className="fc-divider" />
                      <div className="fc-links-prompt">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Save the draft first to generate secure personalized links for your respondents.</span>
                      </div>
                    </>
                  )}

                  <div className="fc-nav-row">
                    <button type="button" className="fc-ghost-btn" onClick={() => setActiveSection("info")}>← Back</button>
                    <button type="button" className="fc-next-btn" onClick={() => setActiveSection("questions")}>
                      Next: Questions
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
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
                      <p className="fc-section-desc">{form.questions.length} question{form.questions.length !== 1 ? "s" : ""} added</p>
                    </div>
                    <button type="button" className="fc-add-q-btn" onClick={addQuestion}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      Add Question
                    </button>
                  </div>

                  <SavedTemplatesPanel
                    savedTemplates={savedTemplates}
                    onUse={addTemplate}
                    onDelete={handleDeleteTemplate}
                  />

                  <div className="fc-template-row">
                    <span className="fc-template-label">Quick add:</span>
                    {BUILTIN_QUESTION_TEMPLATES.map((t) => (
                      <button key={t.label} type="button" className="fc-template-chip" onClick={() => addTemplate(t)}>+ {t.label}</button>
                    ))}
                  </div>

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
                            <button type="button" className="fc-q-icon-btn" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
                            <button type="button" className="fc-q-icon-btn" onClick={() => moveQuestion(idx, 1)} disabled={idx === form.questions.length - 1} title="Move down">↓</button>
                            <button
                              type="button"
                              className={`fc-save-tpl-btn ${savingTplIdx === idx ? "fc-save-tpl-btn--saved" : ""}`}
                              title={q.prompt.trim() ? "Save as reusable template" : "Enter a prompt first"}
                              onClick={() => handleSaveAsTemplate(idx)}
                              disabled={!q.prompt.trim()}
                            >
                              {savingTplIdx === idx ? (
                                <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Saved!</>
                              ) : (
                                <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg> Save as Template</>
                              )}
                            </button>
                            <button type="button" className="fc-q-icon-btn fc-q-icon-btn--danger" onClick={() => removeQuestion(idx)} title="Remove question">✕</button>
                          </div>
                        </div>
                        <div className="fc-q-body">
                          <div className="fc-q-prompt-wrap">
                            <label className="fc-label">Question Prompt <span className="fc-req">*</span></label>
                            <input className="fc-input" required value={q.prompt} onChange={(e) => updateQuestion(idx, "prompt", e.target.value)} placeholder="Enter your question here…" />
                          </div>
                          <div className="fc-q-type-wrap">
                            <label className="fc-label">Response Type</label>
                            <select className="fc-input" value={q.type} onChange={(e) => updateQuestion(idx, "type", e.target.value)}>
                              <option value="text">✍️ Text Answer</option>
                              <option value="rating">⭐ Star Rating</option>
                              <option value="single-choice">🔘 Single Choice</option>
                              <option value="multiple-choice">☑️ Multiple Choice</option>
                            </select>
                          </div>
                        </div>
                        {(q.type === "single-choice" || q.type === "multiple-choice") && (
                          <div style={{ marginTop: 10 }}>
                            <label className="fc-label">
                              Options <span className="fc-hint">(comma-separated)</span>
                              {q.type === "multiple-choice" && (
                                <span className="fc-badge-multi">Multi-select enabled</span>
                              )}
                            </label>
                            <input className="fc-input" placeholder="Yes, No, Maybe, Not sure" value={q.optionsText} onChange={(e) => updateQuestion(idx, "optionsText", e.target.value)} />
                          </div>
                        )}
                        <div style={{ marginTop: 10 }}>
                          <label className="fc-label">Suggested Answer Templates <span className="fc-hint">(comma-separated)</span></label>
                          <textarea className="fc-input fc-textarea" style={{ height: 52 }} placeholder="Great session!, The speaker was excellent…" value={q.answerTemplatesText} onChange={(e) => updateQuestion(idx, "answerTemplatesText", e.target.value)} />
                        </div>
                        <div className="fc-q-required">
                          <input type="checkbox" id={`req-${idx}`} checked={q.required} onChange={(e) => updateQuestion(idx, "required", e.target.checked)} style={{ width: 14, height: 14, accentColor: "#3b82f6" }} />
                          <label htmlFor={`req-${idx}`} className="fc-label" style={{ cursor: "pointer", margin: 0 }}>Mandatory</label>
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

                  <div className="fc-nav-row">
                    <button type="button" className="fc-ghost-btn" onClick={() => setActiveSection("settings")}>← Back</button>
                    <button type="submit" className="fc-submit-btn" disabled={isSaving}>
                      {isSaving ? <><span className="fc-spinner" /> Publishing…</> : (
                        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>{" "}Save &amp; Publish</>
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

.fc-tpl-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 99999;
  box-shadow: 0 8px 30px rgba(0,0,0,0.25);
  animation: fc-toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
  font-family: 'DM Sans', system-ui, sans-serif;
  white-space: nowrap;
  pointer-events: none;
}
@keyframes fc-toast-in { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

.fc-main { flex:1; overflow-y:auto; background:#f8fafc; padding:20px 16px 60px; font-family:'DM Sans',system-ui,sans-serif; }
.fc-wrap { max-width:860px; margin:0 auto; }

.fc-draft-banner { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px; margin-bottom:16px; font-size:13px; color:#92400e; font-weight:500; }
.fc-draft-banner-left { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
.fc-draft-banner-actions { display:flex; gap:8px; flex-shrink:0; }
.fc-draft-restore { padding:5px 14px; border-radius:7px; background:#f59e0b; color:#fff; border:none; font-size:12px; font-weight:700; cursor:pointer; }
.fc-draft-discard { padding:5px 12px; border-radius:7px; background:transparent; color:#92400e; border:1px solid #fde68a; font-size:12px; font-weight:600; cursor:pointer; }

.fc-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
.fc-back-link { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#3b82f6; text-decoration:none; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px; }
.fc-page-title { font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.02em; margin:0; }
.fc-header-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fc-save-draft-btn { display:inline-flex; align-items:center; gap:7px; background:#fffbeb; color:#92400e; padding:8px 14px; border-radius:9px; font-size:12px; font-weight:700; border:1.5px solid #fde68a; cursor:pointer; transition:background 0.15s; white-space:nowrap; }
.fc-save-draft-btn:hover:not(:disabled) { background:#fef3c7; }
.fc-save-draft-btn:disabled { opacity:0.6; cursor:not-allowed; }
.fc-publish-btn { display:inline-flex; align-items:center; gap:7px; background:#0f172a; color:#fff; padding:8px 16px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:background 0.15s; white-space:nowrap; }
.fc-publish-btn:hover:not(:disabled) { background:#2563eb; }
.fc-publish-btn:disabled { opacity:0.6; cursor:not-allowed; }

.fc-status { display:flex; align-items:flex-start; gap:10px; padding:14px 16px; border-radius:10px; margin-bottom:16px; border:1px solid; font-size:13px; }
.fc-status--draft   { background:#fffbeb; border-color:#fde68a; color:#92400e; }
.fc-status--success { background:#f0fdf4; border-color:#bbf7d0; color:#166534; }
.fc-status--error   { background:#fff5f5; border-color:#fecaca; color:#dc2626; }
.fc-share-row { display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap; }
.fc-share-code { font-size:11px; background:rgba(0,0,0,0.06); padding:5px 10px; border-radius:6px; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; word-break:break-all; }
.fc-copy-btn { font-size:11px; font-weight:700; background:rgba(0,0,0,0.07); border:none; border-radius:6px; padding:5px 12px; cursor:pointer; color:inherit; white-space:nowrap; flex-shrink:0; }
.fc-open-btn { font-size:11px; font-weight:700; text-decoration:none; color:inherit; background:rgba(0,0,0,0.07); border-radius:6px; padding:5px 12px; white-space:nowrap; flex-shrink:0; }

.fc-personalized-links { margin-top:14px; padding-top:14px; border-top:1px solid rgba(0,0,0,0.08); }
.fc-personalized-links-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
.fc-pl-list { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
.fc-pl-row { display:grid; grid-template-columns:1fr 1fr auto; gap:8px; align-items:center; background:rgba(0,0,0,0.04); border-radius:8px; padding:8px 10px; }
.fc-pl-info { display:flex; flex-direction:column; gap:1px; overflow:hidden; min-width:0; }
.fc-pl-name { font-size:12px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-pl-email { font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-pl-url { font-size:10px; color:#2563eb; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:rgba(59,130,246,0.08); padding:4px 8px; border-radius:5px; min-width:0; }

.fc-links-prompt { display:flex; align-items:flex-start; gap:8px; padding:12px 14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; font-size:12px; color:#1d4ed8; font-weight:500; margin-top:8px; }

.fc-step-nav { display:flex; gap:4px; background:#fff; border:1px solid #e8ecf0; border-radius:11px; padding:5px; margin-bottom:18px; overflow-x:auto; -webkit-overflow-scrolling:touch; }
.fc-step-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:9px 10px; border-radius:8px; font-size:11px; font-weight:700; color:#64748b; background:transparent; border:none; cursor:pointer; transition:all 0.15s; white-space:nowrap; text-transform:uppercase; letter-spacing:0.05em; font-family:'DM Sans',system-ui,sans-serif; min-width:80px; }
.fc-step-btn--active { background:#0f172a; color:#fff; }
.fc-step-icon { font-size:13px; }

.fc-section { background:#fff; border-radius:14px; border:1px solid #e8ecf0; padding:20px; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.fc-section-header { margin-bottom:20px; display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.fc-section-title { font-size:17px; font-weight:800; color:#0f172a; margin:0 0 3px; letter-spacing:-0.01em; }
.fc-section-desc  { font-size:12.5px; color:#94a3b8; margin:0; }

.fc-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fc-field { display:flex; flex-direction:column; gap:5px; }
.fc-field--full { grid-column:1/-1; }
.fc-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; }
.fc-req   { color:#ef4444; }
.fc-hint  { text-transform:none; font-weight:500; letter-spacing:0; color:#cbd5e1; font-size:10px; }
.fc-input { width:100%; background:#f8fafc; border:1px solid #e8ecf0; border-radius:9px; padding:10px 12px; font-size:13px; color:#0f172a; outline:none; transition:border 0.15s,background 0.15s; box-sizing:border-box; font-family:'DM Sans',system-ui,sans-serif; }
.fc-input:focus { border-color:#3b82f6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
.fc-textarea { height:80px; resize:vertical; }

/* Toggle switch */
.fc-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 14px; background:#f8fafc; border:1px solid #e8ecf0; border-radius:10px; }
.fc-toggle-info { display:flex; flex-direction:column; gap:3px; flex:1; }
.fc-toggle-desc { font-size:12px; color:#64748b; font-weight:400; }
.fc-toggle-btn { position:relative; width:44px; height:24px; border-radius:99px; background:#e2e8f0; border:none; cursor:pointer; transition:background 0.2s; flex-shrink:0; padding:0; }
.fc-toggle-btn--on { background:#3b82f6; }
.fc-toggle-thumb { position:absolute; top:3px; left:3px; width:18px; height:18px; border-radius:50%; background:#fff; transition:transform 0.2s; display:block; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.fc-toggle-btn--on .fc-toggle-thumb { transform:translateX(20px); }

.fc-info-note { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; font-size:12px; color:#1d4ed8; font-weight:500; line-height:1.5; }

.fc-divider  { height:1px; background:#f1f5f9; margin:18px 0; }
.fc-sub-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:10px; }
.fc-chip-row { display:flex; flex-wrap:wrap; gap:7px; }
.fc-chip { padding:7px 14px; border-radius:99px; font-size:12px; font-weight:600; color:#64748b; background:#f8fafc; border:1.5px solid #e8ecf0; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-chip:hover { background:#f1f5f9; }
.fc-chip--on  { background:#0f172a; color:#fff; border-color:#0f172a; }

.fc-nav-row  { display:flex; justify-content:space-between; align-items:center; margin-top:22px; flex-wrap:wrap; gap:10px; }
.fc-next-btn { display:inline-flex; align-items:center; gap:8px; background:#3b82f6; color:#fff; padding:10px 16px; border-radius:9px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; transition:background 0.15s; white-space:nowrap; }
.fc-next-btn:hover { background:#2563eb; }
.fc-ghost-btn { display:inline-flex; align-items:center; gap:6px; background:transparent; color:#64748b; padding:10px 14px; border-radius:9px; font-size:12.5px; font-weight:600; border:1.5px solid #e8ecf0; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; white-space:nowrap; }
.fc-submit-btn { display:inline-flex; align-items:center; gap:8px; background:#0f172a; color:#fff; padding:11px 20px; border-radius:9px; font-size:13px; font-weight:700; border:none; cursor:pointer; box-shadow:0 4px 14px rgba(15,23,42,0.2); transition:background 0.15s; font-family:'DM Sans',system-ui,sans-serif; white-space:nowrap; }
.fc-submit-btn:hover:not(:disabled) { background:#2563eb; }
.fc-submit-btn:disabled { opacity:0.6; cursor:not-allowed; }

.fc-spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:currentColor; border-radius:50%; animation:fc-spin 0.6s linear infinite; display:inline-block; }
@keyframes fc-spin { to { transform:rotate(360deg); } }

.fc-q-list { display:flex; flex-direction:column; gap:10px; margin-top:4px; }
.fc-add-q-btn { display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#2563eb; padding:8px 12px; border-radius:8px; font-size:11.5px; font-weight:700; border:1.5px solid #bfdbfe; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; font-family:'DM Sans',system-ui,sans-serif; white-space:nowrap; }

.fc-template-row { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-bottom:12px; padding:11px 13px; background:#f8fafc; border-radius:9px; border:1px solid #e8ecf0; }
.fc-template-label { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; }
.fc-template-chip { font-size:11px; font-weight:600; color:#475569; background:#fff; border:1.5px solid #e8ecf0; border-radius:99px; padding:5px 11px; cursor:pointer; transition:all 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-template-chip:hover { background:#eff6ff; border-color:#bfdbfe; color:#2563eb; }

.fc-badge-multi { display:inline-block; font-size:9px; font-weight:700; color:#7c3aed; background:#f3e8ff; border:1px solid #e9d5ff; border-radius:99px; padding:2px 7px; margin-left:6px; text-transform:none; letter-spacing:0; vertical-align:middle; }

.fc-saved-tpl-wrap { margin-bottom:12px; border:1.5px solid #e9d5ff; border-radius:11px; overflow:hidden; background:#faf5ff; }
.fc-saved-tpl-toggle { width:100%; display:flex; align-items:center; gap:8px; padding:11px 14px; background:transparent; border:none; cursor:pointer; font-size:12px; font-weight:700; color:#7c3aed; font-family:'DM Sans',system-ui,sans-serif; text-align:left; transition:background 0.13s; }
.fc-saved-tpl-toggle:hover { background:#f3e8ff; }
.fc-saved-tpl-count { font-size:10px; font-weight:800; background:#7c3aed; color:#fff; border-radius:99px; padding:2px 8px; letter-spacing:0.02em; }
.fc-saved-tpl-list { border-top:1px solid #e9d5ff; background:#fff; }
.fc-saved-tpl-row { display:grid; grid-template-columns:28px 1fr auto auto; gap:8px; align-items:center; padding:10px 14px; border-bottom:1px solid #f5f3ff; transition:background 0.12s; }
.fc-saved-tpl-row:last-child { border-bottom:none; }
.fc-saved-tpl-row:hover { background:#faf5ff; }
.fc-saved-tpl-type-icon { font-size:16px; text-align:center; }
.fc-saved-tpl-info { display:flex; flex-direction:column; gap:2px; min-width:0; }
.fc-saved-tpl-prompt { font-size:13px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-saved-tpl-meta { font-size:10px; color:#94a3b8; font-weight:500; text-transform:capitalize; }
.fc-tpl-use-btn { font-size:11px; font-weight:700; color:#7c3aed; background:#f3e8ff; border:1.5px solid #e9d5ff; border-radius:7px; padding:5px 11px; cursor:pointer; white-space:nowrap; transition:all 0.13s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-tpl-use-btn:hover { background:#ede9fe; border-color:#c4b5fd; }
.fc-tpl-del-btn { width:26px; height:26px; border-radius:6px; background:transparent; border:1px solid #e8ecf0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#94a3b8; transition:all 0.13s; flex-shrink:0; }
.fc-tpl-del-btn:hover { background:#fff5f5; border-color:#fecaca; color:#ef4444; }

.fc-save-tpl-btn { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#7c3aed; background:#faf5ff; border:1.5px solid #e9d5ff; border-radius:7px; padding:5px 9px; cursor:pointer; white-space:nowrap; transition:all 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.fc-save-tpl-btn:hover:not(:disabled) { background:#ede9fe; border-color:#c4b5fd; }
.fc-save-tpl-btn:disabled { opacity:0.4; cursor:not-allowed; }
.fc-save-tpl-btn--saved { background:#f0fdf4 !important; border-color:#bbf7d0 !important; color:#16a34a !important; }

.fc-q-card { background:#fafbfc; border:1.5px solid #e8ecf0; border-radius:11px; padding:14px 16px; transition:border-color 0.15s; }
.fc-q-card:focus-within { border-color:#3b82f6; }
.fc-q-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
.fc-q-meta { display:flex; align-items:center; gap:8px; }
.fc-q-num  { width:24px; height:24px; border-radius:7px; background:#0f172a; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.fc-q-type-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; }
.fc-q-controls { display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
.fc-q-icon-btn { width:27px; height:27px; border-radius:6px; background:#f1f5f9; border:1px solid #e8ecf0; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; color:#64748b; font-weight:700; transition:all 0.13s; }
.fc-q-icon-btn:hover:not(:disabled) { background:#e2e8f0; }
.fc-q-icon-btn:disabled { opacity:0.3; cursor:not-allowed; }
.fc-q-icon-btn--danger { color:#ef4444; }
.fc-q-icon-btn--danger:hover { background:#fff5f5; border-color:#fecaca; }
.fc-q-body { display:flex; gap:12px; flex-wrap:wrap; }
.fc-q-prompt-wrap { flex:1; min-width:180px; display:flex; flex-direction:column; gap:5px; }
.fc-q-type-wrap   { width:180px; flex-shrink:0; display:flex; flex-direction:column; gap:5px; }
.fc-q-required    { display:flex; align-items:center; gap:7px; margin-top:10px; }
.fc-empty-q { text-align:center; padding:36px 20px; border:2px dashed #e8ecf0; border-radius:11px; color:#94a3b8; font-size:13px; }
.fc-empty-state { border-radius:9px; background:#f8fafc; }

.fc-personalization-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.fc-badge-info { font-size:10px; font-weight:700; color:#2563eb; background:#eff6ff; border:1px solid #bfdbfe; padding:3px 9px; border-radius:99px; }
.fc-personalization-hint { font-size:12px; color:#94a3b8; margin:0 0 12px; line-height:1.5; }
.fc-personalization-list { display:flex; flex-direction:column; gap:8px; }
.fc-person-row { display:grid; grid-template-columns:1fr 130px 150px; gap:8px; align-items:center; background:#fff; border:1px solid #e8ecf0; border-radius:9px; padding:10px 12px; }
.fc-person-id { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.fc-person-name, .fc-person-company { font-size:12px; }

@media (max-width:640px) {
  .fc-main { padding:12px 10px 80px; }
  .fc-wrap { max-width:100%; }
  .fc-field-grid { grid-template-columns:1fr !important; }
  .fc-q-body { flex-direction:column; }
  .fc-q-type-wrap { width:100% !important; }
  .fc-person-row { grid-template-columns:1fr; }
  .fc-pl-row { grid-template-columns:1fr auto; }
  .fc-pl-url { display:none; }
  .fc-header { flex-direction:column; align-items:flex-start; gap:10px; }
  .fc-header-actions { width:100%; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  .fc-save-draft-btn { flex:1; justify-content:center; font-size:11px; padding:9px 10px; }
  .fc-publish-btn { flex:1; justify-content:center; font-size:11px; padding:9px 10px; }
  .fc-step-nav { padding:4px; gap:3px; }
  .fc-step-btn { font-size:10px; padding:7px 8px; min-width:60px; white-space:nowrap; }
  .fc-step-icon { display:none; }
  .fc-section { padding:14px 12px; }
  .fc-section-title { font-size:15px; }
  .fc-page-title { font-size:17px; }
  .fc-share-code { max-width:100%; white-space:normal; word-break:break-all; }
  .fc-share-row { flex-direction:column; align-items:stretch; }
  .fc-share-row > * { width:100%; box-sizing:border-box; }
  .fc-saved-tpl-row { grid-template-columns:28px 1fr auto auto; }
  .fc-q-head { flex-direction:column; align-items:flex-start; }
  .fc-q-controls { width:100%; justify-content:flex-end; }
  .fc-save-tpl-btn { font-size:10px; padding:4px 7px; }
  .fc-nav-row { flex-direction:column-reverse; align-items:stretch; gap:8px; }
  .fc-next-btn, .fc-ghost-btn, .fc-submit-btn { justify-content:center; width:100%; box-sizing:border-box; }
  .fc-chip { font-size:11px; padding:7px 11px; }
  .fc-draft-banner { flex-direction:column; align-items:flex-start; }
  .fc-draft-banner-actions { width:100%; justify-content:flex-end; }
  .fc-template-row { flex-direction:column; align-items:flex-start; gap:8px; }
  .fc-toggle-row { flex-direction:column; align-items:flex-start; gap:10px; }
}

@media (max-width:400px) {
  .fc-step-btn { min-width:50px; font-size:9px; padding:6px 6px; }
  .fc-page-title { font-size:15px; }
  .fc-chip { font-size:10px; padding:6px 9px; }
  .fc-header-actions { flex-direction:column; }
  .fc-save-draft-btn, .fc-publish-btn { width:100%; justify-content:center; }
}

@media (max-width:480px) {
  .fc-template-row { flex-direction:column; align-items:flex-start; }
  .fc-chip-row { gap:5px; }
  .fc-chip { font-size:11px; padding:6px 10px; }
}
`;

export default FormCreator;