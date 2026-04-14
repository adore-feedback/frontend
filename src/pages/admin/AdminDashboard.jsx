import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { getFormResults, getForms } from '../../api/feedbackApi';
import { demoForms, getDemoResults } from '../../data/demoFeedback';

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const statusStyles = {
    live: 'bg-tertiary-fixed text-on-tertiary-fixed',
    draft: 'bg-surface-variant text-on-surface-variant',
    closed: 'bg-secondary-container text-on-secondary-container',
    archived: 'bg-surface-container-high text-on-surface-variant',
};

const defaultFormImage = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80';

const getFormId = (form) => form._id || form.id || form.slug;

const getPrimaryAction = (form) => {
    if (form.status === 'draft') {
        return 'Publish Now';
    }

    if (form.responseCount > 0 || form.status === 'closed') {
        return 'View Results';
    }

    return 'Share Form';
};

const getSentiment = (breakdown = [], sentiment) =>
    breakdown.find((item) => item.sentiment === sentiment) || { count: 0, percentage: 0 };

const buildResponseTrend = (responses = []) => {
    const counts = responses.reduce((result, response) => {
        const date = response.submittedAt ? dateFormatter.format(new Date(response.submittedAt)) : 'No date';
        result[date] = (result[date] || 0) + 1;
        return result;
    }, {});

    const rows = Object.entries(counts).slice(0, 7).reverse();
    const max = Math.max(...rows.map(([, count]) => count), 1);

    return rows.map(([date, count]) => ({
        date,
        count,
        height: Math.max((count / max) * 100, 12),
    }));
};

const SentimentPie = ({ positive, neutral, negative }) => {
    const total = positive.count + neutral.count + negative.count || 1;
    const positiveStop = (positive.count / total) * 100;
    const neutralStop = positiveStop + (neutral.count / total) * 100;

    return (
        <div className="flex items-center gap-6">
            <div
                aria-label="Sentiment pie chart"
                className="h-40 w-40 rounded-full"
                role="img"
                style={{
                    background: `conic-gradient(#376c40 0 ${positiveStop}%, #e3e2e3 ${positiveStop}% ${neutralStop}%, #ba1a1a ${neutralStop}% 100%)`,
                }}
            ></div>
            <div className="space-y-3 text-sm text-secondary">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-tertiary-container"></span>
                    Positive: {positive.count}
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-surface-container-highest"></span>
                    Neutral: {neutral.count}
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-error"></span>
                    Negative: {negative.count}
                </div>
            </div>
        </div>
    );
};

const ResponseBars = ({ trend }) => (
    <div className="flex h-44 items-end gap-4">
        {trend.length === 0 && <p className="text-sm text-secondary">Responses will appear here after the form is shared.</p>}
        {trend.map((item) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={item.date}>
                <div className="flex h-32 w-full items-end rounded-md bg-surface-container-high">
                    <div className="w-full rounded-md bg-primary" style={{ height: `${item.height}%` }}></div>
                </div>
                <span className="text-xs font-semibold text-secondary">{item.date}</span>
                <span className="text-xs text-slate-500">{item.count}</span>
            </div>
        ))}
    </div>
);

const AdminDashboard = () => {
    const [forms, setForms] = useState(demoForms);
    const [selectedFormId, setSelectedFormId] = useState(getFormId(demoForms[0]));
    const [selectedResult, setSelectedResult] = useState(getDemoResults(getFormId(demoForms[0])));
    const [isLoading, setIsLoading] = useState(true);
    const [notice, setNotice] = useState('');
    const [copiedFormId, setCopiedFormId] = useState('');

    const copyFormLink = useCallback((form) => {
        const slug = form.slug || getFormId(form);
        const url = `${window.location.origin}/form/${slug}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedFormId(getFormId(form));
            setTimeout(() => setCopiedFormId(''), 2000);
        });
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadForms = async () => {
            try {
                const data = await getForms();
                const apiForms = Array.isArray(data.forms) ? data.forms : [];

                if (!isActive) {
                    return;
                }

                if (apiForms.length > 0) {
                    setForms(apiForms);
                    setSelectedFormId(getFormId(apiForms[0]));
                    setNotice('');
                } else {
                    setForms(demoForms);
                    setSelectedFormId(getFormId(demoForms[0]));
                    setNotice('No forms are saved yet. Showing demo collections until you create the first real form.');
                }
            } catch {
                if (isActive) {
                    setForms(demoForms);
                    setSelectedFormId(getFormId(demoForms[0]));
                    setNotice('Backend is not connected yet. Showing demo collections while the API is offline.');
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadForms();

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!selectedFormId) {
            return;
        }

        let isActive = true;

        const loadSelectedResult = async () => {
            try {
                const data = await getFormResults(selectedFormId);

                if (isActive) {
                    setSelectedResult(data);
                }
            } catch {
                if (isActive) {
                    setSelectedResult(getDemoResults(selectedFormId));
                }
            }
        };

        loadSelectedResult();

        return () => {
            isActive = false;
        };
    }, [selectedFormId]);

    const selectedForm = useMemo(
        () => forms.find((form) => getFormId(form) === selectedFormId) || selectedResult.form || forms[0],
        [forms, selectedFormId, selectedResult.form],
    );

    const analytics = selectedResult.analytics || {};
    const sentimentBreakdown = analytics.sentimentBreakdown || [];
    const positive = getSentiment(sentimentBreakdown, 'positive');
    const neutral = getSentiment(sentimentBreakdown, 'neutral');
    const negative = getSentiment(sentimentBreakdown, 'negative');
    const totalResponses = analytics.totalResponses ?? selectedForm?.responseCount ?? 0;
    const recentResponses = analytics.recentResponses || [];
    const trend = buildResponseTrend(recentResponses);

    return (
        <>
            <main className="flex-1 flex flex-col min-w-0 bg-surface">
                <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,80,102,0.06)]">
                    <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto w-full">
                        <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-4 py-2 w-96 group focus-within:ring-2 ring-primary/20 transition-all">
                            <span className="material-symbols-outlined text-slate-400 mr-2" data-icon="search">search</span>
                            <input id="dashboard-search-input" className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-slate-400 outline-none" placeholder="Search forms or results..." type="text" />
                        </div>
                        <div className="flex items-center gap-4 ml-auto">
                            <button id="notifications-button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-200">
                                <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
                            </button>
                            <button id="help-button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-200">
                                <span className="material-symbols-outlined" data-icon="help_outline">help_outline</span>
                            </button>
                            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-primary/10">
                                <img alt="Staff user profile" className="h-full w-full object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" />
                            </div>
                        </div>
                    </div>
                </header>

                <section className="px-8 py-12 lg:px-12 max-w-7xl mx-auto w-full">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div className="max-w-2xl">
                            <span className="text-[0.6875rem] font-bold text-primary uppercase font-label">Form Collections</span>
                            <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-primary mt-2">Feedback Form Dashboard</h2>
                            <p className="mt-4 text-secondary text-lg font-body leading-relaxed">
                                Select one unique form to view its responses, sentiment, graph, and newest feedback providers.
                            </p>
                            {notice && (
                                <p className="mt-4 text-sm font-medium text-secondary bg-surface-container-low inline-flex px-4 py-2 rounded-lg">
                                    {notice}
                                </p>
                            )}
                            <p className="mt-3 text-sm text-slate-500">{isLoading ? 'Syncing form collections...' : 'Showing one selected form at a time.'}</p>
                        </div>
                        <Link id="create-new-form-btn" className="flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-md font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10" to="/admin/forms/new">
                            <span className="material-symbols-outlined" data-icon="add">add</span>
                            Create New Form
                        </Link>
                    </div>

                    <div className="mb-10 flex flex-wrap gap-3">
                        {forms.map((form) => (
                            <button
                                className={`rounded-md px-4 py-3 text-sm font-semibold transition-colors ${getFormId(form) === selectedFormId ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-primary hover:bg-surface-container-high'}`}
                                key={getFormId(form)}
                                type="button"
                                onClick={() => setSelectedFormId(getFormId(form))}
                            >
                                {form.title}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                        <div className="p-7 bg-surface-container-low rounded-xl flex flex-col justify-between h-40">
                            <span className="text-xs font-bold text-secondary uppercase">Responses For This Form</span>
                            <span className="text-5xl font-headline font-bold text-primary">{numberFormatter.format(totalResponses)}</span>
                        </div>
                        <div className="p-7 bg-secondary-container rounded-xl flex flex-col justify-between h-40">
                            <span className="text-xs font-bold text-on-secondary-fixed uppercase">New People</span>
                            <span className="text-5xl font-headline font-bold text-on-secondary-fixed">{numberFormatter.format(recentResponses.length)}</span>
                        </div>
                        <div className="p-7 bg-tertiary-fixed rounded-xl flex flex-col justify-between h-40">
                            <span className="text-xs font-bold text-on-tertiary-fixed uppercase">Positive</span>
                            <span className="text-5xl font-headline font-bold text-on-tertiary-fixed">{numberFormatter.format(positive.count)}</span>
                        </div>
                        <div className="p-7 bg-error-container rounded-xl flex flex-col justify-between h-40">
                            <span className="text-xs font-bold text-on-error-container uppercase">Negative</span>
                            <span className="text-5xl font-headline font-bold text-on-error-container">{numberFormatter.format(negative.count)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <section className="bg-surface-container-lowest p-8 rounded-xl">
                            <div className="mb-6">
                                <span className="text-xs font-bold text-secondary uppercase">{selectedForm?.formTypeLabel || selectedForm?.formType}</span>
                                <h3 className="font-headline text-2xl font-bold text-primary mt-2">{selectedForm?.title}</h3>
                                <p className="text-secondary mt-2">{selectedForm?.description}</p>
                            </div>
                            <SentimentPie positive={positive} neutral={neutral} negative={negative} />
                        </section>

                        <section className="bg-surface-container-lowest p-8 rounded-xl">
                            <div className="mb-6">
                                <h3 className="font-headline text-2xl font-bold text-primary">Response Graph</h3>
                                <p className="text-secondary mt-2">Responses grouped by submission date for the selected form.</p>
                            </div>
                            <ResponseBars trend={trend} />
                        </section>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8">
                        <section className="space-y-8">
                            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
                                <h3 className="text-xl font-headline font-bold text-primary">Collections Of Forms</h3>
                                <span className="text-sm text-secondary">{forms.length} forms</span>
                            </div>

                            {forms.map((form) => {
                                const formId = getFormId(form);
                                const primaryAction = getPrimaryAction(form);

                                return (
                                    <article key={formId} className={`group bg-surface-container-lowest p-8 rounded-2xl flex flex-col lg:flex-row gap-8 items-start lg:items-center hover:bg-surface transition-colors duration-500 relative ${formId === selectedFormId ? 'ring-2 ring-primary/20' : ''}`}>
                                        <div className="w-full lg:w-1/4 aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-highest">
                                            <img alt={form.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={form.imageUrl || defaultFormImage} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                                <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${statusStyles[form.status] || statusStyles.archived}`}>
                                                    {form.statusLabel || form.status}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium font-label uppercase">{form.formTypeLabel || form.formType}</span>
                                                <span className="text-xs text-slate-500 font-medium font-label uppercase">{form.visibility}</span>
                                            </div>
                                            <h4 className="text-2xl font-headline font-bold text-primary mb-3">{form.title}</h4>
                                            <p className="text-secondary leading-relaxed max-w-xl font-body">{form.description}</p>
                                            <div className="flex flex-wrap items-center gap-8 mt-8 text-sm text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm" data-icon="description">description</span>
                                                    <span>{form.questionCount || 0} Questions</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm" data-icon="group">group</span>
                                                    <span>{numberFormatter.format(form.responseCount || 0)} Responses</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full lg:w-auto flex flex-col gap-3">
                                            <button className="w-full lg:w-48 bg-surface-container-high text-primary py-3 rounded-md text-sm font-semibold hover:bg-surface-variant transition-all active:scale-[0.98]" type="button" onClick={() => setSelectedFormId(formId)}>
                                                Select Form
                                            </button>
                                            {primaryAction === 'View Results' ? (
                                                <Link className="w-full lg:w-48 bg-primary text-white py-3 rounded-md text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] text-center" to={`/admin/result/${formId}`}>
                                                    {primaryAction}
                                                </Link>
                                            ) : (
                                                <Link className="w-full lg:w-48 bg-primary text-white py-3 rounded-md text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] text-center" to={`/form/${form.slug || formId}`} target="_blank">
                                                    Open Form
                                                </Link>
                                            )}
                                            <button
                                                className="w-full lg:w-48 flex items-center justify-center gap-2 border border-outline-variant/30 text-secondary py-3 rounded-md text-sm font-semibold hover:bg-surface-container-high transition-all active:scale-[0.98]"
                                                type="button"
                                                onClick={() => copyFormLink(form)}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">{copiedFormId === formId ? 'check' : 'content_copy'}</span>
                                                {copiedFormId === formId ? 'Link Copied!' : 'Copy Link'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>

                        <section className="bg-surface-container-lowest p-8 rounded-xl h-fit">
                            <h3 className="text-xl font-headline font-bold text-primary mb-6">New Feedback Providers</h3>
                            <div className="space-y-4">
                                {recentResponses.length === 0 && <p className="text-sm text-secondary">No responses for this form yet.</p>}
                                {recentResponses.slice(0, 6).map((response) => (
                                    <div className="flex items-center justify-between gap-4 border-b border-outline-variant/15 pb-4" key={response.id || response._id}>
                                        <div>
                                            <p className="font-semibold text-primary">{response.respondentName}</p>
                                            <p className="text-xs text-secondary">{response.respondentRole || response.respondentEmail || 'Feedback submitted'}</p>
                                        </div>
                                        <span className="text-xs font-bold uppercase text-secondary">{response.sentimentLabel || response.sentiment}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </section>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-slate-200/10 flex justify-around py-3 px-6 z-[60] shadow-[0_-10px_30px_rgba(0,80,102,0.1)]">
                <Link className="flex flex-col items-center gap-1 text-primary" to="/admin">
                    <span className="material-symbols-outlined text-[20px]" data-icon="dashboard" style={{ fontVariationSettings: 'FILL 1' }}>dashboard</span>
                    <span className="text-[10px] font-bold">Dashboard</span>
                </Link>
                <Link className="flex flex-col items-center gap-1 text-slate-400" to="/admin/forms/new">
                    <span className="material-symbols-outlined text-[20px]" data-icon="add_circle">add_circle</span>
                    <span className="text-[10px] font-medium">Create</span>
                </Link>
                <Link className="flex flex-col items-center gap-1 text-slate-400" to="/admin/result">
                    <span className="material-symbols-outlined text-[20px]" data-icon="analytics">analytics</span>
                    <span className="text-[10px] font-medium">Results</span>
                </Link>
            </nav>
        </>
    );
};

export default AdminDashboard;
