import React from 'react'

const AdminResult = () => {
    return (
        <div className='flex-1 flex flex-col min-w-0'>
            <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl  shadow-[0_20px_40px_rgba(0,80,102,0.06)] flex justify-between items-center px-8 py-4 w-full">
                <div className="flex items-center space-x-8">
                    <span className="text-xl font-bold text-cyan-900  tracking-[-0.02em] font-manrope"></span>
                    <div className="relative hidden lg:block">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <span className="material-symbols-outlined text-sm" data-icon="search">search</span>
                        </span>
                        <input className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary/20" placeholder="Search archives..." type="text" />
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="p-2 text-slate-500 hover:bg-slate-100  transition-colors rounded-full active:scale-95 duration-200">
                        <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
                    </button>
                    <button className="p-2 text-slate-500 hover:bg-slate-100  transition-colors rounded-full active:scale-95 duration-200">
                        <span className="material-symbols-outlined" data-icon="help_outline">help_outline</span>
                    </button>
                    <div className="h-8 w-8 rounded-full overflow-hidden ml-2 border border-slate-200">
                        <img alt="Staff User Profile" className="w-full h-full object-cover" data-alt="close-up portrait of a professional woman in a bright modern office with natural light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_-hSvTPnBZ-t5Pb7jXN0un-5ne69Gen3hszxwhRRtTrmOa-9HlDzIl8LiZL2g2OyZhvwrJEA-nZgWxxys8lsumihq8c9HMmbJKZ7wDlc5ouY3YutjEVC1sRfuD1nEcHDBM2OpLnzDRFeY43PkmteOLD2sgE2ill6px_2uozIKiFcKzq7UjktAxeJPJaWu26OqRcjG2YBXdXmpR3CK1JyI-TmLx6kxMgVMKjP3pLf22zTX2MtL2h6_ZelCfMkIMP7irp9CaxeZqf3z" />
                    </div>
                </div>
            </header>
            
            <main className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full">
                
                <div className="mb-12">
                    <span className="text-[0.6875rem] font-bold tracking-widest text-primary uppercase font-label">Feedback Analysis</span>
                    <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight mt-2">Seminar Feedback</h2>
                    <p className="text-secondary mt-4 max-w-2xl text-lg leading-relaxed font-body">Reviewing the longitudinal impact of the 'Sustainable Narrative' workshop series. These responses capture the intersection of data and human experience.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    
                    <div className="md:col-span-1 bg-surface-container-lowest p-10 rounded-xl shadow-[0_20px_40px_rgba(0,80,102,0.06)] relative overflow-hidden group">
                        <div className="relative z-10">
                            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase font-label mb-4 block">Average Rating</span>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-6xl font-bold text-primary font-headline">4.8</span>
                                <span className="text-xl text-slate-400 font-medium">/ 5.0</span>
                            </div>
                            <div className="mt-6 flex space-x-1">
                                <span className="material-symbols-outlined text-primary" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                <span className="material-symbols-outlined text-primary" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                <span className="material-symbols-outlined text-primary" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                <span className="material-symbols-outlined text-primary" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                <span className="material-symbols-outlined text-primary" data-icon="star" style={{fontVariationSettings : 'FILL 0.8'}}>star</span>
                            </div>
                        </div>
                        <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <span className="material-symbols-outlined text-[12rem]" data-icon="star">star</span>
                        </div>
                    </div>
                    
                    <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-10 rounded-xl text-on-primary shadow-[0_20px_40px_rgba(0,80,102,0.1)] flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs font-bold text-on-primary/60 tracking-widest uppercase font-label mb-4 block">Total Responses</span>
                                <span className="text-6xl font-bold font-headline">1,248</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-on-primary/60 tracking-widest uppercase font-label mb-4 block">Completion Rate</span>
                                <span className="text-2xl font-bold font-headline">94.2%</span>
                            </div>
                        </div>
                        <div className="mt-8">
                            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-tertiary-fixed-dim" style={{width : "94%"}}></div>
                            </div>
                            <div className="flex justify-between mt-3 text-sm text-on-primary/70">
                                <span>Engagement Target: 1,000</span>
                                <span>+24.8% vs. Prev Period</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                    <div>
                        <h3 className="text-xl font-bold text-primary font-headline mb-6">Respondent Sentiment</h3>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-slate-700">Exceptional Impact</span>
                                    <span className="text-primary">72%</span>
                                </div>
                                <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{width: '72%'}}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-slate-700">Positive Growth</span>
                                    <span className="text-tertiary">22%</span>
                                </div>
                                <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                                    <div className="h-full bg-tertiary-container" style={{width: '22%'}}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-slate-700">Constructive Feedback</span>
                                    <span className="text-slate-400">6%</span>
                                </div>
                                <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary-container" style={{width: '6%'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-center">
                        <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase font-label mb-6">Top Keywords</h4>
                        <div className="flex flex-wrap gap-3">
                            <span className="bg-secondary-container text-on-secondary-fixed px-6 py-2 rounded-full text-sm font-medium shadow-sm">Inclusive Architecture</span>
                            <span className="bg-primary text-on-primary px-6 py-2 rounded-full text-sm font-medium shadow-sm">Empathetic Leadership</span>
                            <span className="bg-tertiary-fixed text-on-tertiary-fixed px-6 py-2 rounded-full text-sm font-medium shadow-sm">Sustainability</span>
                            <span className="bg-surface-container-highest text-slate-700 px-6 py-2 rounded-full text-sm font-medium">Storytelling</span>
                            <span className="bg-surface-container-highest text-slate-700 px-6 py-2 rounded-full text-sm font-medium">Resource Equity</span>
                            <span className="bg-surface-container-highest text-slate-700 px-6 py-2 rounded-full text-sm font-medium">Community Flow</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,80,102,0.04)]">
                    <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center bg-surface-container-low/50">
                        <h3 className="text-lg font-bold text-primary font-headline mb-4 md:mb-0">Individual Narratives</h3>
                        <div className="flex space-x-4">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                    <span className="material-symbols-outlined text-sm" data-icon="calendar_today">calendar_today</span>
                                </span>
                                <select className="bg-surface text-sm border-none rounded-lg pl-10 pr-8 py-2 focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                                    <option>Last 30 Days</option>
                                    <option>Last 6 Months</option>
                                    <option>All Time</option>
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                    <span className="material-symbols-outlined text-sm" data-icon="filter_list">filter_list</span>
                                </span>
                                <input className="bg-surface text-sm border-none rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/20" placeholder="Filter by name..." type="text" />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low/30">
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest font-label">Respondent</th>
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest font-label">Date Submitted</th>
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest font-label">Rating</th>
                                    <th className="px-8 py-4 text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest font-label">Primary Sentiment</th>
                                    <th className="px-8 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-lg bg-primary-fixed-dim flex items-center justify-center text-primary font-bold text-xs">EJ</div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">Elena Jansson</div>
                                                <div className="text-xs text-slate-500">Program Director</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-600">Oct 24, 2023</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-1 text-primary">
                                            <span className="font-bold text-sm">5.0</span>
                                            <span className="material-symbols-outlined text-[16px]" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="bg-tertiary-container text-on-tertiary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Exceptional</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="text-primary hover:text-primary-container transition-colors">
                                            <span className="material-symbols-outlined" data-icon="visibility">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-lg bg-secondary-fixed flex items-center justify-center text-primary font-bold text-xs">MA</div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">Marcus Aurelius</div>
                                                <div className="text-xs text-slate-500">Field Coordinator</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-600">Oct 22, 2023</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-1 text-primary">
                                            <span className="font-bold text-sm">4.0</span>
                                            <span className="material-symbols-outlined text-[16px]" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="bg-secondary-container text-on-secondary-fixed-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Positive</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="text-primary hover:text-primary-container transition-colors">
                                            <span className="material-symbols-outlined" data-icon="visibility">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-10 w-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary font-bold text-xs">SK</div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">Sarah Kincaid</div>
                                                <div className="text-xs text-slate-500">Researcher</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-slate-600">Oct 21, 2023</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-1 text-primary">
                                            <span className="font-bold text-sm">5.0</span>
                                            <span className="material-symbols-outlined text-[16px]" data-icon="star" style={{fontVariationSettings : 'FILL 1'}}>star</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="bg-tertiary-container text-on-tertiary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Exceptional</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="text-primary hover:text-primary-container transition-colors">
                                            <span className="material-symbols-outlined" data-icon="visibility">visibility</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 bg-surface-container-low/30 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Showing 3 of 1,248 entries</span>
                        <div className="flex space-x-2">
                            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white transition-colors disabled:opacity-50" disabled="">
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
                <span className="px-6 text-[0.6875rem] font-bold tracking-widest text-slate-400 uppercase font-label"></span>
                <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent"></div>
            </footer>
        </div>
    )
}

export default AdminResult
