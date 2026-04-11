const AdminDashboard = () => {
    return (
        <>
            <main className="flex-1 flex flex-col min-w-0 bg-surface">

                <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl  shadow-[0_20px_40px_rgba(0,80,102,0.06)]">
                    <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto w-full">
                        <div className="flex items-center gap-8">
                            <span className="text-xl font-bold text-primary tracking-[-0.02em] font-headline"></span>
                            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-4 py-2 w-96 group focus-within:ring-2 ring-primary/20 transition-all">
                                <span className="material-symbols-outlined text-slate-400 mr-2" data-icon="search">search</span>
                                <input id="dashboard-search-input" className="bg-transparent border-none focus:ring-0 text-sm w-full font-body placeholder:text-slate-400 outline-none" placeholder="Search forms or results..." type="text" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button id="notifications-button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-200">
                                <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
                            </button>
                            <button id="help-button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors active:scale-95 duration-200">
                                <span className="material-symbols-outlined" data-icon="help_outline">help_outline</span>
                            </button>
                            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-primary/10">
                                <img alt="Staff User Profile" className="h-full w-full object-cover" data-alt="Professional headshot of a middle-aged woman with a friendly expression in a modern office environment with soft natural lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBz7fF97jRh3Z5nC_LIQuYW7mEcKQ65MoPtqvXxOFUPPARNH5ppKfkK1_fc5zgr4y8Tp78YYcViWQwh0Q-Mk3NmUaIfJt7GXBq4OJBBDc5Vi1QzMuRAteUFa77dalMXXIqmZKhTBtmEw9p7cADgUB8l1F8fZlvmpSXlxVFI1G8VAdGUwRRjsWS-D0JvW1Y95K2jkh_FitUrjjxjES_oOfXQ1cRqqALhpGnJ7QyLCaYV7F8pWeI14ALAcgWF8E8gdEYfh67R4ncXoEX2" />
                            </div>
                        </div>
                    </div>
                </header>

                <section className="px-8 py-12 lg:px-12 max-w-7xl mx-auto w-full">

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                        <div className="max-w-2xl">
                            <span className="text-[0.6875rem] font-bold tracking-[0.05em] text-primary uppercase font-label">Form Management</span>
                            <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-primary mt-2 tracking-tight">The Living Archive Dashboard</h2>
                            <p className="mt-4 text-secondary text-lg font-body leading-relaxed">
                                Curate and monitor your organization's human stories. Every response is a data point in the larger narrative of impact.
                            </p>
                        </div>
                        <button id="create-new-form-btn" className="flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-md font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/10">
                            <span className="material-symbols-outlined" data-icon="add">add</span>
                            Create New Form
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="p-8 bg-surface-container-low rounded-xl border-none flex flex-col justify-between h-48">
                            <span className="text-xs font-bold tracking-widest text-secondary uppercase">Active Collections</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-headline font-bold text-primary">12</span>
                                <span className="text-tertiary font-medium text-sm">+2 this month</span>
                            </div>
                        </div>
                        <div className="p-8 bg-secondary-container rounded-xl border-none flex flex-col justify-between h-48">
                            <span className="text-xs font-bold tracking-widest text-on-secondary-fixed uppercase">Total Responses</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-headline font-bold text-on-secondary-fixed">2,481</span>
                                <span className="text-on-secondary-fixed-variant font-medium text-sm">Real-time sync</span>
                            </div>
                        </div>
                        <div className="p-8 bg-tertiary-container text-white rounded-xl border-none flex flex-col justify-between h-48 relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-xs font-bold tracking-widest text-on-tertiary-container uppercase">Impact Score</span>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-5xl font-headline font-bold">94%</span>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <span className="material-symbols-outlined text-[120px]" data-icon="auto_awesome">auto_awesome</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">

                        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
                            <h3 className="text-xl font-headline font-bold text-primary">Recent Active Forms</h3>
                            <div className="flex gap-4 text-sm font-medium text-secondary">
                                <button className="hover:text-primary transition-colors">All Forms</button>
                                <button className="text-primary border-b-2 border-primary">Drafts</button>
                                <button className="hover:text-primary transition-colors">Archived</button>
                            </div>
                        </div>

                        <article className="group bg-surface-container-lowest p-10 rounded-2xl flex flex-col lg:flex-row gap-10 items-start lg:items-center hover:bg-surface transition-colors duration-500 relative">
                            <div className="w-full lg:w-1/4 aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-highest">
                                <img alt="Webinar Event" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="Softly focused wide shot of a professional digital webinar setup with glowing screens and blurred participants in a home office" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiSiDb-c5s1tIU1oQ8jZTpMBN0kctcViAOrZ2kCx9OM_ndlnQZ6lsqTyrFKzWNGoMOd-ptyPNKU3bPTCiyVwatXtoYUrGgJBI_6FxZrf-TjwmGlHC_E3l5Iy6imrf9rqq5JtySxFlWgckNWydLvlOrQd341JPJpEJXQvc1_SVkk-vKbhKBmC4zJUe3JwwwujQciB3f0UlbtheCikQtpr274XwuMoNDrd0w7r4gvYobOdkNZS5PzRUdd20XCAzsymLbJ2A-v4De_Axa" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase tracking-widest rounded-full">Live</span>
                                    <span className="text-xs text-slate-500 font-medium font-label">WEBINAR FEEDBACK</span>
                                </div>
                                <h4 className="text-2xl font-headline font-bold text-primary mb-3">Post-Webinar Engagement Survey 2024</h4>
                                <p className="text-secondary leading-relaxed max-w-xl font-body">Gathering qualitative insights on the "Resilient Communities" series to shape future educational programming and resource allocation.</p>
                                <div className="flex items-center gap-8 mt-8 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" data-icon="description">description</span>
                                        <span>24 Questions</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" data-icon="group">group</span>
                                        <span>412 Responses</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full lg:w-auto flex flex-col gap-3">
                                <button className="w-full lg:w-48 bg-primary text-white py-4 rounded-md text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]">View Results</button>
                                <button className="w-full lg:w-48 bg-surface-container-high text-primary py-4 rounded-md text-sm font-semibold hover:bg-surface-variant transition-all active:scale-[0.98]">Edit Content</button>
                            </div>
                        </article>

                        <article className="group bg-surface-container-lowest p-10 rounded-2xl flex flex-col lg:flex-row gap-10 items-start lg:items-center hover:bg-surface transition-colors duration-500 relative">
                            <div className="w-full lg:w-1/4 aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-highest">
                                <img alt="Seminar Workshop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="A group of diverse professionals engaged in a workshop, blurred in the background with a focus on a notebook and pencil" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfNVvQGujoaDKq7a0mhxX_uhxZSr2Bub025iyolZ5GtIQbwl7q-tAjx7eqaIWEvxAO4CibJBbFzO9VLyPpBx8rWNtSp9okllZ0XVxjH9EqOVtN0mnibSD7oPK6PBtgrXFV5zKjDbbDkUtpj0cl691ZxR2pF8Q0graGb_fceHUN_iHUgxegkxm4-tvcGLk2N7lX8DtTOojvZQSP3AOxUckMuJ6DL3KoiYDx6r06YkZ8RTACVfVlGSt4G-ALoDdKTZWOnb0r4Fhs8QpW" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-full">Draft</span>
                                    <span className="text-xs text-slate-500 font-medium font-label">SEMINAR QUICK POLL</span>
                                </div>
                                <h4 className="text-2xl font-headline font-bold text-primary mb-3">Regional Summit Attendee Preference</h4>
                                <p className="text-secondary leading-relaxed max-w-xl font-body">A condensed 5-question poll designed to quickly capture breakout session preferences for the upcoming Nairobi Summit.</p>
                                <div className="flex items-center gap-8 mt-8 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" data-icon="description">description</span>
                                        <span>5 Questions</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" data-icon="history">history</span>
                                        <span>Last edited 2h ago</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full lg:w-auto flex flex-col gap-3">
                                <button className="w-full lg:w-48 bg-primary text-white py-4 rounded-md text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]">Publish Now</button>
                                <button className="w-full lg:w-48 bg-surface-container-high text-primary py-4 rounded-md text-sm font-semibold hover:bg-surface-variant transition-all active:scale-[0.98]">Edit Draft</button>
                            </div>
                        </article>

                        <article className="group bg-surface-container-lowest p-10 rounded-2xl flex flex-col lg:flex-row gap-10 items-start lg:items-center hover:bg-surface transition-colors duration-500 relative">
                            <div className="w-full lg:w-1/4 aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-highest">
                                <img alt="Impact Report" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" data-alt="Conceptual image of growth and progress with small green sprouts growing from a pile of earth on a clean white surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDM5Zt3N1yQEoCpeXN7-_8aWauX5SJfESOeN_ZoBJZJiB55g9DOX8UXTBN-gQ1QRYaweTrkPBeHp5KhhsnNAmlVeVcAA802lsdF5Qiazky5qrD1WHWuUzTZBjhmsZj-PkEfJ2c3vu2g93og-Au6ybCpesvYM55btR_2OKSkqdtC7oZAGGjKMjrr1DH22F64GHwMt9DNDatMdyMpjQ84CZsPuBOsYgnQbrCAwrv_5hV0hedOOauYHUuPRytd2raeabcrrHbDGllxi68_" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest rounded-full">Completed</span>
                                    <span className="text-xs text-slate-500 font-medium font-label">ANNUAL IMPACT SURVEY</span>
                                </div>
                                <h4 className="text-2xl font-headline font-bold text-primary mb-3">FY23 Global Beneficiary Impact Assessment</h4>
                                <p className="text-secondary leading-relaxed max-w-xl font-body">Long-form comprehensive survey capturing multi-dimensional impact across 14 operational regions for the annual board report.</p>
                                <div className="flex items-center gap-8 mt-8 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" data-icon="description">description</span>
                                        <span>65 Questions</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm" data-icon="done_all">done_all</span>
                                        <span>1,850 Responses</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full lg:w-auto flex flex-col gap-3">
                                <button className="w-full lg:w-48 bg-primary text-white py-4 rounded-md text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]">View Results</button>
                                <button className="w-full lg:w-48 bg-surface-container-high text-primary py-4 rounded-md text-sm font-semibold hover:bg-surface-variant transition-all active:scale-[0.98]">Export PDF</button>
                            </div>
                        </article>
                    </div>

                    <div className="mt-20 flex flex-col md:flex-row items-center justify-between pt-8 border-t border-outline-variant/15">
                        <p className="text-sm text-slate-500 font-medium italic">Showing 1-3 of 24 Collections</p>
                        <div className="flex items-center gap-2 mt-4 md:mt-0">
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined" data-icon="chevron_left">chevron_left</span>
                            </button>
                            <button className="h-8 w-8 flex items-center justify-center rounded bg-primary text-white text-xs font-bold">1</button>
                            <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-bold">2</button>
                            <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-bold">3</button>
                            <span className="px-2">...</span>
                            <button className="h-8 w-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-bold">8</button>
                            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined" data-icon="chevron_right">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </section>
            </main>


            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-slate-200/10 flex justify-around py-3 px-6 z-[60] shadow-[0_-10px_30px_rgba(0,80,102,0.1)]">
                <button className="flex flex-col items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-[20px]" data-icon="dashboard" style={{ fontVariationSettings: 'FILL 1' }}>dashboard</span>
                    <span className="text-[10px] font-bold">Dashboard</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]" data-icon="add_circle">add_circle</span>
                    <span className="text-[10px] font-medium">Create</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]" data-icon="live_tv">live_tv</span>
                    <span className="text-[10px] font-medium">Live</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]" data-icon="analytics">analytics</span>
                    <span className="text-[10px] font-medium">Results</span>
                </button>
            </nav>
        </>
    )
}

export default AdminDashboard
