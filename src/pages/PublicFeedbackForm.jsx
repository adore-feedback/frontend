import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicForm, submitPublicFormResponse } from '../api/feedbackApi';

/* ── Helpers ── */
const getSentiment = (rating) => {
  const v = Number(rating);
  if (v >= 4) return 'positive';
  if (v <= 2) return 'negative';
  return 'neutral';
};

const isValidIndianMobile = (phone) => {
  if (!phone) return true; // Allow empty if not required (handled by 'required' attribute)
  return /^[789]\d{9}$/.test(phone);
};

const StarRating = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const current = hovered || Number(value) || 0;

  return (
    <div className="flex items-center gap-2 mt-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(String(star))}
        >
          <span
            className="material-symbols-outlined text-4xl transition-colors"
            style={{
              fontVariationSettings: star <= current ? "'FILL' 1" : "'FILL' 0",
              color: star <= current ? 'var(--color-primary)' : 'var(--color-outline)',
            }}
          >
            star
          </span>
        </button>
      ))}
      {value && (
        <span className="ml-2 text-sm font-semibold text-secondary">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][Number(value)]}
        </span>
      )}
    </div>
  );
};

/* ── Access Gate (restricted form) ── */
const AccessGate = ({ message, onAccess }) => {
  const [fields, setFields] = useState({ email: '', phone: '', uniqueId: '' });

  const [error, setError] = useState('');

  const handleAccess = () => {
    setError('');
    if (fields.phone && !isValidIndianMobile(fields.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 7, 8, or 9.');
      return;
    }
    onAccess(fields);
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-10 shadow-xl shadow-primary/5 border border-outline-variant/20 animate-fade-in">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-fixed-dim mb-6 mx-auto">
          <span className="material-symbols-outlined text-primary text-3xl">lock</span>
        </div>
        <h1 className="font-headline text-2xl font-bold text-primary text-center mb-2">
          Restricted Access
        </h1>
        <p className="text-secondary text-sm text-center leading-relaxed mb-8">
          {message || 'This form is restricted. Enter your credentials to access it.'}
        </p>
        <div className="space-y-4">
          <input
            className="w-full rounded-xl bg-surface-container-low border border-outline-variant/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
            placeholder="Email address"
            type="email"
            value={fields.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
          <div className="space-y-1">
            <input
              className={`w-full rounded-xl bg-surface-container-low border px-4 py-3 text-sm outline-none transition-all placeholder:text-secondary/60 ${
                fields.phone && !isValidIndianMobile(fields.phone)
                  ? 'border-error focus:ring-error/25 focus:border-error/40'
                  : 'border-outline-variant/30 focus:ring-primary/25 focus:border-primary/40'
              }`}
              placeholder="Phone number"
              value={fields.phone}
              onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            {fields.phone && !isValidIndianMobile(fields.phone) && (
              <p className="text-[10px] text-error px-1 font-medium">Starts with 7, 8, or 9 (10 digits)</p>
            )}
          </div>
          <input
            className="w-full rounded-xl bg-surface-container-low border border-outline-variant/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
            placeholder="Unique ID"
            value={fields.uniqueId}
            onChange={(e) => handleChange('uniqueId', e.target.value)}
          />

          {error && (
            <div className="bg-error-container/40 text-on-error-container text-xs p-3 rounded-lg border border-error/10 flex items-start gap-2">
              <span className="material-symbols-outlined text-xs mt-0.5">error</span>
              {error}
            </div>
          )}

          <button
            className="w-full bg-primary text-on-primary font-semibold py-3 rounded-xl text-sm hover:opacity-90 active:scale-[0.98] transition-all mt-2"
            type="button"
            onClick={handleAccess}
          >
            Access Form
          </button>
        </div>
      </div>
    </main>
  );
};

/* ── Success Screen ── */
const SuccessScreen = ({ formTitle }) => (
  <main className="min-h-screen bg-background flex items-center justify-center p-6">
    <div className="w-full max-w-md text-center animate-fade-in">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-tertiary-fixed mx-auto mb-6">
        <span className="material-symbols-outlined text-on-tertiary-fixed text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
      </div>
      <h1 className="font-headline text-3xl font-bold text-primary mb-3">
        Thank you!
      </h1>
      <p className="text-secondary leading-relaxed mb-2">
        Your feedback for <span className="font-semibold text-primary">{formTitle}</span> has been received.
      </p>
      <p className="text-secondary text-sm">
        We appreciate you taking the time to share your thoughts.
      </p>
    </div>
  </main>
);

/* ── Main Component ── */
const PublicFeedbackForm = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [access, setAccess] = useState({ email: '', phone: '', uniqueId: '' });
  const [respondent, setRespondent] = useState({
    name: '', email: '', phone: '', uniqueId: '', companyName: '', companyDetails: '',
  });
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  const loadForm = useCallback(async (accessValues = {}) => {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const data = await getPublicForm(formId, accessValues);
      setForm(data.form);
      setIsRestricted(false);
    } catch (error) {
      setForm(null);
      setStatus({ type: 'error', message: error.message });
      setIsRestricted(true);
    } finally {
      setIsLoading(false);
    }
  }, [formId]);

  useEffect(() => { loadForm(); }, [loadForm]);

  // Pre-fill from answer templates
  useEffect(() => {
    if (!form?.questions) return;
    const templateAnswers = form.questions.reduce((res, q) => {
      if (q.type === 'text' && q.answerTemplates?.[0]) res[q.id] = q.answerTemplates[0];
      return res;
    }, {});
    setAnswers(templateAnswers);
  }, [form]);

  const ratingAnswer = useMemo(() => {
    const ratingQ = form?.questions?.find((q) => q.type === 'rating');
    return ratingQ ? answers[ratingQ.id] : null;
  }, [answers, form]);

  const updateAnswer = (q, val) =>
    setAnswers((c) => ({ ...c, [q.id]: val }));

  const toggleOption = (q, option) =>
    setAnswers((c) => {
      const cur = Array.isArray(c[q.id]) ? c[q.id] : [];
      return { ...c, [q.id]: cur.includes(option) ? cur.filter((i) => i !== option) : [...cur, option] };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    // Validate phone for Indian format
    if (respondent.phone && !isValidIndianMobile(respondent.phone)) {
      setStatus({ type: 'error', message: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    const payload = {
      respondent,
      rating: ratingAnswer || undefined,
      sentiment: getSentiment(ratingAnswer),
      answers: form.questions.map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        value: answers[q.id] ?? '',
      })),
    };

    try {
      await submitPublicFormResponse(form.id || form.slug, payload);
      setSubmitted(true);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-secondary">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading form...</p>
        </div>
      </main>
    );
  }

  /* ── Access Gate ── */
  if (!form && isRestricted) {
    return <AccessGate message={status.message} onAccess={loadForm} />;
  }

  /* ── Success ── */
  if (submitted) {
    return <SuccessScreen formTitle={form?.title} />;
  }

  if (!form) return null;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Header band ── */}
      <div className="bg-gradient-to-r from-primary to-primary-container px-6 py-10 md:py-16">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-on-primary/70 bg-white/10 px-3 py-1 rounded-full mb-4">
            {form.formTypeLabel || form.formType}
          </span>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-primary leading-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="mt-3 text-on-primary/80 leading-relaxed text-sm md:text-base">
              {form.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Form body ── */}
      <div className="max-w-2xl mx-auto px-4 py-10 pb-20">
        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* ── Respondent Info ── */}
          <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/15 space-y-4">
            <h2 className="font-headline text-base font-bold text-primary">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="rounded-xl bg-surface-container-low border border-outline-variant/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
                placeholder="Full name *"
                required
                value={respondent.name}
                onChange={(e) => setRespondent((c) => ({ ...c, name: e.target.value }))}
              />
              <input
                className="rounded-xl bg-surface-container-low border border-outline-variant/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
                placeholder="Email address"
                type="email"
                value={respondent.email}
                onChange={(e) => setRespondent((c) => ({ ...c, email: e.target.value }))}
              />
              {form.collectsPhone && (
                <div className="space-y-1">
                  <input
                    className={`w-full rounded-xl bg-surface-container-low border px-4 py-3 text-sm outline-none transition-all placeholder:text-secondary/60 ${
                      respondent.phone && !isValidIndianMobile(respondent.phone)
                        ? 'border-error focus:ring-error/25 focus:border-error/40'
                        : 'border-outline-variant/20 focus:ring-primary/25 focus:border-primary/40'
                    }`}
                    placeholder={form.phoneRequired ? 'Phone number *' : 'Phone number (optional)'}
                    required={form.phoneRequired}
                    value={respondent.phone}
                    onChange={(e) => setRespondent((c) => ({ ...c, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  />
                  {respondent.phone && !isValidIndianMobile(respondent.phone) && (
                    <p className="text-[10px] text-error px-1 font-medium italic">Enter 10-digit mobile number starting with 7, 8, or 9</p>
                  )}
                </div>
              )}
              <input
                className="rounded-xl bg-surface-container-low border border-outline-variant/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
                placeholder="Unique ID (optional)"
                value={respondent.uniqueId}
                onChange={(e) => setRespondent((c) => ({ ...c, uniqueId: e.target.value }))}
              />
              {form.collectsCompanyDetails && (
                <>
                  <input
                    className="rounded-xl bg-surface-container-low border border-outline-variant/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
                    placeholder={form.companyDetailsRequired ? 'Company name *' : 'Company name (optional)'}
                    required={form.companyDetailsRequired}
                    value={respondent.companyName}
                    onChange={(e) => setRespondent((c) => ({ ...c, companyName: e.target.value }))}
                  />
                  <input
                    className="rounded-xl bg-surface-container-low border border-outline-variant/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all placeholder:text-secondary/60"
                    placeholder={form.companyDetailsRequired ? 'Company details *' : 'Company details (optional)'}
                    required={form.companyDetailsRequired}
                    value={respondent.companyDetails}
                    onChange={(e) => setRespondent((c) => ({ ...c, companyDetails: e.target.value }))}
                  />
                </>
              )}
            </div>
          </section>

          {/* ── Questions ── */}
          <section className="space-y-4">
            {form.questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/15 space-y-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary text-xs font-bold">
                    {idx + 1}
                  </span>
                  <label className="font-semibold text-on-surface text-sm leading-relaxed">
                    {q.prompt}
                    {q.required && <span className="text-error ml-1">*</span>}
                  </label>
                </div>

                {/* Rating */}
                {q.type === 'rating' && (
                  <StarRating
                    value={answers[q.id] || ''}
                    onChange={(val) => updateAnswer(q, val)}
                  />
                )}

                {/* Text */}
                {q.type === 'text' && (
                  <div className="space-y-2">
                    {q.answerTemplates?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {q.answerTemplates.map((tmpl) => (
                          <button
                            key={tmpl}
                            type="button"
                            className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 active:scale-95 transition-all"
                            onClick={() => updateAnswer(q, tmpl)}
                          >
                            {tmpl}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      className="w-full min-h-24 rounded-xl bg-surface-container-low border border-outline-variant/20 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all resize-none"
                      required={q.required}
                      value={answers[q.id] || ''}
                      onChange={(e) => updateAnswer(q, e.target.value)}
                    />
                  </div>
                )}

                {/* Single choice */}
                {q.type === 'single-choice' && (
                  <div className="flex flex-col gap-2 mt-1">
                    {(q.options || []).map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
                          answers[q.id] === option
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-outline-variant/25 bg-surface-container-low text-secondary hover:border-primary/30 hover:bg-primary/3'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={option}
                          checked={answers[q.id] === option}
                          onChange={() => updateAnswer(q, option)}
                          className="accent-primary"
                          required={q.required}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}

                {/* Multiple choice */}
                {q.type === 'multiple-choice' && (
                  <div className="flex flex-col gap-2 mt-1">
                    {(q.options || []).map((option) => {
                      const checked = Array.isArray(answers[q.id]) && answers[q.id].includes(option);
                      return (
                        <label
                          key={option}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
                            checked
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-outline-variant/25 bg-surface-container-low text-secondary hover:border-primary/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(q, option)}
                            className="accent-primary"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* ── Status message ── */}
          {status.message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                status.type === 'error'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-tertiary-fixed text-on-tertiary-fixed'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {status.type === 'error' ? 'error' : 'check_circle'}
              </span>
              {status.message}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            className="w-full bg-primary text-on-primary py-4 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            type="submit"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            Submit Feedback
          </button>

          <p className="text-center text-xs text-secondary/50">
            Your response is confidential and will only be used to improve our services.
          </p>
        </form>
      </div>
    </main>
  );
};

export default PublicFeedbackForm;
