import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getPublicForm, submitPublicFormResponse } from '../api/feedbackApi';

const getSentimentFromRating = (rating) => {
    const value = Number(rating);

    if (value >= 4) {
        return 'positive';
    }

    if (value <= 2) {
        return 'negative';
    }

    return 'neutral';
};

const PublicFeedbackForm = () => {
    const { formId } = useParams();
    const [form, setForm] = useState(null);
    const [access, setAccess] = useState({ email: '', phone: '', uniqueId: '' });
    const [respondent, setRespondent] = useState({ name: '', email: '', phone: '', uniqueId: '', companyName: '', companyDetails: '' });
    const [answers, setAnswers] = useState({});
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(true);

    const loadForm = useCallback(async (accessValues = {}) => {
        setIsLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const data = await getPublicForm(formId, accessValues);
            setForm(data.form);
        } catch (error) {
            setForm(null);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [formId]);

    useEffect(() => {
        loadForm();
    }, [loadForm]);

    useEffect(() => {
        if (!form?.questions) {
            return;
        }

        const templateAnswers = form.questions.reduce((result, question) => {
            if (question.type === 'text' && question.answerTemplates?.[0]) {
                result[question.id] = question.answerTemplates[0];
            }

            return result;
        }, {});

        setAnswers(templateAnswers);
    }, [form]);

    const ratingAnswer = useMemo(() => {
        const ratingQuestion = form?.questions?.find((question) => question.type === 'rating');
        return ratingQuestion ? answers[ratingQuestion.id] : null;
    }, [answers, form]);

    const updateAnswer = (question, value) => {
        setAnswers((current) => ({
            ...current,
            [question.id]: value,
        }));
    };

    const toggleOption = (question, option) => {
        setAnswers((current) => {
            const currentValues = Array.isArray(current[question.id]) ? current[question.id] : [];
            const nextValues = currentValues.includes(option)
                ? currentValues.filter((item) => item !== option)
                : [...currentValues, option];

            return {
                ...current,
                [question.id]: nextValues,
            };
        });
    };

    const submitResponse = async (event) => {
        event.preventDefault();
        setStatus({ type: '', message: '' });

        const payload = {
            respondent,
            rating: ratingAnswer || undefined,
            sentiment: getSentimentFromRating(ratingAnswer),
            answers: form.questions.map((question) => ({
                questionId: question.id,
                prompt: question.prompt,
                type: question.type,
                value: answers[question.id] ?? '',
            })),
        };

        try {
            await submitPublicFormResponse(form.id || form.slug, payload);
            setStatus({ type: 'success', message: 'Your feedback has been submitted.' });
            setAnswers({});
            setRespondent({ name: '', email: '', phone: '', uniqueId: '', companyName: '', companyDetails: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        }
    };

    if (isLoading) {
        return <main className="min-h-screen bg-background p-8 text-primary">Loading form...</main>;
    }

    if (!form) {
        return (
            <main className="min-h-screen bg-background p-8">
                <div className="max-w-xl mx-auto bg-surface-container-lowest p-8 rounded-xl">
                    <h1 className="font-headline text-3xl font-bold text-primary mb-3">Restricted Form</h1>
                    <p className="text-secondary mb-6">{status.message}</p>
                    <div className="space-y-4">
                        <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Email" value={access.email} onChange={(event) => setAccess((current) => ({ ...current, email: event.target.value }))} />
                        <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Phone" value={access.phone} onChange={(event) => setAccess((current) => ({ ...current, phone: event.target.value }))} />
                        <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Unique ID" value={access.uniqueId} onChange={(event) => setAccess((current) => ({ ...current, uniqueId: event.target.value }))} />
                        <button className="bg-primary text-on-primary px-6 py-3 rounded-md font-semibold" type="button" onClick={() => loadForm(access)}>
                            Open Form
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background p-8">
            <form className="max-w-3xl mx-auto space-y-8" onSubmit={submitResponse}>
                <div>
                    <span className="text-sm font-semibold text-secondary uppercase">{form.formTypeLabel}</span>
                    <h1 className="font-headline text-4xl font-extrabold text-primary mt-2">{form.title}</h1>
                    <p className="text-secondary mt-3">{form.description}</p>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Name" required value={respondent.name} onChange={(event) => setRespondent((current) => ({ ...current, name: event.target.value }))} />
                    <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Email" type="email" value={respondent.email} onChange={(event) => setRespondent((current) => ({ ...current, email: event.target.value }))} />
                    {form.collectsPhone && (
                        <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder={form.phoneRequired ? 'Phone number required' : 'Phone number'} required={form.phoneRequired} value={respondent.phone} onChange={(event) => setRespondent((current) => ({ ...current, phone: event.target.value }))} />
                    )}
                    <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Unique ID" value={respondent.uniqueId} onChange={(event) => setRespondent((current) => ({ ...current, uniqueId: event.target.value }))} />
                    {form.collectsCompanyDetails && (
                        <>
                            <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Company name" required={form.companyDetailsRequired} value={respondent.companyName} onChange={(event) => setRespondent((current) => ({ ...current, companyName: event.target.value }))} />
                            <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Company details" required={form.companyDetailsRequired} value={respondent.companyDetails} onChange={(event) => setRespondent((current) => ({ ...current, companyDetails: event.target.value }))} />
                        </>
                    )}
                </section>

                <section className="space-y-5">
                    {form.questions.map((question) => (
                        <div className="bg-surface-container-lowest p-6 rounded-xl space-y-3" key={question.id}>
                            <label className="font-semibold text-primary block">{question.prompt}</label>
                            {question.type === 'text' && (
                                <>
                                    {question.answerTemplates?.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {question.answerTemplates.map((template) => (
                                                <button className="bg-secondary-container text-on-secondary-fixed px-3 py-2 rounded-md text-xs font-semibold" key={template} type="button" onClick={() => updateAnswer(question, template)}>
                                                    {template}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <textarea className="w-full min-h-24 rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" required={question.required} value={answers[question.id] || ''} onChange={(event) => updateAnswer(question, event.target.value)} />
                                </>
                            )}
                            {question.type === 'rating' && (
                                <select className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" required={question.required} value={answers[question.id] || ''} onChange={(event) => updateAnswer(question, event.target.value)}>
                                    <option value="">Choose rating</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                            )}
                            {question.type === 'single-choice' && (
                                <select className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" required={question.required} value={answers[question.id] || ''} onChange={(event) => updateAnswer(question, event.target.value)}>
                                    <option value="">Choose an option</option>
                                    {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            )}
                            {question.type === 'multiple-choice' && (
                                <div className="flex flex-wrap gap-3">
                                    {question.options.map((option) => (
                                        <label className="flex items-center gap-2 text-sm text-secondary" key={option}>
                                            <input checked={Array.isArray(answers[question.id]) && answers[question.id].includes(option)} type="checkbox" onChange={() => toggleOption(question, option)} />
                                            {option}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </section>

                {status.message && (
                    <div className={`rounded-lg px-4 py-3 text-sm font-medium ${status.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>
                        {status.message}
                    </div>
                )}

                <button className="bg-primary text-on-primary px-8 py-4 rounded-md font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all" type="submit">
                    Submit Feedback
                </button>
            </form>
        </main>
    );
};

export default PublicFeedbackForm;
