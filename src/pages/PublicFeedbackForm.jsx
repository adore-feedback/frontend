import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  getPublicForm,
  submitPublicFormResponse,
  clearFormAccessToken,
} from "../api/feedbackApi";

// ─── localStorage helpers ─────────────────────────────────────────────────────
const SUBMISSION_KEY       = "simtrak_submitted_forms";
const RESPONDENT_EMAIL_KEY = "simtrak_respondent_email";
const RESPONDENT_NAME_KEY  = "simtrak_respondent_name";
const VERIFIED_ACCESS_KEY  = "simtrak_verified_access";

const getStoredSubmission = (formId) => {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[formId] || null;
  } catch { return null; }
};

const storeSubmission = (formId, email) => {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[formId] = { email: email || "", submittedAt: Date.now() };
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(map));
  } catch {}
};

const persistRespondentIdentity = (email, name) => {
  try {
    if (email) localStorage.setItem(RESPONDENT_EMAIL_KEY, email.toLowerCase().trim());
    if (name)  localStorage.setItem(RESPONDENT_NAME_KEY,  name.trim());
  } catch {}
};

const getSavedRespondentEmail = () => {
  try { return localStorage.getItem(RESPONDENT_EMAIL_KEY) || ""; } catch { return ""; }
};

const getSavedRespondentName = () => {
  try { return localStorage.getItem(RESPONDENT_NAME_KEY) || ""; } catch { return ""; }
};

const getVerifiedAccess = (formId) => {
  try {
    const raw = localStorage.getItem(VERIFIED_ACCESS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[formId] || null;
  } catch { return null; }
};

const storeVerifiedAccess = (formId, email, name) => {
  try {
    const raw = localStorage.getItem(VERIFIED_ACCESS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[formId] = { email: email.toLowerCase().trim(), name: name || "", verifiedAt: Date.now() };
    localStorage.setItem(VERIFIED_ACCESS_KEY, JSON.stringify(map));
  } catch {}
};

const clearVerifiedAccess = (formId) => {
  try {
    const raw = localStorage.getItem(VERIFIED_ACCESS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    delete map[formId];
    localStorage.setItem(VERIFIED_ACCESS_KEY, JSON.stringify(map));
  } catch {}
};

const getSentiment = (rating) => {
  const v = Number(rating);
  return v >= 4 ? "positive" : v <= 2 ? "negative" : "neutral";
};

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const current = hovered || Number(value) || 0;
  const LABELS  = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const COLORS  = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star} type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(String(star))}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 3,
              transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1)",
              transform: star <= current ? "scale(1.22)" : "scale(1)",
              outline: "none",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24"
              fill={star <= current ? COLORS[current] : "none"}
              stroke={star <= current ? COLORS[current] : "#d1d5db"}
              strokeWidth="1.5" style={{ display: "block", transition: "all 0.18s" }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
        {current > 0 && (
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: COLORS[current],
            marginLeft: 8,
            padding: "3px 12px",
            background: `${COLORS[current]}18`,
            borderRadius: 20,
            border: `1px solid ${COLORS[current]}30`,
            transition: "all 0.2s",
          }}>
            {LABELS[current]}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, email, size = 40 }) => {
  const char = (name || email || "?")[0].toUpperCase();
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#14b8a6"];
  const idx = char.charCodeAt(0) % colors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${colors[idx]}, ${colors[(idx+2)%colors.length]})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      fontFamily: "'DM Sans', system-ui",
      boxShadow: `0 2px 8px ${colors[idx]}40`,
    }}>{char}</div>
  );
};

// ─── Email Identity Gate ──────────────────────────────────────────────────────
const EmailIdentityGate = ({ formTitle, savedEmail, savedName, onVerified, isVerifying, error }) => {
  const [email, setEmail] = useState(savedEmail || "");
  const [name,  setName]  = useState(savedName  || "");
  const [showManual, setShowManual] = useState(!savedEmail);

  if (savedEmail && !showManual) {
    return (
      <div style={S.centeredPage}>
        <style>{CSS}</style>
        <div style={S.glassCard}>
          <div style={S.lockBadge}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 style={S.gateTitle}>Restricted Access</h1>
          <p style={S.gateSubtitle}>
            <strong style={{ color: "#111827" }}>{formTitle || "This form"}</strong> requires verification. Continue with your saved account?
          </p>

          <div style={S.identityCard}>
            <Avatar name={savedName} email={savedEmail} size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {savedName && <div style={{ fontWeight: 700, color: "#111827", fontSize: 15, marginBottom: 2 }}>{savedName}</div>}
              <div style={{ color: "#6b7280", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{savedEmail}</div>
            </div>
            <div style={S.verifiedChip}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              Saved
            </div>
          </div>

          {error && <div style={S.errorBox}><span>⚠️</span> {error} This account may not be on the access list.</div>}

          <button type="button" disabled={isVerifying} onClick={() => onVerified({ email: savedEmail, name: savedName })} style={S.primaryBtn} className="primary-btn">
            {isVerifying ? <><span style={S.spinnerEl} /> Verifying…</> : <>Continue as {savedName || savedEmail.split("@")[0]}</>}
          </button>

          <button type="button" onClick={() => { setShowManual(true); setEmail(""); setName(""); }} style={S.ghostBtn}>
            Use a different account
          </button>
          <div style={S.poweredByBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Secured by <strong>Simtrak Feedback Hub</strong></span>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onVerified({ email: email.trim().toLowerCase(), name: name.trim() });
  };

  return (
    <div style={S.centeredPage}>
      <style>{CSS}</style>
      <div style={S.glassCard}>
        <div style={S.lockBadge}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 style={S.gateTitle}>Verify Your Identity</h1>
        <p style={S.gateSubtitle}>
          <strong style={{ color: "#111827" }}>{formTitle || "This form"}</strong> is restricted to invited respondents only.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Your Name</label>
            <input style={S.input} placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus className="form-input" />
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Email Address <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="email" style={S.input} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="form-input" />
            <span style={S.hint}>Must match the email this form was sent to.</span>
          </div>

          {error && <div style={S.errorBox}><span>⚠️</span> {error}</div>}

          <button type="submit" disabled={isVerifying || !email.trim()} style={{ ...S.primaryBtn, marginTop: 4, opacity: (isVerifying || !email.trim()) ? 0.55 : 1 }} className="primary-btn">
            {isVerifying ? <><span style={S.spinnerEl} /> Verifying…</> : "Verify & Continue →"}
          </button>

          {savedEmail && (
            <button type="button" onClick={() => setShowManual(false)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "center" }}>
              ← Back to saved account
            </button>
          )}
        </form>
        <div style={S.poweredByBadge}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Secured by <strong>Simtrak Feedback Hub</strong></span>
        </div>
      </div>
    </div>
  );
};

// ─── Status Screens ───────────────────────────────────────────────────────────
const StatusScreen = ({ icon, iconBg, title, children }) => (
  <div style={S.centeredPage}>
    <style>{CSS}</style>
    <div style={S.glassCard}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: `0 8px 24px ${iconBg}60` }}>
        {icon}
      </div>
      {children}
      <div style={S.poweredByBadge}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.6 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span><strong>Simtrak Feedback Hub</strong></span>
      </div>
    </div>
  </div>
);

const AccessDeniedScreen = ({ email, onRetry }) => (
  <StatusScreen
    iconBg="#fee2e2"
    icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
  >
    <h1 style={{ ...S.gateTitle, color: "#111827" }}>Access Denied</h1>
    <p style={S.gateSubtitle}><strong style={{ color: "#ef4444" }}>{email}</strong> is not on the allowed respondents list for this form.</p>
    <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7, margin: "0 0 24px" }}>Contact the form administrator if you believe this is an error.</p>
    <button type="button" style={{ ...S.primaryBtn, background: "#374151" }} className="primary-btn" onClick={onRetry}>Try a Different Email</button>
  </StatusScreen>
);

const InvalidTokenScreen = ({ message }) => (
  <StatusScreen
    iconBg="#fee2e2"
    icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
  >
    <h1 style={{ ...S.gateTitle, color: "#111827" }}>Access Denied</h1>
    <p style={S.gateSubtitle}>{message || "This form requires a personalised invitation link. Please use the link sent to you directly."}</p>
  </StatusScreen>
);

const AlreadyResponded = ({ formTitle, respondentName, respondentEmail }) => (
  <StatusScreen
    iconBg="#fef3c7"
    icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
  >
    <h1 style={{ ...S.gateTitle, color: "#111827" }}>Already Submitted</h1>
    <p style={S.gateSubtitle}>{respondentName ? `Hi ${respondentName.split(" ")[0]}, you've` : "You've"} already submitted a response for <strong style={{ color: "#6366f1" }}>{formTitle}</strong>.</p>
    {respondentEmail && <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 8px" }}>Submitted as <strong style={{ color: "#374151" }}>{respondentEmail}</strong></p>}
    <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7, margin: "0 0 16px" }}>Only one response per person is allowed.</p>
  </StatusScreen>
);

const SessionExpired = ({ onRetry }) => (
  <StatusScreen
    iconBg="#fee2e2"
    icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg>}
  >
    <h1 style={{ ...S.gateTitle, color: "#111827" }}>Session Expired</h1>
    <p style={S.gateSubtitle}>Your session has timed out. Please reopen your personalised link to continue.</p>
    <button type="button" style={S.primaryBtn} className="primary-btn" onClick={onRetry}>Reload Page</button>
  </StatusScreen>
);

// ─── Saved Identity Banner ─────────────────────────────────────────────────────
const SavedIdentityBanner = ({ email, name, onClear }) => (
  <div style={S.identityBanner}>
    <Avatar name={name} email={email} size={36} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>Responding as</div>
      {name && <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{name}</div>}
      <div style={{ color: "#6b7280", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
    </div>
    <button type="button" onClick={onClear} style={{ background: "none", border: "1px solid #d1fae5", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#10b981", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'DM Sans', system-ui" }}>
      Not you?
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PublicFeedbackForm = () => {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get("token") || "";
  const isPersonalizedLink = Boolean(urlToken);

  const [gateState, setGateState]   = useState("idle");
  const [gateEmail, setGateEmail]   = useState("");
  const [gateName,  setGateName]    = useState("");
  const [gateError, setGateError]   = useState("");

  const [form, setForm]                       = useState(null);
  const [prefillGreeting, setPrefillGreeting] = useState("");
  const [respondent, setRespondent]           = useState({ name: "", email: "", phone: "", uniqueId: "", companyName: "", companyDetails: "" });
  const [answers, setAnswers]               = useState({});
  const [status, setStatus]                 = useState({ type: "", message: "" });
  const [isLoading, setIsLoading]           = useState(true);
  const [submitted, setSubmitted]           = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [alreadyResponded, setAlreadyResponded]           = useState(false);
  const [alreadyRespondedEmail, setAlreadyRespondedEmail] = useState("");
  const [activeQ, setActiveQ]               = useState(null);
  const [tokenError, setTokenError]         = useState("");

  useEffect(() => {
    const stored = getStoredSubmission(formId);
    if (stored) {
      setAlreadyResponded(true);
      setAlreadyRespondedEmail(stored.email || "");
      setIsLoading(false);
    }
  }, [formId]);

  const loadForm = useCallback(async (accessEmail = null, accessName = null) => {
    if (alreadyResponded) return;
    setIsLoading(true);
    setStatus({ type: "", message: "" });
    setTokenError("");

    try {
      const access = {};
      if (urlToken)    access.token = urlToken;
      if (accessEmail) access.email = accessEmail;

      const data = await getPublicForm(formId, access);
      setForm(data.form);

      if (data.alreadyResponded) {
        const verifiedEmail = data.prefill?.email || accessEmail || "";
        storeSubmission(formId, verifiedEmail);
        setAlreadyRespondedEmail(verifiedEmail);
        setAlreadyResponded(true);
        setIsLoading(false);
        return;
      }

      const serverPrefill = data.prefill || {};

      if (isPersonalizedLink) {
        setPrefillGreeting(serverPrefill.name || "");
        setRespondent({ name: serverPrefill.name || "", email: serverPrefill.email || "", phone: "", uniqueId: "", companyName: serverPrefill.companyName || "", companyDetails: "" });
        setGateState("verified");
      } else if (accessEmail) {
        const prefillName = serverPrefill.name || accessName || gateName || "";
        setPrefillGreeting(prefillName.split(" ")[0]);
        setRespondent((prev) => ({ ...prev, email: accessEmail, name: prefillName || prev.name, companyName: serverPrefill.companyName || prev.companyName }));
        storeVerifiedAccess(formId, accessEmail, prefillName || accessName || gateName);
        persistRespondentIdentity(accessEmail, prefillName || accessName || gateName);
        setGateState("verified");
      } else {
        const savedEmail = getSavedRespondentEmail();
        const savedName  = getSavedRespondentName();
        setRespondent((prev) => ({ ...prev, email: savedEmail || prev.email, name: savedName || prev.name, companyName: serverPrefill.companyName || prev.companyName }));
        if (savedName) setPrefillGreeting(savedName.split(" ")[0]);
      }
    } catch (err) {
      if (err.status === 403) {
        const code = err.code;
        if (code === "RESTRICTED_FORM") {
          const savedAccess = getVerifiedAccess(formId);
          if (savedAccess) {
            setGateEmail(savedAccess.email);
            setGateName(savedAccess.name || "");
            setGateState("gate");
          } else {
            const globalEmail = getSavedRespondentEmail();
            const globalName  = getSavedRespondentName();
            if (globalEmail) { setGateEmail(globalEmail); setGateName(globalName); }
            setGateState("gate");
          }
        } else if (code === "EMAIL_NOT_ALLOWED") {
          clearVerifiedAccess(formId);
          setGateState("denied");
          setGateError(err.message || `${gateEmail} is not authorised.`);
        } else {
          setTokenError(err.message || "Access denied.");
        }
      } else {
        setStatus({ type: "error", message: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, urlToken, alreadyResponded, isPersonalizedLink, gateEmail, gateName]);

  useEffect(() => { loadForm(); }, [loadForm]);

  const handleGateVerify = useCallback(async ({ email, name }) => {
    setGateState("verifying");
    setGateEmail(email);
    setGateName(name || "");
    setGateError("");
    await loadForm(email, name);
  }, [loadForm]);

  const handleGateRetry = useCallback(() => {
    clearVerifiedAccess(formId);
    setGateState("gate");
    setGateError("");
    setGateEmail("");
    setGateName("");
  }, [formId]);

  const handleClearIdentity = useCallback(() => {
    try {
      localStorage.removeItem(RESPONDENT_EMAIL_KEY);
      localStorage.removeItem(RESPONDENT_NAME_KEY);
    } catch {}
    setRespondent({ name: "", email: "", phone: "", uniqueId: "", companyName: "", companyDetails: "" });
    setPrefillGreeting("");
  }, []);

  const ratingQ     = useMemo(() => form?.questions?.find((q) => q.type === "rating"), [form]);
  const ratingValue = answers[ratingQ?.id] || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    const payload = {
      respondent,
      rating:    ratingValue ? Number(ratingValue) : undefined,
      sentiment: ratingValue ? getSentiment(ratingValue) : undefined,
      answers: form.questions.map((q) => ({
        questionId: q.id,
        prompt:     q.prompt,
        type:       q.type,
        value:      Array.isArray(answers[q.id]) ? answers[q.id] : (answers[q.id] ?? ""),
      })),
    };

    try {
      await submitPublicFormResponse(form._id || form.id || form.slug, payload);
      const submittedEmail = respondent.email || "";
      storeSubmission(formId, submittedEmail);
      if (!isPersonalizedLink) persistRespondentIdentity(respondent.email, respondent.name);
      setSubmitted(true);
    } catch (err) {
      if (err.status === 409 || err.code === "DUPLICATE_RESPONSE") {
        const emailForBlock = respondent.email || "";
        storeSubmission(formId, emailForBlock);
        setAlreadyRespondedEmail(emailForBlock);
        setAlreadyResponded(true);
      } else if (err.code === "TOKEN_INVALID" || err.code === "TOKEN_REQUIRED") {
        clearFormAccessToken(formId);
        setSessionExpired(true);
      } else {
        setStatus({ type: "error", message: err.message });
      }
    }
  };

  const savedEmail = getSavedRespondentEmail();
  const savedName  = getSavedRespondentName();
  const hasSavedIdentity = Boolean(savedEmail) && !isPersonalizedLink && form?.visibility === "public" && respondent.email === savedEmail;
  const savedAccessForForm = getVerifiedAccess(formId);
  const collectsName = form?.collectsName !== false;

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoading && gateState !== "verifying")
    return (
      <div style={S.centeredPage}>
        <style>{CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={S.loadRing} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.05em", margin: 0 }}>Loading form…</p>
        </div>
      </div>
    );

  if (tokenError)     return <InvalidTokenScreen message={tokenError} />;
  if (sessionExpired) return <SessionExpired onRetry={() => window.location.reload()} />;

  if (gateState === "gate" || gateState === "verifying") {
    const gatePrefilledEmail = gateEmail || savedAccessForForm?.email || savedEmail || "";
    const gatePrefilledName  = gateName  || savedAccessForForm?.name  || savedName  || "";
    return (
      <EmailIdentityGate
        formTitle={form?.title}
        savedEmail={gatePrefilledEmail}
        savedName={gatePrefilledName}
        onVerified={handleGateVerify}
        isVerifying={gateState === "verifying"}
        error={gateError}
      />
    );
  }

  if (gateState === "denied") return <AccessDeniedScreen email={gateEmail} onRetry={handleGateRetry} />;

  if (!form && status.type === "error")
    return (
      <div style={S.centeredPage}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center", padding: 40, maxWidth: 420 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8, fontFamily: "'DM Sans', system-ui" }}>Access Denied</h2>
          <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>{status.message}</p>
        </div>
      </div>
    );

  if (alreadyResponded)
    return <AlreadyResponded formTitle={form?.title} respondentName={respondent.name} respondentEmail={alreadyRespondedEmail} />;

  if (submitted) {
    const submittedEmail = respondent.email || "";
    return (
      <StatusScreen
        iconBg="#d1fae5"
        icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
      >
        <h1 style={{ ...S.gateTitle, color: "#111827" }}>
          {respondent.name ? `Thank you, ${respondent.name.split(" ")[0]}!` : "Thank you!"}
        </h1>
        <p style={S.gateSubtitle}>Your feedback has been securely recorded.</p>
        {submittedEmail && (
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 8px" }}>
            Submitted as <strong style={{ color: "#374151" }}>{submittedEmail}</strong>
          </p>
        )}
        {!submittedEmail && <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 8px" }}>You may close this window.</p>}
      </StatusScreen>
    );
  }

  if (!form) return null;

  // Only show form type badge — no title, no closing time
  const FORM_TYPE_ICONS = { webinar: "🎙️", flash: "⚡", survey: "📊", default: "📋" };
  const typeIcon = FORM_TYPE_ICONS[form.formType] || FORM_TYPE_ICONS.default;
  const formTypeLabel = form.formTypeLabel || form.formType || "Feedback";
  const greetingName = prefillGreeting || "";

  return (
    <main style={S.main}>
      <style>{CSS}</style>

      {/* ── Hero ── */}
      <header style={S.hero}>
        {/* Decorative background elements */}
        <div style={S.heroBg} />
        <div style={S.heroOrb1} />
        <div style={S.heroOrb2} />
        <div style={S.heroGrid} />

        <div style={S.heroContent}>

          {/* Simtrak Feedback Hub branding — prominent */}
          <div style={S.simtrakBrand}>
            <div style={S.simtrakLogoMark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={S.simtrakName}>Simtrak Feedback Hub</span>
          </div>

          {/* Form type — the only form metadata shown */}
          <div style={S.typeBadge}>
            <span>{typeIcon}</span>
            <span>{formTypeLabel}</span>
          </div>

          {/* Greeting */}
          {greetingName && (
            <p style={S.greeting}>👋 Hey {greetingName}, we'd love your feedback</p>
          )}
          {!greetingName && (
            <p style={S.greeting}>We'd love to hear from you</p>
          )}

          {/* Decorative divider with tagline */}
          <div style={S.heroDivider}>
            <div style={S.heroDividerLine} />
            <div style={S.heroDividerLine} />
          </div>

          {/* Trust indicators row */}
          <div style={S.heroTrustRow}>
            <div style={S.heroTrustDot} />
            <div style={S.heroTrustItem}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Takes 2–3 minutes</span>
            </div>
            <div style={S.heroTrustDot} />
            <div style={S.heroTrustItem}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span>Encrypted & secure</span>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={S.body}>

        {hasSavedIdentity && (
          <SavedIdentityBanner email={savedEmail} name={savedName} onClear={handleClearIdentity} />
        )}

        <form style={{ display: "flex", flexDirection: "column", gap: 16 }} onSubmit={handleSubmit}>

          {/* Verified identity chip */}
          {respondent.email && (isPersonalizedLink || gateState === "verified") && (
            <div style={S.verifiedBanner}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
              </svg>
              <span style={{ flex: 1 }}>Verified as <strong>{respondent.email}</strong></span>
              {!isPersonalizedLink && gateState === "verified" && (
                <button type="button" onClick={() => { clearVerifiedAccess(formId); setGateState("gate"); setGateEmail(""); setGateName(""); setGateError(""); }} style={{ background: "none", border: "1px solid #a7f3d0", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#10b981", cursor: "pointer", fontWeight: 600, flexShrink: 0, fontFamily: "'DM Sans', system-ui" }}>
                  Switch
                </button>
              )}
            </div>
          )}

          {/* Participant Details */}
          <section style={S.card}>
            <div style={S.sectionHead}>
              <div style={S.sectionIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 style={S.sectionTitle}>Your Details</h2>
            </div>

            <div style={S.fieldGrid}>
              {collectsName && (
                <div style={S.fieldGroup}>
                  <label style={S.label}>
                    Full Name
                    <span style={{ color: "#9ca3af", fontWeight: 500, marginLeft: 4, fontSize: 10, textTransform: "none" }}>(optional)</span>
                  </label>
                  <input
                    style={S.input} placeholder="Your full name" value={respondent.name}
                    onChange={(e) => setRespondent({ ...respondent, name: e.target.value })}
                    readOnly={isPersonalizedLink}
                    className="form-input"
                  />
                  {isPersonalizedLink && <span style={S.prefillNote}>✓ Pre-filled from your profile</span>}
                </div>
              )}

              <div style={S.fieldGroup}>
                <label style={S.label}>Email Address</label>
                <input
                  type="email" placeholder="you@example.com" value={respondent.email}
                  readOnly={isPersonalizedLink || gateState === "verified"}
                  onChange={(e) => { if (!isPersonalizedLink && gateState !== "verified") setRespondent({ ...respondent, email: e.target.value }); }}
                  className="form-input"
                  style={{
                    ...S.input,
                    ...((isPersonalizedLink || gateState === "verified") ? { background: "#f9fafb", color: "#6b7280", cursor: "not-allowed" } : {}),
                  }}
                />
                {isPersonalizedLink && <span style={S.prefillNote}>✓ Verified via your personalised link</span>}
                {!isPersonalizedLink && gateState === "verified" && <span style={S.prefillNote}>✓ Verified — cannot be changed</span>}
              </div>

              {form.collectsPhone && (
                <div style={S.fieldGroup}>
                  <label style={S.label}>
                    Phone {form.phoneRequired && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <input
                    type="tel" style={S.input} placeholder="+91 98765 43210"
                    required={form.phoneRequired} value={respondent.phone}
                    onChange={(e) => setRespondent({ ...respondent, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              )}

              {form.collectsCompanyDetails && (
                <div style={S.fieldGroup}>
                  <label style={S.label}>
                    Company / Organisation {form.companyDetailsRequired && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <input
                    className="form-input"
                    style={{
                      ...S.input,
                      ...((isPersonalizedLink || (gateState === "verified" && Boolean(respondent.companyName))) ? { background: "#f9fafb", color: "#6b7280", cursor: "not-allowed" } : {}),
                    }}
                    placeholder="Your organisation"
                    required={form.companyDetailsRequired}
                    value={respondent.companyName}
                    readOnly={isPersonalizedLink || (gateState === "verified" && Boolean(respondent.companyName))}
                    onChange={(e) => { if (!isPersonalizedLink && !(gateState === "verified" && respondent.companyName)) setRespondent({ ...respondent, companyName: e.target.value }); }}
                  />
                  {(isPersonalizedLink || (gateState === "verified" && Boolean(respondent.companyName))) && <span style={S.prefillNote}>✓ Pre-filled from your profile</span>}
                </div>
              )}
            </div>
          </section>

          {/* Questions */}
          {(form.questions || []).map((q, idx) => (
            <section
              key={q.id || idx}
              style={{ ...S.card, ...(activeQ === (q.id || idx) ? S.cardActive : {}) }}
              onClick={() => setActiveQ(q.id || idx)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div style={S.qBadge}>{idx + 1}</div>
                <label style={S.qLabel}>
                  {q.prompt}
                  {q.required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
                </label>
              </div>

              {q.type === "rating" && (
                <StarRating value={answers[q.id] || ""} onChange={(val) => setAnswers({ ...answers, [q.id]: val })} />
              )}

              {q.type === "text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea
                    className="form-input"
                    style={S.textarea} required={q.required}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Share your thoughts…"
                  />
                  {q.answerTemplates?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick fill:</span>
                      {q.answerTemplates.slice(0, 3).map((t) => (
                        <button key={t} type="button" style={S.chip} onClick={() => setAnswers({ ...answers, [q.id]: t })} className="chip-btn">{t}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {q.type === "single-choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(q.options || []).map((opt) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <label key={opt} style={{ ...S.optionRow, ...(selected ? S.optionRowSelected : {}) }} onClick={() => setAnswers({ ...answers, [q.id]: opt })}>
                        <div style={{ ...S.radio, ...(selected ? S.radioSelected : {}) }}>
                          {selected && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <input type="radio" style={{ display: "none" }} checked={selected} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? "#111827" : "#374151" }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "multiple-choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, fontWeight: 600 }}>Select all that apply</div>
                  {(q.options || []).map((opt) => {
                    const currentAnswers = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                    const selected = currentAnswers.includes(opt);
                    return (
                      <label key={opt} style={{ ...S.optionRow, ...(selected ? S.optionRowSelected : {}), cursor: "pointer" }}
                        onClick={() => {
                          const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                          setAnswers({ ...answers, [q.id]: selected ? prev.filter((x) => x !== opt) : [...prev, opt] });
                        }}>
                        <div style={{ width: 19, height: 19, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", border: selected ? "2px solid #6366f1" : "2px solid #d1d5db", background: selected ? "#6366f1" : "transparent" }}>
                          {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <input type="checkbox" style={{ display: "none" }} checked={selected} onChange={() => {}} />
                        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? "#111827" : "#374151" }}>{opt}</span>
                      </label>
                    );
                  })}
                  {Array.isArray(answers[q.id]) && answers[q.id].length > 0 && (
                    <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, marginTop: 2 }}>{answers[q.id].length} selected</div>
                  )}
                </div>
              )}
            </section>
          ))}

          {status.type === "error" && (
            <div style={S.errorBox}>
              <span>⚠️</span>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, margin: 0 }}>{status.message}</p>
            </div>
          )}

          <button type="submit" style={S.primaryBtn} className="primary-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Submit Feedback
          </button>

          {/* Footer branding */}
          <div style={S.footerBrand}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "#6366f1", flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span><strong style={{ color: "#6366f1" }}>Simtrak Feedback Hub</strong> · Responses are private and confidential</span>
          </div>
        </form>
      </div>
    </main>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const S = {
  main:          { minHeight: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 80 },
  centeredPage:  { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9fafb", padding: 20, fontFamily: "'DM Sans', system-ui" },

  // Gate / status card
  glassCard:     { background: "#fff", borderRadius: 20, padding: "44px 40px", textAlign: "center", maxWidth: 440, width: "100%", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 60px -10px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6" },
  lockBadge:     { width: 56, height: 56, borderRadius: 16, background: "#f0f0fe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#6366f1" },
  gateTitle:     { fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 8px", fontFamily: "'DM Sans', system-ui", letterSpacing: "-0.01em" },
  gateSubtitle:  { fontSize: 14, color: "#6b7280", lineHeight: 1.65, margin: "0 0 24px" },
  identityCard:  { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fafafa", border: "1px solid #f3f4f6", borderRadius: 12, marginBottom: 20, textAlign: "left" },
  verifiedChip:  { display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#10b981", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 20, padding: "3px 10px", flexShrink: 0 },

  // Powered by — replaced with highlighted Simtrak brand
  poweredByBadge: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "#9ca3af", margin: "20px 0 0", fontWeight: 500 },

  // Form inputs
  fieldGroup:    { display: "flex", flexDirection: "column", gap: 5 },
  label:         { fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.01em" },
  hint:          { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  input:         { width: "100%", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#111827", outline: "none", transition: "all 0.15s", boxSizing: "border-box", fontFamily: "'DM Sans', system-ui" },
  textarea:      { width: "100%", minHeight: 112, background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#111827", outline: "none", resize: "vertical", fontFamily: "'DM Sans', system-ui", lineHeight: 1.65, boxSizing: "border-box", transition: "all 0.15s" },
  prefillNote:   { fontSize: 11, color: "#10b981", marginTop: 3, fontWeight: 600 },

  // Buttons
  primaryBtn:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "14px 20px", background: "#111827", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em", transition: "all 0.15s", fontFamily: "'DM Sans', system-ui" },
  ghostBtn:      { width: "100%", background: "none", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer", fontFamily: "'DM Sans', system-ui", marginTop: 8, transition: "all 0.15s" },
  chip:          { fontSize: 12, fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 20, padding: "5px 13px", cursor: "pointer", fontFamily: "'DM Sans', system-ui", transition: "all 0.15s" },

  // Error
  errorBox:      { display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#dc2626", fontWeight: 600, textAlign: "left" },
  spinnerEl:     { width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" },

  // Load
  loadRing:      { width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" },

  // ── Hero ──
  hero:          { background: "#111827", padding: "48px 24px 52px", position: "relative", overflow: "hidden" },
  heroBg:        { position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 75% 40%, rgba(99,102,241,0.22) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(139,92,246,0.15) 0%, transparent 50%)", pointerEvents: "none" },
  heroOrb1:      { position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.1)", pointerEvents: "none" },
  heroOrb2:      { position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.08)", pointerEvents: "none" },
  heroGrid:      { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  heroContent:   { maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1 },

  // Simtrak brand in hero
  simtrakBrand:  { display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "6px 14px 6px 10px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 99 },
  simtrakLogoMark: { width: 26, height: 26, borderRadius: 8, background: "rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a5b4fc" },
  simtrakName:   { fontSize: 12, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.04em" },

  // Form type badge
  typeBadge:     { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", padding: "6px 16px", borderRadius: 99, marginBottom: 18, letterSpacing: "0.02em" },

  greeting:      { fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.3, margin: "0 0 20px" },

  // Decorative divider
  heroDivider:   { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  heroDividerLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.1)" },
  heroDividerText: { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" },

  // Trust indicators
  heroTrustRow:  { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  heroTrustItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 },
  heroTrustDot:  { width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" },

  // Body
  body:          { maxWidth: 680, margin: "0 auto", padding: "24px 20px" },

  // Identity banners
  identityBanner: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: 12, marginBottom: 8 },
  verifiedBanner: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #d1fae5", borderRadius: 10, fontSize: 13, color: "#065f46", fontWeight: 600 },

  // Cards
  card:          { background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6", padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border-color 0.2s, box-shadow 0.2s" },
  cardActive:    { borderColor: "#c7d2fe", boxShadow: "0 0 0 3px rgba(99,102,241,0.08)" },

  // Section header
  sectionHead:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  sectionIcon:   { width: 30, height: 30, borderRadius: 8, background: "#f0f0fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1", flexShrink: 0 },
  sectionTitle:  { fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 },

  // Field grid
  fieldGrid:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },

  // Question
  qBadge:        { width: 26, height: 26, borderRadius: 8, background: "#111827", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  qLabel:        { fontSize: 15, fontWeight: 600, color: "#111827", lineHeight: 1.5 },

  // Choices
  optionRow:        { display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "1.5px solid #f3f4f6", cursor: "pointer", transition: "all 0.15s", background: "#fafafa", userSelect: "none" },
  optionRowSelected:{ borderColor: "#c7d2fe", background: "#f0f0fe" },
  radio:            { width: 18, height: 18, borderRadius: "50%", border: "2px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  radioSelected:    { border: "2px solid #6366f1", background: "#6366f1" },

  // Footer branding
  footerBrand:   { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "#9ca3af", fontWeight: 500, marginTop: 4 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }

.form-input:focus {
  border-color: #6366f1 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
  outline: none !important;
}

.primary-btn:hover:not(:disabled) {
  background: #1f2937 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 20px rgba(17,24,39,0.25) !important;
}
.primary-btn:active { transform: translateY(0) !important; }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.chip-btn:hover { background: #e5e7eb !important; border-color: #d1d5db !important; }

/* ── Responsive ── */
@media (max-width: 640px) {
  /* Hero padding */
  header[style*="padding: 48px"] {
    padding: 36px 16px 40px !important;
  }

  /* Greeting font size */
  p[style*="fontSize: 24"] {
    font-size: 20px !important;
  }

  /* Trust row wraps gracefully — handled by flexWrap already */

  /* Cards */
  section[style*="padding: 22px 24px"] {
    padding: 16px !important;
    border-radius: 10px !important;
  }

  /* Body padding */
  div[style*="padding: 24px 20px"] {
    padding: 16px 12px !important;
  }

  /* Field grid: single column */
  div[style*="grid-template-columns: 1fr 1fr"] {
    grid-template-columns: 1fr !important;
  }

  /* Gate card padding */
  div[style*="padding: 44px 40px"] {
    padding: 32px 20px !important;
  }

  /* Star rating wraps */
  div[style*="display: flex"][style*="gap: 6"] {
    flex-wrap: wrap;
  }
}

@media (max-width: 400px) {
  /* Simtrak brand text */
  span[style*="fontSize: 12"][style*="fontWeight: 700"][style*="color: #a5b4fc"] {
    font-size: 11px !important;
  }

  /* Trust row hides dots on very small screens */
  div[style*="width: 3"][style*="height: 3"] {
    display: none !important;
  }
}
`;

export default PublicFeedbackForm;