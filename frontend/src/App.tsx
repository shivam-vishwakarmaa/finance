// @ts-nocheck
import { useState, useEffect } from 'react'
import { Moon, Sun, Activity, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, FileSearch, ShieldAlert, ShieldCheck, Zap, Database, BarChart3, TrendingUp, Sparkles } from 'lucide-react'

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [isDark, setIsDark] = useState<boolean>(true)
  const [selectedException, setSelectedException] = useState<any>(null)
  const [selectedCluster, setSelectedCluster] = useState<any>(null)
  
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [clusters, setClusters] = useState<any[]>([])
  const [exceptions, setExceptions] = useState<any[]>([])
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDark])

  useEffect(() => {
    fetch('http://localhost:8000/api/dashboard')
      .then(r => r.json())
      .then(data => setDashboardData(data))
      
    fetch('http://localhost:8000/api/clusters')
      .then(r => r.json())
      .then(data => setClusters(data))
      
    fetch('http://localhost:8000/api/exceptions')
      .then(r => r.json())
      .then(data => setExceptions(data))
      
    fetch('http://localhost:8000/api/audit')
      .then(r => r.json())
      .then(data => setAuditEvents(data))
  }, [])

  const navigateToException = (excId: string) => {
    fetch(`http://localhost:8000/api/exceptions/${excId}`)
      .then(r => r.json())
      .then(data => {
        setSelectedException(data)
        setCurrentView('exception')
      })
  }

  const navigateToCluster = (clusterId: string) => {
    fetch(`http://localhost:8000/api/clusters/${clusterId}`)
      .then(r => r.json())
      .then(data => {
        setSelectedCluster(data)
        setCurrentView('cluster')
      })
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)

  // --- VIEWS ---
  const DashboardView = () => (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-fade-in relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> AI Recon Engine Active
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient">FinEx Controller</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg max-w-xl">Your reconciliation system tells you what broke. FinEx tells you why, proves it, and resolves it autonomously.</p>
        </div>
      </div>
      
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ShieldCheck className="w-20 h-20 text-success"/></div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-success"/> Books Confidence</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-white">{(dashboardData.books_confidence * 100).toFixed(1)}%</p>
            <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-success rounded-full" style={{ width: `${dashboardData.books_confidence * 100}%` }}></div>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group border-success/20 hover:border-success/40">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Database className="w-20 h-20 text-success"/></div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Proven Value</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(dashboardData.proven_value)}</p>
            <p className="text-xs text-success mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Safely Reconciled</p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group border-warning/30 hover:border-warning/50">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle className="w-20 h-20 text-warning"/></div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Under Investigation</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(dashboardData.unresolved_value)}</p>
            <p className="text-xs text-warning mt-2 flex items-center gap-1"><Activity className="w-3 h-3"/> Pending Resolution</p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group border-danger/20 hover:border-danger/40">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BarChart3 className="w-20 h-20 text-danger"/></div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total Exceptions</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{dashboardData.total_exceptions}</p>
            <p className="text-xs text-danger mt-2">Spanning {dashboardData.total_clusters} systemic clusters</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2"><Zap className="text-primary w-6 h-6"/> Systemic Clusters</h2>
            <span className="text-xs font-medium px-2.5 py-1 bg-primary/20 text-primary rounded-full border border-primary/30">AI Detected</span>
          </div>
          <div className="space-y-3">
            {clusters.map((c, i) => (
              <div key={c.cluster_id} onClick={() => navigateToCluster(c.cluster_id)} 
                className="glass-card p-5 rounded-2xl hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(26,86,219,0.15)] group flex items-center justify-between"
                style={{ animationDelay: `${0.4 + (i * 0.1)}s` }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-primary/20 group-hover:text-primary group-hover:border-primary/50 transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:text-white transition-colors">{c.name.replace(/_/g, ' ')}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{c.exception_count} transactions grouped</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <p className="font-semibold text-warning text-lg">{formatCurrency(c.total_impact)}</p>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-primary"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold flex items-center gap-2"><AlertTriangle className="text-warning w-6 h-6"/> High Priority Exceptions</h2>
          <div className="space-y-3">
            {exceptions.slice(0, 5).map((e, i) => (
              <div key={e.exception_id} onClick={() => navigateToException(e.exception_id)} 
                className="glass-card p-4 rounded-2xl hover:border-warning/50 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] group flex justify-between items-center"
                style={{ animationDelay: `${0.4 + (i * 0.1)}s` }}>
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {e.exception_id}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono">{e.order_id}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="font-semibold text-danger">{formatCurrency(e.financial_impact)}</p>
                  <span className={`text-[10px] uppercase px-2 py-1 rounded-full mt-2 font-semibold tracking-wider
                    ${e.status === 'SAFE_AUTO_RESOLUTION' ? 'bg-success/10 text-success border border-success/20' : 
                      e.status === 'UNRESOLVED' ? 'bg-danger/10 text-danger border border-danger/20' : 
                      'bg-warning/10 text-warning border border-warning/20'}`}>
                    {e.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const ExceptionView = () => {
    if (!selectedException) return null
    const { exception_id, order_id, financial_impact, status, evidence_package: ev } = selectedException
    
    const handleAction = (action: 'approve' | 'reject') => {
      fetch(`http://localhost:8000/api/exceptions/${exception_id}/${action}`, { method: 'POST' })
        .then(r => r.json())
        .then(() => {
          const newStatus = action === 'approve' ? 'HUMAN_APPROVED' : 'UNRESOLVED'
          setSelectedException({...selectedException, status: newStatus})
          setExceptions(exceptions.map(e => e.exception_id === exception_id ? {...e, status: newStatus} : e))
          // Refresh dashboard stats
          fetch('http://localhost:8000/api/dashboard').then(r => r.json()).then(data => setDashboardData(data))
        })
    }
    
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-slide-up relative z-10">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-slate-200 dark:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4"/>
          </div>
          Back to Dashboard
        </button>
        
        <div className="glass-card p-8 rounded-3xl border-b-0 rounded-b-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-primary font-mono text-sm tracking-widest uppercase">Exception Investigation</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${status === 'SAFE_AUTO_RESOLUTION' ? 'bg-success/10 text-success border border-success/30' : 
                    status === 'UNRESOLVED' ? 'bg-danger/10 text-danger border border-danger/30' : 
                    'bg-warning/10 text-warning border border-warning/30'}`}>
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{exception_id}</h1>
              <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">Ref: {order_id}</p>
            </div>
            <div className="text-right">
               <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Financial Variance</p>
               <p className="text-4xl font-bold text-danger">{formatCurrency(financial_impact)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-0">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
              <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-primary to-cyan-400"></div>
              <h2 className="text-2xl font-semibold flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><FileSearch className="w-5 h-5"/></div>
                AI Hypothesis
              </h2>
              {ev && ev.hypothesis ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Identified Root Cause</h3>
                    <p className="text-xl font-medium text-slate-900 dark:text-white leading-relaxed">{ev.hypothesis.root_cause_hypothesis}</p>
                  </div>
                  <div className="p-5 rounded-2xl glass-panel">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Explanation Trail</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{ev.hypothesis.explanation}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="glass-panel px-5 py-3 rounded-xl border-primary/20">
                      <span className="block text-xs text-slate-600 dark:text-slate-400 mb-1">AI Confidence</span>
                      <span className="text-xl font-bold text-primary">{(ev.hypothesis.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="glass-panel px-5 py-3 rounded-xl border-primary/20">
                      <span className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Systemic Category</span>
                      <span className="text-lg font-medium text-slate-900 dark:text-white">{ev.hypothesis.root_cause_category}</span>
                    </div>
                  </div>
                </div>
              ) : (
                 <p className="text-slate-500 italic flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> AI hypothesis parsing failed.</p>
              )}
            </div>

            <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-success to-emerald-400"></div>
              <h2 className="text-2xl font-semibold flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-success/10 text-success"><ShieldCheck className="w-5 h-5"/></div>
                Deterministic Verification
              </h2>
              {ev && ev.verification ? (
                <div className="space-y-0 font-mono text-sm bg-white dark:bg-[#050b14] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                   <div className="flex justify-between p-4 border-b border-slate-200 dark:border-white/5">
                      <span className="text-slate-600 dark:text-slate-400">Expected Internal Books</span> 
                      <span className="text-slate-900 dark:text-white">{formatCurrency(ev.verification.expected)}</span>
                   </div>
                   <div className="flex justify-between p-4 border-b border-slate-200 dark:border-white/5">
                      <span className="text-slate-600 dark:text-slate-400">Gateway Observed Net</span> 
                      <span className="text-slate-900 dark:text-white">{formatCurrency(ev.verification.observed)}</span>
                   </div>
                   <div className="flex justify-between p-4 border-b border-slate-200 dark:border-white/5 bg-primary/5">
                      <span className="text-primary font-semibold">AI Proposed Adjustment</span> 
                      <span className="text-primary font-bold">{ev.hypothesis?.proposed_adjustment_amount > 0 ? '+' : ''}{formatCurrency(ev.hypothesis?.proposed_adjustment_amount)}</span>
                   </div>
                   <div className="flex justify-between p-5 bg-slate-100 dark:bg-white/5 text-base">
                      <span className="text-slate-900 dark:text-white font-semibold">Reconciled Total</span>
                      <span className="flex items-center gap-3 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ev.verification.observed + (ev.hypothesis?.proposed_adjustment_amount || 0))}
                        {ev.verification.status === 'PASS' ? 
                          <span className="px-2 py-0.5 rounded text-xs bg-success/20 text-success border border-success/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> PASS</span> : 
                          <span className="px-2 py-0.5 rounded text-xs bg-danger/20 text-danger border border-danger/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> FAIL</span>}
                      </span>
                   </div>
                </div>
              ) : (
                <p className="text-slate-500 italic flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Verification data unavailable.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6 rounded-3xl">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Transaction Context</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Graph entities provided to AI engine</p>
              {ev && ev.nodes ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {ev.nodes.map((n: string, idx: number) => (
                    <div key={idx} className="px-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-mono truncate border border-slate-200 dark:border-white/5 hover:border-primary/40 hover:bg-slate-200 dark:bg-white/10 transition-all cursor-default" title={n}>
                      {n}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Graph context missing.</p>
              )}
            </div>

            <div className={`p-8 rounded-3xl border relative overflow-hidden
               ${status === 'HUMAN_APPROVAL' ? 'bg-gradient-to-br from-indigo-100 to-white dark:from-[#1e1b4b] dark:to-[#0f172a] border-primary/30' : 
                 status === 'SAFE_AUTO_RESOLUTION' ? 'bg-gradient-to-br from-emerald-100 to-white dark:from-[#064e3b] dark:to-[#0f172a] border-success/30' : 
                 'bg-gradient-to-br from-red-100 to-white dark:from-[#450a0a] dark:to-[#0f172a] border-danger/30'}`}>
               <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Governance Engine</h2>
               <p className="text-sm text-slate-700 dark:text-slate-300 opacity-80 mb-6">Execution strictly controlled by materiality & confidence thresholds.</p>
               
               {status === 'HUMAN_APPROVAL' ? (
                 <div className="space-y-3 relative z-10">
                   <button onClick={() => handleAction('approve')} className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-slate-900 dark:text-white font-semibold shadow-[0_0_20px_rgba(26,86,219,0.3)] transition-all flex items-center justify-center gap-2">
                     <CheckCircle2 className="w-4 h-4"/> Approve Adjustment
                   </button>
                   <button onClick={() => handleAction('reject')} className="w-full py-3.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white font-medium transition-all">
                     Flag as Unresolved
                   </button>
                 </div>
               ) : status === 'SAFE_AUTO_RESOLUTION' || status === 'HUMAN_APPROVED' ? (
                 <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-100 dark:bg-black/20 rounded-2xl border border-success/20">
                    <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mb-3">
                      <ShieldCheck className="w-6 h-6 text-success" />
                    </div>
                    <p className="text-success font-bold text-lg mb-1">{status === 'HUMAN_APPROVED' ? 'Human Approved' : 'Safely Auto-Resolved'}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">Adjustment applied to ledger.</p>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-100 dark:bg-black/20 rounded-2xl border border-danger/20">
                    <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center mb-3">
                      <ShieldAlert className="w-6 h-6 text-danger" />
                    </div>
                    <p className="text-danger font-bold text-lg mb-1">Human Investigation Required</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">Ambiguous case blocked from auto-resolution.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ClusterView = () => {
    if (!selectedCluster) return null
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-slide-up relative z-10">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-slate-200 dark:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4"/>
          </div>
          Back to Dashboard
        </button>
        
        <div className="glass-card flex flex-col items-center text-center py-16 px-6 rounded-[2.5rem] relative overflow-hidden border-t border-t-white/20">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-primary/20 rounded-[100%] blur-[100px] -mt-[150px]"></div>
           <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-4 relative z-10 flex items-center gap-2">
             <Activity className="w-4 h-4"/> Systemic Root Cause
           </h2>
           <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-10 relative z-10 tracking-tight text-gradient-primary leading-tight">
             {selectedCluster.name.replace(/_/g, ' ')}
           </h1>
           
           <div className="flex flex-col sm:flex-row gap-4 sm:gap-10 relative z-10">
             <div className="glass-panel px-8 py-5 rounded-2xl min-w-[200px]">
               <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Material Impact</p>
               <p className="text-3xl font-bold text-warning">{formatCurrency(selectedCluster.total_impact)}</p>
             </div>
             <div className="glass-panel px-8 py-5 rounded-2xl min-w-[200px]">
               <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Affected Records</p>
               <p className="text-3xl font-bold text-slate-900 dark:text-white">{selectedCluster.exception_count}</p>
             </div>
           </div>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white px-2">Clustered Exceptions</h3>
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-300 dark:border-white/10">
                  <tr>
                    <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Exception ID</th>
                    <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Order Ref</th>
                    <th className="p-5 font-semibold text-slate-700 dark:text-slate-300 text-right">Variance</th>
                    <th className="p-5 font-semibold text-slate-700 dark:text-slate-300 text-center">Engine Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedCluster.exceptions.map((e: any) => (
                    <tr key={e.exception_id} className="hover:bg-slate-100 dark:bg-white/5 cursor-pointer transition-colors group" onClick={() => navigateToException(e.exception_id)}>
                      <td className="p-5 font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">{e.exception_id}</td>
                      <td className="p-5 text-slate-600 dark:text-slate-400 font-mono text-xs">{e.order_id}</td>
                      <td className="p-5 text-right font-bold text-danger">{formatCurrency(e.financial_impact)}</td>
                      <td className="p-5 text-center">
                         <span className={`text-[10px] uppercase px-3 py-1.5 rounded-full font-semibold tracking-wide
                           ${e.status === 'SAFE_AUTO_RESOLUTION' ? 'bg-success/10 text-success border border-success/20' : 
                             e.status === 'UNRESOLVED' ? 'bg-danger/10 text-danger border border-danger/20' : 
                             'bg-warning/10 text-warning border border-warning/20'}`}>
                           {e.status.replace(/_/g, ' ')}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const AuditView = () => (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Audit Trail</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Immutable log of all automated and manual governance actions.</p>
        </div>
        <button onClick={() => {
            fetch('http://localhost:8000/api/audit').then(r => r.json()).then(data => setAuditEvents(data))
          }} className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 rounded-lg text-sm font-medium transition-colors">
          Refresh Log
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden border border-slate-300 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-300 dark:border-white/10">
              <tr>
                <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Timestamp</th>
                <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Event ID</th>
                <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Record Ref</th>
                <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Action</th>
                <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Confidence</th>
                <th className="p-5 font-semibold text-slate-700 dark:text-slate-300">Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditEvents.map((e: any) => (
                <tr key={e.event_id} className="hover:bg-slate-100 dark:bg-white/5 transition-colors">
                  <td className="p-5 text-slate-600 dark:text-slate-400 text-xs font-mono">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-5 font-medium text-slate-900 dark:text-white">{e.event_id}</td>
                  <td className="p-5 text-primary cursor-pointer hover:underline" onClick={() => navigateToException(e.record_id)}>{e.record_id}</td>
                  <td className="p-5">
                    <span className={`text-[10px] uppercase px-2 py-1 rounded-full font-bold tracking-wide
                      ${e.action.includes('APPROVE') || e.action.includes('SAFE') ? 'bg-success/10 text-success border border-success/20' : 
                        e.action.includes('REJECT') ? 'bg-danger/10 text-danger border border-danger/20' : 
                        'bg-warning/10 text-warning border border-warning/20'}`}>
                      {e.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-5 text-slate-700 dark:text-slate-300 font-mono">{(e.confidence * 100).toFixed(1)}%</td>
                  <td className="p-5 text-slate-500 font-mono text-[10px] truncate max-w-[150px]" title={e.record_hash}>{e.record_hash}</td>
                </tr>
              ))}
              {auditEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">No audit events recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30 text-slate-800 dark:text-slate-200 relative overflow-hidden pb-20 font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
         <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] mix-blend-screen animate-blob" style={{ animationDelay: '2s' }}></div>
         <div className="absolute -bottom-1/4 left-1/3 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <header className="border-b border-slate-200 dark:border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[90rem] mx-auto h-20 flex items-center justify-between px-6 md:px-10">
           <div className="flex items-center gap-3 font-extrabold text-2xl tracking-tight cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-slate-900 dark:text-white shadow-[0_0_15px_rgba(26,86,219,0.5)] group-hover:shadow-[0_0_25px_rgba(26,86,219,0.7)] transition-all duration-300">
               <Activity className="w-6 h-6" />
             </div>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">FinEx</span>
           </div>
           
           <nav className="flex items-center gap-6">
             <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white transition-colors">
               {isDark ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
             </button>
             <button onClick={() => setCurrentView('dashboard')} className={`text-sm font-semibold transition-colors ${currentView === 'dashboard' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Dashboard</button>
             <button onClick={() => setCurrentView('audit')} className={`text-sm font-semibold transition-colors ${currentView === 'audit' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Audit Trail</button>
           </nav>
        </div>
      </header>
      
      <main className="relative z-10">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'exception' && <ExceptionView />}
        {currentView === 'cluster' && <ClusterView />}
        {currentView === 'audit' && <AuditView />}
      </main>
    </div>
  )
}

export default App
