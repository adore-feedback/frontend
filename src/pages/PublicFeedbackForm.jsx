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

const getSentiment = (rating) => {
  const v = Number(rating);
  return v >= 4 ? "positive" : v <= 2 ? "negative" : "neutral";
};

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const current = hovered || Number(value) || 0;
  const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(String(star))}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 2,
              transition: "transform 0.15s",
              transform: star <= current ? "scale(1.18)" : "scale(1)",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24"
              fill={star <= current ? "#f59e0b" : "none"}
              stroke={star <= current ? "#f59e0b" : "#cbd5e1"}
              strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
        {current > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginLeft: 4 }}>
            {LABELS[current]}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Email Gate (restricted forms opened via common link) ─────────────────────
const EmailGate = ({ onSubmit, error, loading }) => {
  const [email, setEmail] = useState("");
  return (
    <div style={S.gateWrap}>
      <style>{CSS}</style>
      <div style={S.gateCard}>
        <div style={S.gateIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h2 style={S.gateTitle}>Access Verification</h2>
        <p style={S.gateDesc}>
          This form is restricted. Enter your email to confirm you're on the approved respondent list.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={S.inputLabel}>Email Address <span style={{ color: "#ef4444" }}>*</span></label>
          <input
            type="email" required autoFocus
            style={{ ...S.input, fontSize: 14 }}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && onSubmit(email)}
          />
        </div>
        {error && (
          <div style={S.alertError}>
            <span>⛔</span>
            <span>{error}</span>
          </div>
        )}
        <button type="button" style={{ ...S.submitBtn, opacity: (!email || loading) ? 0.6 : 1 }}
          onClick={() => onSubmit(email)} disabled={!email || loading}>
          {loading ? "Verifying…" : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Verify Access
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Already Responded Screen ─────────────────────────────────────────────────
const AlreadyResponded = ({ formTitle, respondentName, respondentEmail }) => (
  <div style={S.successWrap}>
    <style>{CSS}</style>
    <div style={S.successCard}>
      <div style={{ ...S.successIcon, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 style={S.successTitle}>Already Submitted</h1>
      <p style={S.successDesc}>
        {respondentName ? `Hi ${respondentName.split(" ")[0]}, you've` : "You've"}{" "}
        already submitted a response for{" "}
        <strong style={{ color: "#3b82f6" }}>{formTitle}</strong>.
      </p>
      {respondentEmail && (
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>
          Submitted as <strong>{respondentEmail}</strong>
        </p>
      )}
      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>
        Only one response per person is allowed. If you think this is an error, please contact the form administrator.
      </p>
      <div style={S.successDivider} />
      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Powered by Simtrak Feedback Hub</p>
    </div>
  </div>
);

// ─── Session Expired Screen ────────────────────────────────────────────────────
const SessionExpired = ({ onRetry }) => (
  <div style={S.successWrap}>
    <style>{CSS}</style>
    <div style={S.successCard}>
      <div style={{ ...S.successIcon, background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 style={S.successTitle}>Session Expired</h1>
      <p style={S.successDesc}>Your session has timed out. Please reopen your personalized link to continue.</p>
      <button type="button" style={S.submitBtn} onClick={onRetry}>Reload</button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PublicFeedbackForm = () => {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();

  const urlName     = searchParams.get("name")     || "";
  const urlEmail    = searchParams.get("email")    || "";
  const urlPhone    = searchParams.get("phone")    || "";
  const urlCompany  = searchParams.get("company")  || "";
  const urlUniqueId = searchParams.get("uniqueId") || "";

  // A personalized link carries the recipient's email in the URL.
  const isPersonalizedLink = Boolean(urlEmail);

  const [form, setForm]               = useState(null);
  const [prefillGreeting, setPrefillGreeting] = useState("");
  const [respondent, setRespondent]   = useState({
    name: "", email: "", phone: "", uniqueId: "", companyName: "", companyDetails: "",
  });
  const [answers, setAnswers]         = useState({});
  const [status, setStatus]           = useState({ type: "", message: "" });
  const [isLoading, setIsLoading]     = useState(true);
  const [submitted, setSubmitted]     = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [alreadyResponded, setAlreadyResponded]         = useState(false);
  const [alreadyRespondedEmail, setAlreadyRespondedEmail] = useState("");
  const [activeQ, setActiveQ]         = useState(null);

  const [needsEmailGate, setNeedsEmailGate] = useState(false);
  const [gateEmail, setGateEmail]           = useState("");
  const [gateError, setGateError]           = useState("");
  const [gateVerifying, setGateVerifying]   = useState(false);

  // ── Check localStorage for prior submission ────────────────────────────────
  useEffect(() => {
    const stored = getStoredSubmission(formId);
    if (stored) {
      setAlreadyResponded(true);
      setAlreadyRespondedEmail(stored.email || "");
      setIsLoading(false);
    }
  }, [formId]);

  // ── Load form ──────────────────────────────────────────────────────────────
  const loadForm = useCallback(
    async (overrideEmail = null) => {
      if (alreadyResponded) return;

      setIsLoading(true);
      setStatus({ type: "", message: "" });

      try {
        const access = {};

        if (isPersonalizedLink) {
          if (urlEmail)    access.email    = urlEmail;
          if (urlPhone)    access.phone    = urlPhone;
          if (urlUniqueId) access.uniqueId = urlUniqueId;
        } else if (overrideEmail || gateEmail) {
          access.email = overrideEmail || gateEmail;
        }

        // getPublicForm now automatically stores the accessToken in sessionStorage
        const data = await getPublicForm(formId, access);
        setForm(data.form);

        if (data.alreadyResponded) {
          const emailForBlock = urlEmail || overrideEmail || gateEmail || "";
          storeSubmission(formId, emailForBlock);
          setAlreadyRespondedEmail(emailForBlock);
          setAlreadyResponded(true);
          setIsLoading(false);
          return;
        }

        const serverPrefill = data.prefill || {};

        if (isPersonalizedLink) {
          setPrefillGreeting(urlName || serverPrefill.name || "");
          setRespondent({
            name:        urlName    || serverPrefill.name        || "",
            email:       urlEmail   || serverPrefill.email       || "",
            phone:       urlPhone   || serverPrefill.phone       || "",
            uniqueId:    urlUniqueId|| serverPrefill.uniqueId    || "",
            companyName: urlCompany || serverPrefill.companyName || "",
            companyDetails: "",
          });
        } else if (overrideEmail || gateEmail) {
          setRespondent((prev) => ({ ...prev, email: overrideEmail || gateEmail }));
        } else {
          const savedEmail = getSavedRespondentEmail();
          const savedName  = getSavedRespondentName();
          if (savedEmail || savedName) {
            setRespondent((prev) => ({
              ...prev,
              email: savedEmail || prev.email,
              name:  savedName  || prev.name,
            }));
            if (savedName) setPrefillGreeting(savedName.split(" ")[0]);
          }
        }
      } catch (err) {
        if (err.status === 403 && err.code === "RESTRICTED_FORM" && !isPersonalizedLink) {
          setNeedsEmailGate(true);
        } else {
          setStatus({ type: "error", message: err.message });
        }
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formId, isPersonalizedLink, urlEmail, urlPhone, urlUniqueId, urlName, urlCompany, gateEmail, alreadyResponded],
  );

  useEffect(() => { loadForm(); }, [loadForm]);

  // ── Email gate submission ──────────────────────────────────────────────────
  const handleGateSubmit = async (email) => {
    const stored = getStoredSubmission(formId);
    if (stored?.email && stored.email.toLowerCase() === email.toLowerCase()) {
      setAlreadyRespondedEmail(stored.email);
      setAlreadyResponded(true);
      setNeedsEmailGate(false);
      return;
    }

    setGateVerifying(true);
    setGateError("");
    try {
      // getPublicForm stores the access token automatically
      const data = await getPublicForm(formId, { email });
      setGateEmail(email);
      setNeedsEmailGate(false);
      setForm(data.form);
      if (data.alreadyResponded) {
        storeSubmission(formId, email);
        setAlreadyRespondedEmail(email);
        setAlreadyResponded(true);
        return;
      }
      setRespondent((prev) => ({ ...prev, email }));
    } catch (err) {
      if (err.status === 403) {
        setGateError("Your email is not on the approved respondent list for this form.");
      } else {
        setGateError(err.message || "Verification failed. Please try again.");
      }
    } finally {
      setGateVerifying(false);
    }
  };

  const ratingQ     = useMemo(() => form?.questions?.find((q) => q.type === "rating"), [form]);
  const ratingValue = answers[ratingQ?.id] || null;

  // ── Form submit ────────────────────────────────────────────────────────────
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
        value:      answers[q.id] ?? "",
      })),
    };

    console.log("PAYLOAD BEING SENT:", JSON.stringify(payload));

    try {
      // submitPublicFormResponse automatically attaches X-Form-Access-Token
      await submitPublicFormResponse(form._id || form.id || form.slug, payload);

      const submittedEmail = respondent.email || urlEmail || gateEmail || "";
      storeSubmission(formId, submittedEmail);

      if (!isPersonalizedLink && !gateEmail) {
        persistRespondentIdentity(respondent.email, respondent.name);
      }

      setSubmitted(true);
    } catch (err) {
      if (err.status === 409 || err.code === "DUPLICATE_RESPONSE") {
        const emailForBlock = respondent.email || urlEmail || gateEmail || "";
        storeSubmission(formId, emailForBlock);
        setAlreadyRespondedEmail(emailForBlock);
        setAlreadyResponded(true);
      } else if (err.code === "TOKEN_INVALID" || err.code === "TOKEN_REQUIRED") {
        // Token expired or missing — clear it and show session expired screen
        clearFormAccessToken(formId);
        setSessionExpired(true);
      } else {
        setStatus({ type: "error", message: err.message });
      }
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoading)
    return (
      <div style={S.loadWrap}>
        <style>{CSS}</style>
        <div style={S.loadRing} />
        <p style={S.loadText}>Loading…</p>
      </div>
    );

  if (needsEmailGate)
    return <EmailGate onSubmit={handleGateSubmit} error={gateError} loading={gateVerifying} />;

  if (sessionExpired)
    return <SessionExpired onRetry={() => window.location.reload()} />;

  if (!form && status.type === "error")
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Outfit', system-ui" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center", padding: 40, maxWidth: 420 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Access Denied</h2>
          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>{status.message}</p>
          {(status.message?.includes("not authorized") || status.message?.includes("credentials")) && (
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>
              This form requires a personalized link. Please use the link that was sent to you directly.
            </p>
          )}
        </div>
      </div>
    );

  if (alreadyResponded)
    return (
      <AlreadyResponded
        formTitle={form?.title}
        respondentName={respondent.name}
        respondentEmail={alreadyRespondedEmail}
      />
    );

  if (submitted) {
    const submittedEmail = respondent.email || urlEmail || gateEmail || "";
    return (
      <div style={S.successWrap}>
        <style>{CSS}</style>
        <div style={S.successCard}>
          <div style={S.successIcon}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={S.successTitle}>
            {respondent.name ? `Thank you, ${respondent.name.split(" ")[0]}!` : "Thank you!"}
          </h1>
          <p style={S.successDesc}>
            Your feedback for <strong style={{ color: "#3b82f6" }}>{form?.title}</strong> has been securely recorded.
          </p>
          {submittedEmail && (
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>
              📧 A confirmation copy has been sent to{" "}
              <strong>{submittedEmail}</strong>.
            </p>
          )}
          {!submittedEmail && (
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 20px" }}>
              You may close this window.
            </p>
          )}
          <div style={S.successDivider} />
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Powered by Simtrak Feedback Hub</p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const FORM_TYPE_ICONS = { webinar: "🎙️", flash: "⚡", survey: "📊", default: "📋" };
  const typeIcon = FORM_TYPE_ICONS[form.formType] || FORM_TYPE_ICONS.default;
  const greetingName = prefillGreeting || "";

  return (
    <main style={S.main}>
      <style>{CSS}</style>

      {/* ── Hero ── */}
      <header style={S.hero}>
        <div style={S.heroNoise} />
        <div style={S.heroOrb} />
        <div style={S.heroInner}>
          <div style={S.pill}>
            <span>{typeIcon}</span>
            <span>{form.formTypeLabel || form.formType || "Feedback Form"}</span>
          </div>
          {greetingName && (
            <p style={S.heroGreeting}>👋 Hey {greetingName}, we'd love your feedback!</p>
          )}
          <h1 style={S.heroTitle}>{form.title}</h1>
          {form.description && <p style={S.heroDesc}>{form.description}</p>}
          {form.availability?.closesAt && (
            <div style={S.closingBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Closes {new Date(form.availability.closesAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div style={S.progressBar}>
        <div style={S.progressInner}>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: "15%" }} />
          </div>
          <span style={S.progressLabel}>🔒 Secure · Confidential</span>
        </div>
      </div>

      {/* ── Form body ── */}
      <div style={S.formWrap}>
        <form style={{ display: "flex", flexDirection: "column", gap: 20 }} onSubmit={handleSubmit}>
          {respondent.email && (
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
              This response will be recorded as <b>{respondent.email}</b>
            </p>
          )}

          {/* Participant Details */}
          <section style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardHeaderIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 style={S.cardTitle}>Your Details</h2>
            </div>

            <div style={S.fieldGrid}>
              <div style={S.fieldWrap}>
                <label style={S.inputLabel}>Full Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  style={S.input} required placeholder="Your full name"
                  value={respondent.name}
                  onChange={(e) => setRespondent({ ...respondent, name: e.target.value })}
                />
              </div>

              <div style={S.fieldWrap}>
                <label style={S.inputLabel}>Email Address</label>
                <input
                  type="email" placeholder="you@example.com"
                  value={respondent.email}
                  readOnly={isPersonalizedLink || Boolean(gateEmail)}
                  onChange={(e) => {
                    if (!isPersonalizedLink && !gateEmail) {
                      setRespondent({ ...respondent, email: e.target.value });
                    }
                  }}
                  style={{
                    ...S.input,
                    ...(isPersonalizedLink || gateEmail
                      ? { background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }
                      : {}),
                  }}
                />
                {(isPersonalizedLink || Boolean(gateEmail)) && (
                  <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>✅ Verified</span>
                )}
                {!isPersonalizedLink && !gateEmail && respondent.email && getSavedRespondentEmail() === respondent.email.toLowerCase() && (
                  <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    ✦ Remembered from a previous submission — feel free to change it
                  </span>
                )}
              </div>

              {form.collectsPhone && (
                <div style={S.fieldWrap}>
                  <label style={S.inputLabel}>
                    Phone {form.phoneRequired && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <input
                    type="tel" style={S.input} placeholder="+91 98765 43210"
                    required={form.phoneRequired}
                    value={respondent.phone}
                    onChange={(e) => setRespondent({ ...respondent, phone: e.target.value })}
                  />
                </div>
              )}

              {form.collectsCompanyDetails && (
                <div style={S.fieldWrap}>
                  <label style={S.inputLabel}>
                    Company / Organisation {form.companyDetailsRequired && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  <input
                    style={S.input} placeholder="Your organisation"
                    required={form.companyDetailsRequired}
                    value={respondent.companyName}
                    onChange={(e) => setRespondent({ ...respondent, companyName: e.target.value })}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Questions */}
          {(form.questions || []).map((q, idx) => (
            <section
              key={q.id || idx}
              style={{ ...S.card, ...(activeQ === (q.id || idx) ? S.cardFocused : {}) }}
              onClick={() => setActiveQ(q.id || idx)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div style={S.qNum}>{idx + 1}</div>
                <label style={S.qPrompt}>
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
                    style={S.textarea} required={q.required}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Share your thoughts…"
                  />
                  {q.answerTemplates?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Quick fill:
                      </span>
                      {q.answerTemplates.slice(0, 3).map((t) => (
                        <button key={t} type="button" style={S.templateBtn}
                          onClick={() => setAnswers({ ...answers, [q.id]: t })}>
                          {t}
                        </button>
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
                      <label key={opt}
                        style={{ ...S.choiceLabel, ...(selected ? S.choiceLabelSelected : {}) }}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}>
                        <div style={{ ...S.choiceCircle, ...(selected ? S.choiceCircleSelected : {}) }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <input type="radio" style={{ display: "none" }} checked={selected} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400 }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "multiple-choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(q.options || []).map((opt) => {
                    const selected = (answers[q.id] || []).includes(opt);
                    return (
                      <label key={opt} style={{ ...S.choiceLabel, ...(selected ? S.choiceLabelSelected : {}) }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", border: selected ? "2px solid #3b82f6" : "2px solid #e2e8f0", background: selected ? "#3b82f6" : "transparent" }}>
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <input type="checkbox" style={{ display: "none" }} checked={selected}
                          onChange={() => {
                            const prev = answers[q.id] || [];
                            setAnswers({ ...answers, [q.id]: selected ? prev.filter((x) => x !== opt) : [...prev, opt] });
                          }} />
                        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400 }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          {status.type === "error" && (
            <div style={S.alertError}>
              <span>⚠️</span>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, margin: 0 }}>{status.message}</p>
            </div>
          )}

          <button type="submit" style={S.submitBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Submit Feedback
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            🔒 Secure · Confidential · Powered by Simtrak Feedback Hub
          </p>
        </form>
      </div>
    </main>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const S = {
  main:        { minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Outfit', system-ui, sans-serif", paddingBottom: 72 },
  loadWrap:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f1f5f9", gap: 16 },
  loadRing:    { width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  loadText:    { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" },
  hero:        { background: "linear-gradient(135deg,#0c1445 0%,#1a2f7a 55%,#1e40af 100%)", padding: "56px 20px 52px", position: "relative", overflow: "hidden" },
  heroNoise:   { position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "200px" },
  heroOrb:     { position: "absolute", right: -60, top: -60, width: 340, height: 340, background: "radial-gradient(circle,rgba(99,102,241,0.25) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  heroInner:   { maxWidth: 660, margin: "0 auto", position: "relative", zIndex: 1 },
  pill:        { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", padding: "5px 13px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 },
  heroGreeting:{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", margin: "0 0 8px", letterSpacing: "0.01em" },
  heroTitle:   { fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 10px" },
  heroDesc:    { fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 0 16px" },
  closingBadge:{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 99, padding: "5px 12px" },
  progressBar: { background: "#fff", borderBottom: "1px solid #e2e8f0" },
  progressInner:{ maxWidth: 680, margin: "0 auto", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 },
  progressTrack:{ flex: 1, height: 3, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#3b82f6,#6366f1)", borderRadius: 999 },
  progressLabel:{ fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" },
  formWrap:    { maxWidth: 700, margin: "0 auto", padding: "28px 20px" },
  card:        { background: "#fff", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "24px 26px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", transition: "border-color 0.2s, box-shadow 0.2s", cursor: "default" },
  cardFocused: { borderColor: "#3b82f6", boxShadow: "0 0 0 3px rgba(59,130,246,0.1)" },
  cardHeader:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 20 },
  cardHeaderIcon:{ width: 32, height: 32, borderRadius: 9, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 },
  cardTitle:   { fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 },
  fieldGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  fieldWrap:   { display: "flex", flexDirection: "column", gap: 5 },
  inputLabel:  { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" },
  input:       { width: "100%", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#0f172a", outline: "none", transition: "border 0.15s, background 0.15s, box-shadow 0.15s", boxSizing: "border-box", fontFamily: "'Outfit', system-ui" },
  textarea:    { width: "100%", minHeight: 108, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#0f172a", outline: "none", resize: "vertical", fontFamily: "'Outfit', system-ui", lineHeight: 1.65, boxSizing: "border-box", transition: "border 0.15s, box-shadow 0.15s" },
  templateBtn: { fontSize: 11, fontWeight: 600, color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 99, padding: "5px 12px", cursor: "pointer", transition: "all 0.15s", fontFamily: "'Outfit', system-ui" },
  qNum:        { width: 28, height: 28, borderRadius: 9, background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  qPrompt:     { fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.45 },
  choiceLabel: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 11, border: "1.5px solid #e2e8f0", cursor: "pointer", transition: "all 0.15s", background: "#fafbfc", userSelect: "none" },
  choiceLabelSelected:{ borderColor: "#3b82f6", background: "#eff6ff" },
  choiceCircle:{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" },
  choiceCircleSelected:{ border: "2px solid #3b82f6", background: "#3b82f6" },
  submitBtn:   { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "16px", background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: "0.02em", textTransform: "uppercase", boxShadow: "0 8px 24px rgba(37,99,235,0.38)", transition: "transform 0.15s, box-shadow 0.15s", fontFamily: "'Outfit', system-ui" },
  alertError:  { background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12, padding: "13px 16px", display: "flex", gap: 10, alignItems: "flex-start" },
  successWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg,#f1f5f9,#eff6ff)", padding: 20, fontFamily: "'Outfit', system-ui" },
  successCard: { background: "#fff", borderRadius: 22, padding: "52px 44px", textAlign: "center", maxWidth: 460, boxShadow: "0 24px 64px rgba(59,130,246,0.1)", border: "1px solid #e2e8f0" },
  successIcon: { width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", boxShadow: "0 10px 28px rgba(16,185,129,0.32)" },
  successTitle:{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 10px", letterSpacing: "-0.02em" },
  successDesc: { fontSize: 15, color: "#64748b", lineHeight: 1.65, margin: "0 0 12px" },
  successDivider:{ height: 1, background: "#f1f5f9", margin: "22px 0" },
  gateWrap:    { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg,#f1f5f9,#eff6ff)", padding: 20, fontFamily: "'Outfit', system-ui" },
  gateCard:    { background: "#fff", borderRadius: 22, padding: "48px 44px", maxWidth: 440, width: "100%", boxShadow: "0 24px 64px rgba(59,130,246,0.1)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 18 },
  gateIcon:    { width: 56, height: 56, borderRadius: 16, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" },
  gateTitle:   { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" },
  gateDesc:    { fontSize: 14, color: "#64748b", lineHeight: 1.65, margin: 0 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
input:focus, textarea:focus {
  border-color: #3b82f6 !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important;
}
button[type="submit"]:hover:not(:disabled) { transform: translateY(-1px) !important; box-shadow: 0 14px 36px rgba(37,99,235,0.48) !important; }
button[type="submit"]:active { transform: translateY(0) !important; }
button[type="submit"]:disabled { opacity: 0.55; cursor: not-allowed; }
@media (max-width: 600px) {
  div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
}
`;

export default PublicFeedbackForm;