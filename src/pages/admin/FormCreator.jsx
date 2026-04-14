import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { createForm } from '../../api/feedbackApi';

const emptyQuestion = () => ({
    prompt: '',
    type: 'text',
    required: false,
    optionsText: '',
    answerTemplatesText: '',
});

const questionTemplates = [
    {
        label: 'Overall rating',
        prompt: 'How would you rate your overall experience?',
        type: 'rating',
        required: true,
    },
    {
        label: 'What worked',
        prompt: 'What did you like the most?',
        type: 'text',
        required: false,
        answerTemplatesText: 'The session was useful because..., I liked the speaker because..., The content helped me understand...',
    },
    {
        label: 'Improvements',
        prompt: 'What should be improved?',
        type: 'text',
        required: false,
        answerTemplatesText: 'More examples would help, The session could be shorter, I would like more time for questions',
    },
    {
        label: 'Recommend',
        prompt: 'Would you recommend this to others?',
        type: 'single-choice',
        required: true,
        optionsText: 'Yes, Maybe, No',
    },
    {
        label: 'Follow-up',
        prompt: 'Would you like someone to contact you after this feedback?',
        type: 'single-choice',
        required: false,
        optionsText: 'Yes, No',
    },
];

const splitList = (value) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const FormCreator = () => {
    const [form, setForm] = useState({
        title: '',
        description: '',
        formType: '',
        status: 'draft',
        visibility: 'public',
        allowedRespondentsText: '',
        collectsPhone: true,
        phoneRequired: false,
        collectsCompanyDetails: true,
        companyDetailsRequired: false,
        duplicateCheckFields: ['email', 'phone', 'uniqueId'],
        opensAt: '',
        closesAt: '',
        singleSession: false,
        sessionKey: '',
        questions: [emptyQuestion()],
    });
    const [status, setStatus] = useState({ type: '', message: '', link: '' });
    const [shareUrl, setShareUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const copyLink = useCallback(() => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [shareUrl]);

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const updateQuestion = (index, field, value) => {
        setForm((current) => ({
            ...current,
            questions: current.questions.map((question, questionIndex) =>
                questionIndex === index ? { ...question, [field]: value } : question,
            ),
        }));
    };

    const addQuestion = () => {
        setForm((current) => ({
            ...current,
            questions: [...current.questions, emptyQuestion()],
        }));
    };

    const addTemplateQuestion = (template) => {
        setForm((current) => ({
            ...current,
            questions: [
                ...current.questions,
                {
                    ...emptyQuestion(),
                    ...template,
                },
            ],
        }));
    };

    const removeQuestion = (index) => {
        setForm((current) => ({
            ...current,
            questions: current.questions.filter((question, questionIndex) => questionIndex !== index),
        }));
    };

    const toggleDuplicateField = (field) => {
        setForm((current) => {
            const duplicateCheckFields = current.duplicateCheckFields.includes(field)
                ? current.duplicateCheckFields.filter((item) => item !== field)
                : [...current.duplicateCheckFields, field];

            return {
                ...current,
                duplicateCheckFields,
            };
        });
    };

    const submitForm = async (event) => {
        event.preventDefault();
        setStatus({ type: '', message: '', link: '' });

        const payload = {
            title: form.title,
            description: form.description,
            formType: form.formType,
            status: form.status,
            visibility: form.visibility,
            allowedRespondents: splitList(form.allowedRespondentsText),
            collectsPhone: form.collectsPhone,
            phoneRequired: form.phoneRequired,
            collectsCompanyDetails: form.collectsCompanyDetails,
            companyDetailsRequired: form.companyDetailsRequired,
            duplicateCheckFields: form.duplicateCheckFields,
            availability: {
                opensAt: form.opensAt || undefined,
                closesAt: form.closesAt || undefined,
                singleSession: form.singleSession,
                sessionKey: form.sessionKey,
            },
            questions: form.questions.map((question) => ({
                prompt: question.prompt,
                type: question.type,
                required: question.required,
                options: splitList(question.optionsText),
                answerTemplates: splitList(question.answerTemplatesText),
            })),
        };

        try {
            const data = await createForm(payload);
            const formId = data.form.slug || data.form._id;
            const fullUrl = `${window.location.origin}/form/${formId}`;
            setShareUrl(fullUrl);
            setStatus({
                type: 'success',
                message: 'Form created successfully!',
                link: `/form/${formId}`,
            });
        } catch (error) {
            setStatus({
                type: 'error',
                message: error.message,
                link: '',
            });
        }
    };

    return (
        <main className="flex-1 min-w-0 bg-surface p-8 lg:p-12">
            <div className="max-w-5xl mx-auto">
                <div className="mb-10">
                    <Link className="text-sm font-semibold text-primary hover:text-primary-container" to="/admin">
                        Back to dashboard
                    </Link>
                    <h2 className="font-headline text-4xl font-extrabold text-primary mt-4">Create Feedback Form</h2>
                    <p className="mt-3 text-secondary text-lg">
                        Configure a webinar or flash form with the visibility, fields, availability, and duplicate submission rules required for this project.
                    </p>
                </div>

                <form className="space-y-8" onSubmit={submitForm}>
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Form name</span>
                            <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" required value={form.title} onChange={(event) => updateField('title', event.target.value)} />
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Form type</span>
                            <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Example: Webinar, Flash, Workshop, Product Feedback" required value={form.formType} onChange={(event) => updateField('formType', event.target.value)} />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-sm font-semibold text-primary">Description</span>
                            <textarea className="w-full min-h-28 rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Status</span>
                            <select className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                                <option value="draft">Draft</option>
                                <option value="live">Live</option>
                                <option value="closed">Closed</option>
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Visibility</span>
                            <select className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" value={form.visibility} onChange={(event) => updateField('visibility', event.target.value)}>
                                <option value="public">Public link</option>
                                <option value="restricted">Restricted users</option>
                            </select>
                        </label>
                    </section>

                    {form.visibility === 'restricted' && (
                        <label className="space-y-2 block">
                            <span className="text-sm font-semibold text-primary">Allowed respondents</span>
                            <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="email, phone, or unique id separated by commas" value={form.allowedRespondentsText} onChange={(event) => updateField('allowedRespondentsText', event.target.value)} />
                        </label>
                    )}

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 text-sm text-secondary">
                            <input checked={form.collectsPhone} type="checkbox" onChange={(event) => updateField('collectsPhone', event.target.checked)} />
                            Collect mobile number
                        </label>
                        <label className="flex items-center gap-3 text-sm text-secondary">
                            <input checked={form.phoneRequired} disabled={!form.collectsPhone} type="checkbox" onChange={(event) => updateField('phoneRequired', event.target.checked)} />
                            Mobile number is mandatory
                        </label>
                        <label className="flex items-center gap-3 text-sm text-secondary">
                            <input checked={form.collectsCompanyDetails} type="checkbox" onChange={(event) => updateField('collectsCompanyDetails', event.target.checked)} />
                            Collect company details
                        </label>
                        <label className="flex items-center gap-3 text-sm text-secondary">
                            <input checked={form.companyDetailsRequired} disabled={!form.collectsCompanyDetails} type="checkbox" onChange={(event) => updateField('companyDetailsRequired', event.target.checked)} />
                            Company details are mandatory
                        </label>
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['email', 'phone', 'uniqueId'].map((field) => (
                            <label className="flex items-center gap-3 text-sm text-secondary" key={field}>
                                <input checked={form.duplicateCheckFields.includes(field)} type="checkbox" onChange={() => toggleDuplicateField(field)} />
                                Prevent duplicate by {field}
                            </label>
                        ))}
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Opens at</span>
                            <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" type="datetime-local" value={form.opensAt} onChange={(event) => updateField('opensAt', event.target.value)} />
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Closes at</span>
                            <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" type="datetime-local" value={form.closesAt} onChange={(event) => updateField('closesAt', event.target.value)} />
                        </label>
                        <label className="flex items-center gap-3 text-sm text-secondary">
                            <input checked={form.singleSession} type="checkbox" onChange={(event) => updateField('singleSession', event.target.checked)} />
                            Restrict to a single session
                        </label>
                        <label className="space-y-2">
                            <span className="text-sm font-semibold text-primary">Session key</span>
                            <input className="w-full rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" disabled={!form.singleSession} value={form.sessionKey} onChange={(event) => updateField('sessionKey', event.target.value)} />
                        </label>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-headline text-2xl font-bold text-primary">Questions</h3>
                            <button className="bg-surface-container-high text-primary px-4 py-2 rounded-md text-sm font-semibold" type="button" onClick={addQuestion}>
                                Add question
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {questionTemplates.map((template) => (
                                <button className="bg-secondary-container text-on-secondary-fixed px-4 py-2 rounded-md text-sm font-semibold" key={template.label} type="button" onClick={() => addTemplateQuestion(template)}>
                                    {template.label}
                                </button>
                            ))}
                        </div>
                        {form.questions.map((question, index) => (
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-4 bg-surface-container-lowest p-5 rounded-xl" key={index}>
                                <input className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder={`Question ${index + 1}`} required value={question.prompt} onChange={(event) => updateQuestion(index, 'prompt', event.target.value)} />
                                <select className="rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" value={question.type} onChange={(event) => updateQuestion(index, 'type', event.target.value)}>
                                    <option value="text">Text</option>
                                    <option value="rating">Rating</option>
                                    <option value="single-choice">Single choice</option>
                                    <option value="multiple-choice">Multiple choice</option>
                                </select>
                                <button className="text-error px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={form.questions.length === 1} type="button" onClick={() => removeQuestion(index)}>
                                    Remove
                                </button>
                                {(question.type === 'single-choice' || question.type === 'multiple-choice') && (
                                    <input className="md:col-span-3 rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Options separated by commas" value={question.optionsText} onChange={(event) => updateQuestion(index, 'optionsText', event.target.value)} />
                                )}
                                <textarea className="md:col-span-3 min-h-20 rounded-lg bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20" placeholder="Answer templates respondents can choose and edit, separated by commas" value={question.answerTemplatesText} onChange={(event) => updateQuestion(index, 'answerTemplatesText', event.target.value)} />
                                <label className="md:col-span-3 flex items-center gap-3 text-sm text-secondary">
                                    <input checked={question.required} type="checkbox" onChange={(event) => updateQuestion(index, 'required', event.target.checked)} />
                                    Required question
                                </label>
                            </div>
                        ))}
                    </section>

                    {status.message && (
                        <div className={`rounded-xl px-5 py-4 text-sm font-medium space-y-3 ${status.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {status.type === 'error' ? 'error' : 'check_circle'}
                                </span>
                                <p className="font-semibold">{status.message}</p>
                            </div>
                            {status.link && shareUrl && (
                                <div className="flex items-center gap-2 bg-white/30 rounded-lg overflow-hidden">
                                    <span className="flex-1 px-3 py-2 font-mono text-xs truncate">{shareUrl}</span>
                                    <button
                                        type="button"
                                        className="flex items-center gap-1 px-3 py-2 bg-white/30 hover:bg-white/50 text-xs font-bold transition-colors shrink-0"
                                        onClick={copyLink}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                    <Link
                                        className="flex items-center gap-1 px-3 py-2 bg-white/30 hover:bg-white/50 text-xs font-bold transition-colors shrink-0"
                                        to={status.link}
                                        target="_blank"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                        Open
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    <button className="bg-primary text-on-primary px-8 py-4 rounded-md font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all" type="submit">
                        Save Form
                    </button>
                </form>
            </div>
        </main>
    );
};

export default FormCreator;
