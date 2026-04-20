import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs";
import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getFormResults, getForms } from "../../api/feedbackApi";
import { getDemoResults } from "../../data/demoFeedback";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/* ─── small components ─────────────────────────── */
const SentimentBadge = ({ sentiment }) => {
  const MAP = {
    positive: {
      bg: "#dcfce7",
      color: "#166534",
      icon: "😊",
      label: "Positive",
    },
    neutral: { bg: "#fef3c7", color: "#92400e", icon: "😐", label: "Neutral" },
    negative: {
      bg: "#fee2e2",
      color: "#991b1b",
      icon: "😞",
      label: "Negative",
    },
  };
  const s = MAP[sentiment] || MAP.neutral;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        padding: "3px 8px",
        borderRadius: 99,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
};

const RatingStars = ({ rating }) => {
  const r = Number(rating) || 0;
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{ fontSize: 14, color: s <= r ? "#f59e0b" : "#e5e7eb" }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const ProgressBar = ({ value, max, color = "#3b82f6" }) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div
      style={{
        height: 6,
        background: "#f1f5f9",
        borderRadius: 999,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </div>
  );
};

/* ── Draft Mode Banner ── */
const DraftBanner = ({ formTitle }) => (
  <div className="ar-draft-banner">
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#92400e"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
    <span>
      <strong>"{formTitle}"</strong> is in Draft mode — analytics and responses
      will appear once it is published as <strong>Live</strong>.
    </span>
    <Link to="/admin/forms/new" className="ar-draft-edit-link">
      Edit Form →
    </Link>
  </div>
);

/* ── Deleted Form Banner ── */
const DeletedFormBanner = ({ formTitle }) => (
  <div className="ar-deleted-banner">
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7c3aed"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
    <span>
      <strong>"{formTitle || "This form"}"</strong> has been deleted — but all
      responses are permanently preserved below.
    </span>
    <Link to="/admin" className="ar-draft-edit-link">
      ← Dashboard
    </Link>
  </div>
);

/* ═══ AdminResult ════════════════════════════════ */
const AdminResult = () => {
  const { formId } = useParams();
  const navigate = useNavigate();

  const [allForms, setAllForms] = useState([]);
  const [formsLoadDone, setFormsLoadDone] = useState(false);

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [selectedResponse, setSelectedResponse] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef(null);

  // Form switcher state
  const [formSearchInput, setFormSearchInput] = useState("");
  const [formSearchOpen, setFormSearchOpen] = useState(false);
  // Track if user has typed anything in the form switcher search
  const [hasSearched, setHasSearched] = useState(false);
  const formSearchRef = useRef(null);
  const formSearchInputRef = useRef(null);

  /* ── Debounce response search ── */
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(
      () => setSearchQuery(searchInput.trim()),
      350,
    );
    return () => clearTimeout(searchTimerRef.current);
  }, [searchInput]);

  /* ── Close form search on outside click or Escape ── */
  useEffect(() => {
    const onMouse = (e) => {
      if (formSearchRef.current && !formSearchRef.current.contains(e.target)) {
        setFormSearchOpen(false);
        setHasSearched(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setFormSearchOpen(false);
        setHasSearched(false);
      }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ── Load ALL forms including deleted ── */
  useEffect(() => {
    getForms({ includeDeleted: true })
      .then((data) => setAllForms(Array.isArray(data.forms) ? data.forms : []))
      .catch(() => setAllForms([]))
      .finally(() => setFormsLoadDone(true));
  }, []);

  /* ── Load results ── */
  useEffect(() => {
    if (!formId) return;

    searchQuery ? setIsSearching(true) : setIsLoading(true);
    setLoadError("");

    getFormResults(formId, searchQuery ? { search: searchQuery } : {})
      .then((data) => setResult(data))
      .catch((err) => {
        const fallback = getDemoResults(formId);
        if (fallback?.analytics) {
          setResult(fallback);
        } else {
          setLoadError(err?.message || "Could not load results for this form.");
          setResult(null);
        }
      })
      .finally(() => {
        setIsLoading(false);
        setIsSearching(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, searchQuery]);

  /* ── Redirect to first form when no formId in URL ── */
  useEffect(() => {
    if (!formId && formsLoadDone && allForms.length > 0) {
      navigate(`/admin/result/${allForms[0]._id || allForms[0].id}`, {
        replace: true,
      });
    }
  }, [formId, formsLoadDone, allForms, navigate]);

  /* ── Reset search on form switch ── */
  useEffect(() => {
    setSearchInput("");
    setSearchQuery("");
  }, [formId]);

  const handleSearchChange = useCallback(
    (e) => setSearchInput(e.target.value),
    [],
  );
  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
  }, []);

  const formatAnswerValue = (value) => {
    if (value == null) return "—";
    if (typeof value === "string") return value.trim() ? value : "—";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const currentFormFromList = formsLoadDone
    ? allForms.find((f) => (f._id || f.id) === formId)
    : null;

  const isDeletedForm =
    formsLoadDone &&
    !!formId &&
    (currentFormFromList?.status === "deleted" ||
      (!currentFormFromList && formsLoadDone));

  const currentForm = result?.form;

  /* ── Form search list ──
   * Shows ALL statuses (live, draft, closed, deleted) sorted:
   * live first → draft → closed → deleted.
   * Only renders results when user has typed in the search box (search-first UX).
   * Active/current form is always shown at the top as a pinned item.
   */
  const STATUS_ORDER = { live: 0, draft: 1, closed: 2, deleted: 3 };

  const sortedAllForms = [...allForms].sort((a, b) => {
    // Current form always first
    const aIsActive = (a._id || a.id) === formId ? -1 : 0;
    const bIsActive = (b._id || b.id) === formId ? -1 : 0;
    if (aIsActive !== bIsActive) return aIsActive - bIsActive;
    return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
  });

  const filteredFormList = formSearchInput.trim()
    ? sortedAllForms.filter((f) =>
        f.title.toLowerCase().includes(formSearchInput.toLowerCase().trim()),
      )
    : sortedAllForms;

  // Group for display: active form pinned, then grouped by status
  const activeFormEntry = allForms.find((f) => (f._id || f.id) === formId);
  const otherForms = filteredFormList.filter((f) => (f._id || f.id) !== formId);

  const groupedOthers = {
    live: otherForms.filter((f) => f.status === "live"),
    draft: otherForms.filter((f) => f.status === "draft"),
    closed: otherForms.filter((f) => f.status === "closed"),
    deleted: otherForms.filter((f) => f.status === "deleted"),
  };

  /* ── Loading / error states ── */
  if (isLoading && !result)
    return (
      <>
        <style>{CSS}</style>
        <div className="ar-load-wrap">
          <div className="ar-load-ring" />
          <p className="ar-load-text">Loading Records…</p>
        </div>
      </>
    );

  if (loadError && !result)
    return (
      <>
        <style>{CSS}</style>
        <main className="ar-main">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <Link to="/admin" className="ar-back-btn">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Results
            </h1>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e8ecf0",
              borderRadius: 14,
              padding: "48px 32px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 40 }}>🔍</span>
            <p
              style={{
                marginTop: 12,
                fontSize: 15,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              No results found
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              {loadError}
            </p>
            <Link
              to="/admin"
              style={{
                display: "inline-flex",
                marginTop: 18,
                background: "#0f172a",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </main>
      </>
    );

  const analytics = result?.analytics || {};
  const recentResponses = analytics.recentResponses || [];
  const sentimentData = analytics.sentimentBreakdown || [];
  const keywords = analytics.topKeywords || [];
  const totalResponses = analytics.totalResponses || 0;
  const avgRating = analytics.averageRating;
  const completionRate = analytics.completionRate;
  const isDraft = currentForm?.status === "draft";
  const displayed = recentResponses;

  const showResponses = isDeletedForm || !isDraft;

  /* ── Export analytics to Excel ── */
  const handleExport = () => {
    if (!currentForm) return;
    const wb = XLSX.utils.book_new();
    const formTitle = currentForm.title || "Form";

    // Sheet 1: Overview
    const overviewRows = [
      ["Form Title", formTitle],
      ["Form Type", currentForm.formType || ""],
      ["Status", isDeletedForm ? "Deleted" : currentForm.status || ""],
      ["Total Responses", analytics.totalResponses || 0],
      ["Average Rating", analytics.averageRating ?? "N/A"],
      ["Completion Rate (%)", analytics.completionRate ?? "N/A"],
      ["Exported At", new Date().toLocaleString()],
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
    wsOverview["!cols"] = [{ wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

    // Sheet 2: Sentiment Breakdown
    const wsSentiment = XLSX.utils.aoa_to_sheet([
      ["Sentiment", "Count", "Percentage (%)"],
      ...(analytics.sentimentBreakdown || []).map((s) => [
        s.label || s.sentiment,
        s.count,
        s.percentage,
      ]),
    ]);
    wsSentiment["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSentiment, "Sentiment");

    // Sheet 3: Top Keywords
    const wsKeywords = XLSX.utils.aoa_to_sheet([
      ["Keyword", "Count"],
      ...(analytics.topKeywords || []).map((k) => [k.keyword, k.count]),
    ]);
    wsKeywords["!cols"] = [{ wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsKeywords, "Top Keywords");

    // Sheet 4: All Responses
    const wsResponses = XLSX.utils.aoa_to_sheet([
      [
        "#",
        "Name",
        "Email",
        "Company / Role",
        "Rating",
        "Sentiment",
        "Submitted At",
        "Answers",
      ],
      ...(analytics.recentResponses || []).map((r, i) => [
        i + 1,
        r.respondentName || "Anonymous",
        r.respondentEmail || "",
        r.respondentRole || "",
        r.rating ?? "",
        r.sentimentLabel || r.sentiment || "",
        r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
        (r.answers || [])
          .map(
            (a) =>
              `${a.prompt || a.questionId}: ${Array.isArray(a.value) ? a.value.join(", ") : a.value}`,
          )
          .join(" | "),
      ]),
    ]);
    wsResponses["!cols"] = [
      { wch: 4 },
      { wch: 22 },
      { wch: 28 },
      { wch: 20 },
      { wch: 8 },
      { wch: 12 },
      { wch: 20 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, wsResponses, "Responses");

    const safeTitle = formTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    XLSX.writeFile(wb, `${safeTitle}_analytics.xlsx`);
  };

  /* ── Status dot color ── */
  const STATUS_DOT = {
    live: "#10b981",
    draft: "#f59e0b",
    closed: "#6b7280",
    deleted: "#7c3aed",
  };

  /* ── Render a form item in the switcher list ── */
  const renderFormItem = (f, isPinned = false) => {
    const fId = f._id || f.id;
    const isActive = fId === formId;
    const isDeleted = f.status === "deleted";
    return (
      <button
        key={fId}
        role="option"
        aria-selected={isActive}
        className={`ar-fsp-item${isActive ? " ar-fsp-item--active" : ""}${isDeleted ? " ar-fsp-item--deleted" : ""}`}
        onClick={() => {
          navigate(`/admin/result/${fId}`);
          setFormSearchOpen(false);
          setFormSearchInput("");
          setHasSearched(false);
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: STATUS_DOT[f.status] || "#94a3b8",
              flexShrink: 0,
            }}
          />
          <div className="ar-fsp-item-body">
            <span className="ar-fsp-item-title">
              {f.title}
              {isPinned && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#3b82f6",
                    background: "#eff6ff",
                    borderRadius: 4,
                    padding: "1px 5px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Current
                </span>
              )}
            </span>
            <span className="ar-fsp-item-meta">
              {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
              {f.responseCount != null
                ? ` · ${f.responseCount} response${f.responseCount !== 1 ? "s" : ""}`
                : ""}
            </span>
          </div>
        </div>
        {isActive && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDeleted ? "#7c3aed" : "#3b82f6"}
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <>
      <style>{CSS}</style>

      <main className="ar-main">
        {/* ── Header ── */}
        <div className="ar-top-bar">
          <div className="ar-top-left">
            <Link to="/admin" className="ar-back-btn" title="Back to Dashboard">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div ref={formSearchRef} style={{ position: "relative" }}>
              <p className="ar-top-eyebrow">Results for</p>

              {/* ── Trigger button: shows active form title ── */}
              <button
                className={`ar-form-switcher-btn${formSearchOpen ? " ar-form-switcher-btn--open" : ""}`}
                onClick={() => {
                  const next = !formSearchOpen;
                  setFormSearchOpen(next);
                  setFormSearchInput("");
                  setHasSearched(false);
                  if (next) {
                    // Auto-focus the input after opening
                    setTimeout(() => formSearchInputRef.current?.focus(), 50);
                  }
                }}
                title="Switch form"
                aria-haspopup="listbox"
                aria-expanded={formSearchOpen}
              >
                <span className="ar-form-switcher-title">
                  {currentForm?.title ||
                    currentFormFromList?.title ||
                    "Select a form…"}
                </span>
                {isDeletedForm && (
                  <span className="ar-form-switcher-tag">deleted</span>
                )}
                <svg
                  className="ar-form-switcher-chevron"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* ── Search panel ── */}
              {formSearchOpen && (
                <div className="ar-fsp" role="listbox">
                  {/* Search bar */}
                  <div className="ar-fsp-search">
                    <svg
                      className="ar-fsp-search-icon"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      ref={formSearchInputRef}
                      className="ar-fsp-input"
                      autoFocus
                      placeholder="Search forms by name…"
                      value={formSearchInput}
                      onChange={(e) => {
                        setFormSearchInput(e.target.value);
                        setHasSearched(true);
                      }}
                      aria-label="Search forms"
                    />
                    {formSearchInput && (
                      <button
                        className="ar-fsp-clear"
                        onClick={() => {
                          setFormSearchInput("");
                          setHasSearched(false);
                        }}
                        aria-label="Clear search"
                      >
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Results list */}
                  <div className="ar-fsp-list">
                    {/* Always show current/active form pinned at top */}
                    {activeFormEntry && (
                      <div className="ar-fsp-group">
                        <div className="ar-fsp-group-label">
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "#3b82f6",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          Currently Viewing
                        </div>
                        {renderFormItem(activeFormEntry, true)}
                      </div>
                    )}

                    {/* Other forms only appear after user starts typing */}
                    {!hasSearched && !formSearchInput && (
                      <div className="ar-fsp-hint">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <span>Type to search all forms</span>
                      </div>
                    )}

                    {/* Search results (other forms) */}
                    {hasSearched && (
                      <>
                        {filteredFormList.filter(
                          (f) => (f._id || f.id) !== formId,
                        ).length === 0 && formSearchInput ? (
                          <div className="ar-fsp-empty">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#cbd5e1"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span>
                              No other forms found for "{formSearchInput}"
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Live */}
                            {groupedOthers.live.length > 0 && (
                              <div className="ar-fsp-group">
                                <div className="ar-fsp-group-label">
                                  <span className="ar-fsp-dot ar-fsp-dot--live" />
                                  Live
                                </div>
                                {groupedOthers.live.map((f) =>
                                  renderFormItem(f),
                                )}
                              </div>
                            )}
                            {/* Draft */}
                            {groupedOthers.draft.length > 0 && (
                              <div className="ar-fsp-group">
                                <div className="ar-fsp-group-label">
                                  <span className="ar-fsp-dot ar-fsp-dot--draft" />
                                  Draft
                                </div>
                                {groupedOthers.draft.map((f) =>
                                  renderFormItem(f),
                                )}
                              </div>
                            )}
                            {/* Closed */}
                            {groupedOthers.closed.length > 0 && (
                              <div className="ar-fsp-group">
                                <div className="ar-fsp-group-label">
                                  <span className="ar-fsp-dot ar-fsp-dot--closed" />
                                  Closed
                                </div>
                                {groupedOthers.closed.map((f) =>
                                  renderFormItem(f),
                                )}
                              </div>
                            )}
                            {/* Deleted */}
                            {groupedOthers.deleted.length > 0 && (
                              <div className="ar-fsp-group">
                                <div className="ar-fsp-group-label">
                                  <span className="ar-fsp-dot ar-fsp-dot--deleted" />
                                  Deleted
                                </div>
                                {groupedOthers.deleted.map((f) =>
                                  renderFormItem(f),
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="ar-fsp-footer">
                    <kbd className="ar-fsp-kbd">↑↓</kbd> navigate &nbsp;·&nbsp;{" "}
                    <kbd className="ar-fsp-kbd">↵</kbd> select &nbsp;·&nbsp;{" "}
                    <kbd className="ar-fsp-kbd">Esc</kbd> close
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="ar-top-right">
            <div className="ar-search-wrap">
              {isSearching ? (
                <span className="ar-search-spinner" />
              ) : (
                <svg
                  className="ar-search-icon"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
              <input
                className="ar-search-input"
                placeholder="Search by name, email…"
                value={searchInput}
                onChange={handleSearchChange}
                aria-label="Search responses"
              />
              {searchInput && (
                <button
                  type="button"
                  className="ar-search-clear"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button
              className="ar-export-btn"
              onClick={handleExport}
              disabled={!currentForm || (analytics.totalResponses || 0) === 0}
              title={
                (analytics.totalResponses || 0) === 0
                  ? "No responses to export"
                  : "Export analytics to Excel"
              }
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* ── Banners ── */}
        {isDeletedForm && <DeletedFormBanner formTitle={currentForm?.title} />}
        {isDraft && !isDeletedForm && currentForm && (
          <DraftBanner formTitle={currentForm.title} />
        )}

        {/* ── KPI Strip ── */}
        {showResponses && (
          <div className="ar-kpi-row">
            <div className="ar-kpi">
              <span className="ar-kpi-val">
                {totalResponses.toLocaleString()}
              </span>
              <span className="ar-kpi-label">Total Responses</span>
            </div>
            {avgRating != null && (
              <div className="ar-kpi">
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 5 }}
                >
                  <span className="ar-kpi-val">{avgRating}</span>
                  <span
                    style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}
                  >
                    /5
                  </span>
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
                <span className="ar-kpi-val" style={{ color: "#10b981" }}>
                  {sentimentData[0].percentage}%
                </span>
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
                  {isDraft && !isDeletedForm
                    ? "No responses yet — form is in draft mode"
                    : searchQuery
                      ? isSearching
                        ? `Searching for "${searchQuery}"…`
                        : `${displayed.length} result${displayed.length !== 1 ? "s" : ""} for "${searchQuery}"`
                      : `${displayed.length} response${displayed.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
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
                  {isDraft && !isDeletedForm ? (
                    <tr>
                      <td colSpan={4} className="ar-empty-row">
                        <span style={{ fontSize: 32 }}>📝</span>
                        <p
                          style={{
                            marginTop: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#94a3b8",
                          }}
                        >
                          Publish this form to start collecting responses
                        </p>
                      </td>
                    </tr>
                  ) : displayed.length > 0 ? (
                    displayed.map((resp) => {
                      const id = resp._id || resp.id;
                      return (
                        <tr
                          key={id}
                          onMouseEnter={() => setHoveredRow(id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className="ar-row"
                          style={{
                            background: hoveredRow === id ? "#f8fafc" : "#fff",
                          }}
                        >
                          <td className="ar-td-name">
                            <div className="ar-avatar">
                              {(resp.respondentName || "A")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="ar-resp-name">
                                {resp.respondentName || "Anonymous"}
                              </p>
                              <p className="ar-resp-role">
                                {resp.respondentEmail ||
                                  resp.respondentRole ||
                                  "Respondent"}
                              </p>
                            </div>
                          </td>
                          <td className="ar-td ar-td--center">
                            {resp.sentiment ? (
                              <SentimentBadge sentiment={resp.sentiment} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="ar-td ar-td--date">
                            {resp.submittedAt
                              ? dateFormatter.format(new Date(resp.submittedAt))
                              : "N/A"}
                          </td>
                          <td className="ar-td ar-td--right">
                            <button
                              className="ar-view-btn"
                              onClick={() => setSelectedResponse(resp)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="ar-empty-row">
                        <div style={{ textAlign: "center" }}>
                          <span style={{ fontSize: 32 }}>
                            {searchQuery ? "🔍" : "📭"}
                          </span>
                          <p
                            style={{
                              marginTop: 8,
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#94a3b8",
                            }}
                          >
                            {searchQuery ? (
                              <>
                                <span>No results for "{searchQuery}" — </span>
                                <button
                                  className="ar-clear-link"
                                  onClick={clearSearch}
                                >
                                  clear search
                                </button>
                              </>
                            ) : (
                              "No responses yet"
                            )}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          {showResponses && (
            <div className="ar-sidebar">
              {sentimentData.length > 0 && (
                <div className="ar-side-card">
                  <h3 className="ar-side-title">Sentiment Breakdown</h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    {[
                      { data: sentimentData[0], color: "#10b981", emoji: "😊" },
                      { data: sentimentData[1], color: "#f59e0b", emoji: "😐" },
                      { data: sentimentData[2], color: "#ef4444", emoji: "😞" },
                    ]
                      .filter((i) => i.data)
                      .map((item) => (
                        <div
                          key={item.data.sentiment}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 13, width: 20 }}>
                            {item.emoji}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#64748b",
                              width: 55,
                            }}
                          >
                            {item.data.label}
                          </span>
                          <ProgressBar
                            value={item.data.count}
                            max={totalResponses}
                            color={item.color}
                          />
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#0f172a",
                              minWidth: 34,
                              textAlign: "right",
                            }}
                          >
                            {item.data.percentage}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {keywords.length > 0 && (
                <div className="ar-side-card">
                  <h3 className="ar-side-title">Top Keywords</h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {keywords.slice(0, 6).map((k, i) => (
                      <div
                        key={k.keyword}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#94a3b8",
                            width: 14,
                            textAlign: "right",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0f172a",
                          }}
                        >
                          {k.keyword}
                        </span>
                        <ProgressBar
                          value={k.count}
                          max={keywords[0].count}
                          color="#6366f1"
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#6366f1",
                            minWidth: 22,
                            textAlign: "right",
                          }}
                        >
                          {k.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentForm && (
                <div className="ar-side-card">
                  <h3 className="ar-side-title">Form Info</h3>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {[
                      ["Type", currentForm.formType],
                      [
                        "Status",
                        isDeletedForm ? "Deleted" : currentForm.status,
                      ],
                      ["Questions", currentForm.questionCount],
                    ]
                      .filter(([, v]) => v != null)
                      .map(([label, val]) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color:
                                isDeletedForm && label === "Status"
                                  ? "#7c3aed"
                                  : "#0f172a",
                              textTransform: "capitalize",
                            }}
                          >
                            {val}
                          </span>
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
          <div className="ar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ar-modal-header">
              <div>
                <h3 className="ar-modal-title">Response Detail</h3>
                <p className="ar-modal-sub">
                  {dateFormatter.format(
                    new Date(selectedResponse.submittedAt || Date.now()),
                  )}
                </p>
              </div>
              <button
                type="button"
                className="ar-close-btn"
                onClick={() => setSelectedResponse(null)}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="ar-resp-card">
              <div className="ar-resp-avatar">
                {(selectedResponse.respondentName || "A")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {selectedResponse.respondentName || "Anonymous"}
                </p>
                <p
                  style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}
                >
                  {selectedResponse.respondentEmail ||
                    selectedResponse.respondentRole ||
                    "Respondent"}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {selectedResponse.sentiment && (
                    <SentimentBadge sentiment={selectedResponse.sentiment} />
                  )}
                  {selectedResponse.rating && (
                    <RatingStars rating={selectedResponse.rating} />
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: 0,
                }}
              >
                Answers
              </p>
              {Array.isArray(selectedResponse.answers) &&
              selectedResponse.answers.length > 0 ? (
                selectedResponse.answers.map((a, idx) => (
                  <div
                    key={`${a.questionId || "q"}-${idx}`}
                    className="ar-answer-box"
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        margin: "0 0 5px",
                      }}
                    >
                      {a.prompt || `Answer ${idx + 1}`}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#374151",
                        lineHeight: 1.6,
                        margin: 0,
                        fontStyle: "italic",
                      }}
                    >
                      {formatAnswerValue(a.value)}
                    </p>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  No response data recorded.
                </p>
              )}
            </div>

            <button
              type="button"
              className="ar-dismiss-btn"
              onClick={() => setSelectedResponse(null)}
            >
              Dismiss
            </button>
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

.ar-top-bar  { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
.ar-top-left { display:flex; align-items:center; gap:12px; flex:1; min-width:0; }
.ar-top-right { display:flex; gap:10px; align-items:center; flex-shrink:0; flex-wrap:wrap; }
.ar-back-btn { width:36px; height:36px; border-radius:9px; background:#fff; border:1px solid #e8ecf0; display:flex; align-items:center; justify-content:center; color:#64748b; text-decoration:none; box-shadow:0 1px 3px rgba(0,0,0,0.06); flex-shrink:0; transition:background 0.15s; }
.ar-back-btn:hover { background:#f1f5f9; }
.ar-top-eyebrow { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; margin:0 0 2px; }

/* ── Form Switcher Trigger ── */
.ar-form-switcher-btn { display:inline-flex; align-items:center; gap:8px; background:transparent; border:1.5px solid transparent; padding:4px 8px 4px 0; border-radius:8px; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; max-width:400px; transition:all 0.15s; }
.ar-form-switcher-btn:hover { background:#f1f5f9; padding:4px 8px; border-color:#e2e8f0; }
.ar-form-switcher-btn--open { background:#eff6ff; padding:4px 8px; border-color:#bfdbfe; }
.ar-form-switcher-title { font-size:17px; font-weight:800; color:#0f172a; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px; transition:color 0.15s; }
.ar-form-switcher-btn:hover .ar-form-switcher-title, .ar-form-switcher-btn--open .ar-form-switcher-title { color:#2563eb; }
.ar-form-switcher-tag { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#7c3aed; background:#f3e8ff; border:1px solid #e9d5ff; border-radius:5px; padding:2px 6px; flex-shrink:0; }
.ar-form-switcher-chevron { color:#64748b; flex-shrink:0; transition:transform 0.2s; }
.ar-form-switcher-btn--open .ar-form-switcher-chevron { transform:rotate(180deg); color:#2563eb; }

/* ── Form Search Panel (ar-fsp) ── */
@keyframes ar-panel-in { from { opacity:0; transform:translateY(-8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
.ar-fsp { position:absolute; top:calc(100% + 6px); left:-8px; z-index:9999; background:#fff; border:1.5px solid #e2e8f0; border-radius:16px; box-shadow:0 20px 60px rgba(15,23,42,0.16), 0 4px 16px rgba(15,23,42,0.06); width:360px; animation:ar-panel-in 0.18s cubic-bezier(0.34,1.2,0.64,1); }
.ar-fsp-search { display:flex; align-items:center; gap:0; padding:12px 14px; border-bottom:1px solid #f1f5f9; position:relative; }
.ar-fsp-search-icon { position:absolute; left:26px; color:#94a3b8; pointer-events:none; flex-shrink:0; }
.ar-fsp-input { flex:1; padding:9px 36px 9px 30px; background:#f8fafc; border:1.5px solid #e8ecf0; border-radius:10px; font-size:13px; color:#0f172a; outline:none; font-family:'DM Sans',system-ui,sans-serif; box-sizing:border-box; transition:all 0.15s; width:100%; }
.ar-fsp-input:focus { border-color:#3b82f6; background:#fff; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
.ar-fsp-clear { position:absolute; right:22px; width:20px; height:20px; border-radius:50%; background:#e2e8f0; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:background 0.13s; flex-shrink:0; }
.ar-fsp-clear:hover { background:#cbd5e1; }

.ar-fsp-list { max-height:320px; overflow-y:auto; padding:6px 0 4px; }
.ar-fsp-group { padding:0; }
.ar-fsp-group + .ar-fsp-group { border-top:1px solid #f1f5f9; padding-top:4px; margin-top:4px; }
.ar-fsp-group-label { display:flex; align-items:center; gap:7px; font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; padding:8px 16px 5px; }
.ar-fsp-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.ar-fsp-dot--live    { background:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,0.2); }
.ar-fsp-dot--draft   { background:#f59e0b; box-shadow:0 0 0 2px rgba(245,158,11,0.2); }
.ar-fsp-dot--closed  { background:#6b7280; box-shadow:0 0 0 2px rgba(107,114,128,0.2); }
.ar-fsp-dot--deleted { background:#7c3aed; box-shadow:0 0 0 2px rgba(124,58,237,0.15); }

.ar-fsp-item { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; padding:9px 16px; background:none; border:none; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; text-align:left; transition:background 0.1s; }
.ar-fsp-item:hover { background:#f8fafc; }
.ar-fsp-item--active { background:#eff6ff !important; }
.ar-fsp-item--deleted .ar-fsp-item-title { color:#7c3aed; }
.ar-fsp-item--active.ar-fsp-item--deleted { background:#faf5ff !important; }
.ar-fsp-item-body { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
.ar-fsp-item-title { font-size:13px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ar-fsp-item-meta { font-size:11px; color:#94a3b8; font-weight:500; }

/* Search-first hint */
.ar-fsp-hint { display:flex; flex-direction:column; align-items:center; gap:6px; padding:20px 16px 16px; color:#94a3b8; font-size:12px; font-weight:500; }
.ar-fsp-empty { display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 16px; color:#94a3b8; font-size:12px; font-weight:500; }
.ar-fsp-footer { display:flex; align-items:center; justify-content:center; gap:2px; padding:8px 14px; border-top:1px solid #f1f5f9; font-size:10px; color:#94a3b8; }
.ar-fsp-kbd { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:4px; padding:1px 5px; font-size:9px; font-family:monospace; color:#64748b; }

.ar-search-wrap   { position:relative; display:flex; align-items:center; }
.ar-search-icon   { position:absolute; left:10px; color:#94a3b8; pointer-events:none; }
.ar-search-spinner { position:absolute; left:10px; width:13px; height:13px; border:2px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:spin 0.6s linear infinite; pointer-events:none; flex-shrink:0; }
.ar-search-input { padding:8px 34px 8px 30px; background:#fff; border:1.5px solid #e8ecf0; border-radius:9px; font-size:12px; color:#0f172a; outline:none; width:210px; font-family:'DM Sans',system-ui,sans-serif; transition:border 0.15s; box-sizing:border-box; }
.ar-search-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.08); }
.ar-search-clear { position:absolute; right:8px; width:20px; height:20px; border-radius:99px; background:#e2e8f0; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#64748b; transition:background 0.13s; }
.ar-search-clear:hover { background:#cbd5e1; }
.ar-export-btn { display:inline-flex; align-items:center; gap:6px; background:#0f172a; color:#fff; padding:8px 14px; border-radius:9px; font-size:12px; font-weight:700; border:none; cursor:pointer; letter-spacing:0.02em; transition:background 0.15s; font-family:'DM Sans',system-ui,sans-serif; }
.ar-export-btn:hover:not(:disabled) { background:#2563eb; }
.ar-export-btn:disabled { opacity:0.45; cursor:not-allowed; }

.ar-draft-banner { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:13px; color:#92400e; font-weight:500; line-height:1.5; }
.ar-draft-edit-link { font-size:12px; font-weight:700; color:#2563eb; text-decoration:none; white-space:nowrap; margin-left:auto; }
.ar-draft-edit-link:hover { text-decoration:underline; }
.ar-deleted-banner { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#faf5ff; border:1px solid #e9d5ff; border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:13px; color:#7c3aed; font-weight:500; line-height:1.5; }

.ar-kpi-row { display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.ar-kpi { background:#fff; border:1px solid #e8ecf0; border-radius:12px; padding:16px 18px; flex:1 1 110px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.ar-kpi-val { font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-0.02em; display:block; line-height:1; }
.ar-kpi-label { font-size:10px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; display:block; margin-top:4px; }

.ar-grid { display:grid; grid-template-columns:1fr 270px; gap:18px; align-items:start; }

.ar-table-card { background:#fff; border-radius:13px; border:1px solid #e8ecf0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.ar-table-header { padding:16px 20px; border-bottom:1px solid #f1f5f9; }
.ar-table-title { font-size:14px; font-weight:800; color:#0f172a; margin:0; }
.ar-table-sub { font-size:12px; color:#94a3b8; margin:2px 0 0; }
.ar-table { width:100%; border-collapse:collapse; min-width:500px; }
.ar-thead { background:#fafbfc; border-bottom:1px solid #f1f5f9; }
.ar-th { padding:11px 20px; font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.07em; text-align:left; }
.ar-th--center { text-align:center; }
.ar-th--right { text-align:right; }
.ar-row { border-bottom:1px solid #f8fafc; transition:background 0.12s; }
.ar-td-name { padding:13px 20px; display:flex; align-items:center; gap:11px; }
.ar-td { padding:13px 20px; font-size:13px; }
.ar-td--center { text-align:center; }
.ar-td--right { text-align:right; }
.ar-td--date { color:#64748b; }
.ar-avatar { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ar-resp-name { font-size:13px; font-weight:700; color:#0f172a; margin:0; }
.ar-resp-role { font-size:11px; color:#94a3b8; margin:1px 0 0; }
.ar-view-btn { font-size:11px; font-weight:700; color:#3b82f6; background:#eff6ff; border:1px solid #bfdbfe; border-radius:7px; padding:5px 11px; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; transition:background 0.13s; font-family:'DM Sans',system-ui,sans-serif; }
.ar-view-btn:hover { background:#dbeafe; }
.ar-empty-row { text-align:center; padding:44px 20px; }
.ar-clear-link { background:none; border:none; color:#3b82f6; font-size:inherit; font-weight:700; cursor:pointer; text-decoration:underline; padding:0; font-family:'DM Sans',system-ui,sans-serif; }

.ar-sidebar { display:flex; flex-direction:column; gap:13px; }
.ar-side-card { background:#fff; border:1px solid #e8ecf0; border-radius:13px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.ar-side-title { font-size:11px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:0.07em; margin:0; }

.ar-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; }
.ar-modal { background:#fff; border-radius:18px; padding:26px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 70px rgba(0,0,0,0.2); animation:scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1); font-family:'DM Sans',system-ui,sans-serif; }
.ar-modal-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:18px; }
.ar-modal-title { font-size:17px; font-weight:800; color:#0f172a; margin:0; letter-spacing:-0.01em; }
.ar-modal-sub { font-size:12px; color:#94a3b8; margin:3px 0 0; }
.ar-close-btn { width:30px; height:30px; border-radius:8px; background:#f8fafc; border:1px solid #e8ecf0; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; flex-shrink:0; transition:background 0.13s; }
.ar-close-btn:hover { background:#f1f5f9; }
.ar-resp-card { display:flex; gap:13px; align-items:flex-start; background:#f8fafc; border-radius:11px; padding:13px 14px; border:1px solid #e8ecf0; }
.ar-resp-avatar { width:44px; height:44px; border-radius:11px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; font-weight:800; font-size:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ar-answer-box { background:#fafbfc; border:1px solid #e8ecf0; border-radius:9px; padding:11px 13px; }
.ar-dismiss-btn { margin-top:22px; width:100%; padding:12px; background:#0f172a; color:#fff; border:none; border-radius:11px; font-size:13px; font-weight:700; cursor:pointer; letter-spacing:0.02em; text-transform:uppercase; font-family:'DM Sans',system-ui,sans-serif; transition:background 0.15s; }
.ar-dismiss-btn:hover { background:#2563eb; }

@media (max-width:960px) {
  .ar-grid { grid-template-columns:1fr; }
  .ar-sidebar { display:flex; flex-direction:column; gap:13px; width:100%; }
}
@media (max-width:700px) {
  .ar-main { padding:16px 12px 60px; }
  .ar-top-bar { flex-direction:column; align-items:flex-start; gap:10px; }
  .ar-top-right { width:100%; justify-content:space-between; }
  .ar-search-input { width:100%; flex:1; }
  .ar-search-wrap { flex:1; width:100%; }
  .ar-export-btn { flex-shrink:0; }
  .ar-fsp { width:calc(100vw - 32px); max-width:360px; left:0; }
  .ar-form-switcher-title { font-size:15px; max-width:180px; }
}
@media (max-width:600px) {
  .ar-kpi-row { gap:8px; }
  .ar-kpi { flex:1 1 calc(50% - 8px); min-width:0; padding:12px 12px; }
  .ar-kpi-val { font-size:22px; }
  .ar-kpi-label { font-size:9px; }
  .ar-table { min-width:unset; }
  .ar-th, .ar-td { font-size:12px; padding:10px 12px; }
  .ar-td-name { padding:10px 12px; gap:8px; }
  .ar-avatar { width:28px; height:28px; font-size:11px; border-radius:7px; }
  .ar-resp-name { font-size:12px; }
  .ar-resp-role { font-size:10px; }
  .ar-td--date { display:none; }
  .ar-modal { padding:18px 14px; border-radius:14px; }
  .ar-modal-title { font-size:15px; }
}
`;

export default AdminResult;