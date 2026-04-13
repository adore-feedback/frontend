import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getFormResults, getForms } from '../../api/feedbackApi';
import { getDemoResults } from '../../data/demoFeedback';

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const sentimentStyles = {
    positive: {
        bar: 'bg-tertiary-container',
        badge: 'bg-secondary-container text-on-secondary-fixed-variant',
    },
    neutral: {
        bar: 'bg-surface-container-high',
        badge: 'bg-surface-container-highest text-slate-700',
    },
    negative: {
        bar: 'bg-error',
        badge: 'bg-error-container text-on-error-container',
    },
};

const formatDate = (date) => {
    if (!date) {
        return 'Not submitted';
    }

    return dateFormatter.format(new Date(date));
};

const getInitials = (name = 'Anonymous') =>
    name
        .split(' ')
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

const AdminResult = () => {
    const { formId } = useParams();
    const [result, setResult] = useState(getDemoResults(formId));
    const [isLoading, setIsLoading] = useState(true);
    const [notice, setNotice] = useState('');
    const [filters, setFilters] = useState({ search: '', sentiment: '' });
    const [appliedFilters, setAppliedFilters] = useState({ search: '', sentiment: '' });

    useEffect(() => {
        let isActive = true;

        const loadResults = async () => {
            try {
                let selectedFormId = formId;

                if (!selectedFormId) {
                    const formsData = await getForms();
                    const firstForm = Array.isArray(formsData.forms) ? formsData.forms[0] : null;
                    selectedFormId = firstForm?._id || firstForm?.id || firstForm?.slug;
                }

                if (!selectedFormId) {
                    if (isActive) {
                        setResult(getDemoResults());
                        setNotice('No forms are saved yet. Showing demo analytics until your first responses arrive.');
                    }
                    return;
                }

                const data = await getFormResults(selectedFormId, appliedFilters);

                if (isActive) {
                    setResult(data);
                    setNotice('');
                }
            } catch {
                if (isActive) {
                    setResult(getDemoResults(formId));
                    setNotice('Backend is not connected yet. Showing demo analytics while the API is offline.');
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        loadResults();

        return () => {
            isActive = false;
        };
    }, [formId, appliedFilters]);

    const { form, analytics } = result;
    const averageRating = Number.isFinite(Number(analytics.averageRating)) ? Number(analytics.averageRating) : 0;
    const totalResponses = analytics.totalResponses || form.responseCount || 0;
    const completionRate = Number.isFinite(Number(analytics.completionRate)) ? Number(analytics.completionRate) : 0;

    const sentimentRows = useMemo(() => {
        const rows = Array.isArray(analytics.sentimentBreakdown) ? analytics.sentimentBreakdown : [];
        return rows.filter((item) => item.percentage > 0 || item.count > 0).slice(0, 4);
    }, [analytics.sentimentBreakdown]);

    const recentResponses = Array.isArray(analytics.recentResponses) ? analytics.recentResponses : [];

    return (
        <div className='flex-1 flex flex-col min-w-0'>
            <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,80,102,0.06)] flex justify-between items-center px-8 py-4">
                <div className="flex items-center space-x-8">
                    <Link className="text-sm font-semibold text-primary hover:text-primary-container" to="/admin">
                        Back to dashboard
                    </Link>
                    <div className="relative hidden lg:block">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <span className="material-symbols-outlined text-sm" data-icon="search">search</span>
                        </span>
                        <input className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary/20" placeholder="Search archives..." type="text" />
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-full active:scale-95 duration-200">
                        <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
                    </button>
                    <button className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-full active:scale-95 duration-200">
                        <span className="material-symbols-outlined" data-icon="help_outline">help_outline</span>
                    </button>
                    <div className="h-8 w-8 rounded-full overflow-hidden ml-2 border border-slate-200">
                        <img alt="Staff user profile" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" />
                    </div>
                </div>
            </header>

            <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">

                <div className="mb-12">
                    <span className="text-[0.6875rem] font-bold text-primary uppercase font-label">Feedback Analysis</span>
                    <h2 className="text-4xl font-extrabold text-primary font-headline mt-2">{form.title}</h2>
                    <p className="text-secondary mt-4 max-w-2xl text-lg leading-relaxed font-body">{form.description}</p>
                    {notice && (
                        <p className="mt-4 text-sm font-medium text-secondary bg-surface-container-low inline-flex px-4 py-2 rounded-lg">
                            {notice}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">

                    <div className="md:col-span-1 bg-surface-container-lowest p-10 rounded-xl shadow-[0_20px_40px_rgba(0,80,102,0.06)] relative overflow-hidden group">
                        <div className="relative z-10">
                            <span className="text-xs font-bold text-slate-400 uppercase font-label mb-4 block">Average Rating</span>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-6xl font-bold text-primary font-headline">{averageRating.toFixed(1)}</span>
                                <span className="text-xl text-slate-400 font-medium">/ 5.0</span>
                            </div>
                            <div className="mt-6 flex space-x-1">
                                {[0, 1, 2, 3, 4].map((star) => (
                                    <span key={star} className="material-symbols-outlined text-primary" data-icon="star" style={{ fontVariationSettings: star < Math.round(averageRating) ? 'FILL 1' : 'FILL 0' }}>star</span>
                                ))}
                            </div>
                        </div>
                        <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <span className="material-symbols-outlined text-[12rem]" data-icon="star">star</span>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-10 rounded-xl text-on-primary shadow-[0_20px_40px_rgba(0,80,102,0.1)] flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-on-primary/60 uppercase font-label mb-4 block">Total Responses</span>
                                <span className="text-6xl font-bold font-headline">{numberFormatter.format(totalResponses)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-on-primary/60 uppercase font-label mb-4 block">Completion Rate</span>
                                <span className="text-2xl font-bold font-headline">{completionRate}%</span>
                            </div>
                        </div>
                        <div className="mt-8">
                            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-tertiary-fixed-dim" style={{ width: `${completionRate}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-3 text-sm text-on-primary/70">
                                <span>Engagement Target: {numberFormatter.format(analytics.targetResponses || totalResponses || 0)}</span>
                                <span>{isLoading ? 'Syncing...' : 'Ready for review'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                    <div>
                        <h3 className="text-xl font-bold text-primary font-headline mb-6">Respondent Sentiment</h3>
                        <div className="space-y-6">
                            {sentimentRows.map((sentiment) => (
                                <div className="space-y-2" key={sentiment.sentiment}>
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-slate-700">{sentiment.label}</span>
                                        <span className="text-primary">{sentiment.percentage}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                                        <div className={`h-full ${sentimentStyles[sentiment.sentiment]?.bar || 'bg-primary'}`} style={{ width: `${sentiment.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-slate-500 uppercase font-label mb-6">Response Filters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                            <input className="bg-surface text-sm border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20" placeholder="Name, email, phone, or company" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
                            <select className="bg-surface text-sm border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20" value={filters.sentiment} onChange={(event) => setFilters((current) => ({ ...current, sentiment: event.target.value }))}>
                                <option value="">All sentiment</option>
                                <option value="positive">Positive</option>
                                <option value="neutral">Neutral</option>
                                <option value="negative">Negative</option>
                            </select>
                            <button className="bg-primary text-on-primary px-5 py-3 rounded-md text-sm font-semibold" type="button" onClick={() => setAppliedFilters(filters)}>
                                Apply
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,80,102,0.04)]">
                    <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center bg-surface-container-low/50">
                        <h3 className="text-lg font-bold text-primary font-headline mb-4 md:mb-0">Individual Responses</h3>
                        <span className="text-xs text-slate-500">View-only results</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low/30">
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase font-label">Respondent</th>
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase font-label">Date Submitted</th>
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase font-label">Rating</th>
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase font-label">Primary Sentiment</th>
                                    <th className="px-8 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentResponses.map((response) => (
                                    <tr className="hover:bg-slate-50/50 transition-colors" key={response._id || response.id}>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 rounded-lg bg-primary-fixed-dim flex items-center justify-center text-primary font-bold text-xs">{getInitials(response.respondentName)}</div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{response.respondentName}</div>
                                                    <div className="text-xs text-slate-500">{response.respondentRole || 'Respondent'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-slate-600">{formatDate(response.submittedAt)}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-1 text-primary">
                                                <span className="font-bold text-sm">{response.rating ? Number(response.rating).toFixed(1) : 'N/A'}</span>
                                                <span className="material-symbols-outlined text-[16px]" data-icon="star" style={{ fontVariationSettings: 'FILL 1' }}>star</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`${sentimentStyles[response.sentiment]?.badge || sentimentStyles.neutral.badge} px-3 py-1 rounded-full text-[10px] font-bold uppercase`}>
                                                {response.sentimentLabel || response.sentiment || 'Neutral'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="text-primary hover:text-primary-container transition-colors">
                                                <span className="material-symbols-outlined" data-icon="visibility">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 bg-surface-container-low/30 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Showing {recentResponses.length} of {numberFormatter.format(totalResponses)} entries</span>
                        <div className="flex space-x-2">
                            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50" disabled>
                                <span className="material-symbols-outlined text-sm" data-icon="chevron_left">chevron_left</span>
                            </button>
                            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                                <span className="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-auto px-12 py-12 flex items-center justify-between opacity-40">
                <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent"></div>
                <span className="px-6 text-[0.6875rem] font-bold text-slate-400 uppercase font-label"></span>
                <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent"></div>
            </footer>
        </div>
    );
};

export default AdminResult;
