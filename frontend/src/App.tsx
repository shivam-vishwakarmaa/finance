// @ts-nocheck
import { useState, useEffect } from 'react'
import { Moon, Sun, Activity, AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, FileSearch, ShieldAlert, ShieldCheck, Database, Zap, BookOpen } from 'lucide-react'

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem('finex-theme') !== 'light')
  
  const [selectedException, setSelectedException] = useState<any>(null)
  const [selectedCluster, setSelectedCluster] = useState<any>(null)
  const [clusterNarrative, setClusterNarrative] = useState<any>(null)
  
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [clusters, setClusters] = useState<any[]>([])
  const [exceptions, setExceptions] = useState<any[]>([])
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('finex-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('finex-theme', 'light')
    }
  }, [isDark])

  const refreshData = () => {
    fetch('http://localhost:8000/api/dashboard').then(r => r.json()).then(data => setDashboardData(data))
    fetch('http://localhost:8000/api/clusters').then(r => r.json()).then(data => setClusters(data))
    fetch('http://localhost:8000/api/exceptions').then(r => r.json()).then(data => setExceptions(data))
    fetch('http://localhost:8000/api/audit').then(r => r.json()).then(data => setAuditEvents(data))
  }

  useEffect(() => {
    refreshData()
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
    setClusterNarrative(null)
    fetch(`http://localhost:8000/api/clusters/${clusterId}`)
      .then(r => r.json())
      .then(data => {
        setSelectedCluster(data)
        setCurrentView('cluster')
        // Fetch first exception to get narrative
        if (data.exceptions && data.exceptions.length > 0) {
           fetch(`http://localhost:8000/api/exceptions/${data.exceptions[0].exception_id}`)
             .then(r => r.json())
             .then(excData => {
                if (excData.evidence_package && excData.evidence_package.hypothesis) {
                   setClusterNarrative(excData.evidence_package.hypothesis)
                }
             })
        }
      })
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)

  // Filter for "We Don't Know" panel
  const escalatedExceptions = exceptions.filter(e => e.status === 'UNRESOLVED' || e.status === 'HUMAN_APPROVAL')

  const getGovernanceBadge = (status: string, confidence: number) => {
    const confStr = confidence ? `${(confidence * 100).toFixed(0)}% CONFIDENCE` : 'UNKNOWN CONFIDENCE'
    if (status === 'SAFE_AUTO_RESOLUTION' || status === 'HUMAN_APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-success/10 text-success border border-success/30 uppercase">
          <CheckCircle2 className="w-3 h-3"/> {confStr} - AUTO-EXECUTED
        </span>
      )
    }
    if (status === 'HUMAN_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-warning/10 text-warning border border-warning/30 uppercase">
          <AlertTriangle className="w-3 h-3"/> {confStr} - PENDING REVIEW
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-danger/10 text-danger border border-danger/30 uppercase">
        <ShieldAlert className="w-3 h-3"/> {confStr} - ESCALATED
      </span>
    )
  }

  const DashboardView = () => (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-fade-in relative z-10">
      
      {/* Header & Materiality Metrics */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient">FinEx Controller</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg max-w-xl">
            Your reconciliation system tells you what broke. FinEx tells you why, proves it, and resolves it autonomously.
          </p>
        </div>
        
        {dashboardData && (
          <div className="flex gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
             <div className="text-right">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">Books Confidence</p>
                <p className="text-5xl font-bold text-success">{(dashboardData.books_confidence * 100).toFixed(1)}%</p>
             </div>
          </div>
        )}
      </div>

      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group border-success/20">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Database className="w-32 h-32 text-success"/></div>
            <p className="text-sm font-bold tracking-widest text-success uppercase mb-2">Value Safely Resolved</p>
            <p className="text-5xl font-bold text-slate-900 dark:text-white">{formatCurrency(dashboardData.proven_value)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 font-medium">Successfully accounted for and adjusted by AI</p>
          </div>
          
          <div className="glass-card p-8 rounded-3xl relative overflow-hidden group border-danger/20">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle className="w-32 h-32 text-danger"/></div>
            <p className="text-sm font-bold tracking-widest text-danger uppercase mb-2">Value at Risk (Unresolved)</p>
            <p className="text-5xl font-bold text-slate-900 dark:text-white">{formatCurrency(dashboardData.unresolved_value)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 font-medium">Pending human review or escalated</p>
          </div>
        </div>
      )}

      {/* Main Content: Clusters vs Escalations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        
        {/* Left: Systemic Clusters (The main focus) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 rounded-xl bg-primary/10 text-primary"><Zap className="w-6 h-6"/></div>
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Systemic Root Causes</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">AI has grouped {dashboardData?.total_exceptions} exceptions into {dashboardData?.total_clusters} systemic issues.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((c, i) => (
              <div key={c.cluster_id} onClick={() => navigateToCluster(c.cluster_id)} 
                className="glass-card p-6 rounded-3xl hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(26,86,219,0.15)] group relative overflow-hidden"
                style={{ animationDelay: `${0.4 + (i * 0.1)}s` }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors"></div>
                
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{c.name.replace(/_/g, ' ')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{c.exception_count} affected records</p>
                
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Materiality</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(c.total_impact)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-white"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right: The "We Don't Know" Panel */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 rounded-xl bg-danger/10 text-danger"><ShieldAlert className="w-6 h-6"/></div>
             <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Escalations</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Cases the AI explicitly failed to resolve automatically.</p>
          
          <div className="space-y-3">
            {escalatedExceptions.map((e, i) => (
              <div key={e.exception_id} onClick={() => navigateToException(e.exception_id)} 
                className="glass-card p-5 rounded-2xl hover:border-danger/40 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] group"
                style={{ animationDelay: `${0.4 + (i * 0.1)}s` }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{e.exception_id}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">{e.order_id}</p>
                  </div>
                  <p className="font-bold text-danger">{formatCurrency(e.financial_impact)}</p>
                </div>
                {getGovernanceBadge(e.status, e.confidence)}
              </div>
            ))}
            {escalatedExceptions.length === 0 && (
              <div className="p-8 text-center glass-panel rounded-3xl border-dashed border-slate-300 dark:border-white/10">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3 opacity-50"/>
                <p className="text-slate-500 font-medium">No pending escalations.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const ClusterView = () => {
    if (!selectedCluster) return null
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-slide-up relative z-10">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-slate-200 dark:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4"/>
          </div>
          Back to Dashboard
        </button>
        
        {/* Cluster Header */}
        <div className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden border-t border-t-white/20">
           <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-[100%] blur-[100px] -mr-20 -mt-20"></div>
           <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-4 relative z-10 flex items-center gap-2">
             <Activity className="w-4 h-4"/> Systemic Root Cause
           </h2>
           <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-10 relative z-10 tracking-tight text-gradient-primary leading-tight">
             {selectedCluster.name.replace(/_/g, ' ')}
           </h1>
           
           <div className="flex flex-col sm:flex-row gap-6 relative z-10">
             <div className="glass-panel px-8 py-6 rounded-3xl">
               <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">Total Material Impact</p>
               <p className="text-4xl font-bold text-danger">{formatCurrency(selectedCluster.total_impact)}</p>
             </div>
             <div className="glass-panel px-8 py-6 rounded-3xl">
               <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">Affected Records</p>
               <p className="text-4xl font-bold text-slate-900 dark:text-white">{selectedCluster.exception_count}</p>
             </div>
           </div>
        </div>

        {/* Narrative & Evidence (Front and Center) */}
        <div className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden">
           <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-primary to-cyan-400"></div>
           <h2 className="text-2xl font-bold flex items-center gap-3 mb-8 text-slate-900 dark:text-white">
             <div className="p-2 rounded-xl bg-primary/10 text-primary"><BookOpen className="w-6 h-6"/></div>
             AI Narrative & Evidence
           </h2>
           
           {clusterNarrative ? (
             <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">The "Why"</h3>
                  <p className="text-2xl font-medium text-slate-900 dark:text-white leading-snug max-w-4xl">
                    {clusterNarrative.root_cause_hypothesis}
                  </p>
                </div>
                <div className="p-6 rounded-3xl glass-panel bg-slate-50 dark:bg-white/[0.02]">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Detailed Explanation</h3>
                  <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
                    {clusterNarrative.explanation}
                  </p>
                </div>
             </div>
           ) : (
             <div className="animate-pulse flex space-x-4">
               <div className="flex-1 space-y-6 py-1">
                 <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                 <div className="space-y-3">
                   <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                   <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                 </div>
               </div>
             </div>
           )}
        </div>

        {/* Supporting Evidence: The Rows */}
        <div className="space-y-6 pt-4">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white px-2">Affected Transactions</h3>
          <div className="glass-card rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-300 dark:border-white/10">
                  <tr>
                    <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Exception ID</th>
                    <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Order Ref</th>
                    <th className="p-6 font-semibold text-slate-700 dark:text-slate-300 text-right">Variance</th>
                    <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Governance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {selectedCluster.exceptions.map((e: any) => (
                    <tr key={e.exception_id} className="hover:bg-slate-100 dark:bg-white/5 cursor-pointer transition-colors group" onClick={() => navigateToException(e.exception_id)}>
                      <td className="p-6 font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{e.exception_id}</td>
                      <td className="p-6 text-slate-600 dark:text-slate-400 font-mono text-xs">{e.order_id}</td>
                      <td className="p-6 text-right font-bold text-danger text-lg">{formatCurrency(e.financial_impact)}</td>
                      <td className="p-6">
                         {getGovernanceBadge(e.status, e.confidence)}
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

  const ExceptionView = () => {
    if (!selectedException) return null
    const { exception_id, order_id, financial_impact, status, evidence_package: ev, confidence } = selectedException
    
    const handleAction = (action: 'approve' | 'reject') => {
      fetch(`http://localhost:8000/api/exceptions/${exception_id}/${action}`, { method: 'POST' })
        .then(r => r.json())
        .then(() => {
          const newStatus = action === 'approve' ? 'HUMAN_APPROVED' : 'UNRESOLVED'
          setSelectedException({...selectedException, status: newStatus})
          // Update lists
          refreshData()
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
        
        {/* Top Header */}
        <div className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden border-b-0 rounded-b-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-primary font-bold text-sm tracking-widest uppercase">Deep Dive Investigation</span>
                {getGovernanceBadge(status, confidence)}
              </div>
              <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{exception_id}</h1>
              <p className="text-slate-600 dark:text-slate-400 font-mono text-base">Order Reference: {order_id}</p>
            </div>
            <div className="text-right">
               <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">Financial Variance</p>
               <p className="text-5xl font-bold text-danger">{formatCurrency(financial_impact)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-0">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-primary to-cyan-400"></div>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-8 text-slate-900 dark:text-white">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><FileSearch className="w-6 h-6"/></div>
                AI Hypothesis
              </h2>
              {ev && ev.hypothesis ? (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Identified Root Cause</h3>
                    <p className="text-2xl font-medium text-slate-900 dark:text-white leading-snug">{ev.hypothesis.root_cause_hypothesis}</p>
                  </div>
                  <div className="p-6 rounded-3xl glass-panel bg-slate-50 dark:bg-white/[0.02]">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Explanation Trail</h3>
                    <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">{ev.hypothesis.explanation}</p>
                  </div>
                </div>
              ) : (
                 <p className="text-slate-500 italic flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> AI hypothesis parsing failed.</p>
              )}
            </div>

            <div className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-success to-emerald-400"></div>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-8 text-slate-900 dark:text-white">
                <div className="p-2 rounded-xl bg-success/10 text-success"><ShieldCheck className="w-6 h-6"/></div>
                Deterministic Verification
              </h2>
              {ev && ev.verification ? (
                <div className="space-y-0 font-mono text-base bg-slate-50 dark:bg-[#050b14] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden">
                   <div className="flex justify-between p-6 border-b border-slate-200 dark:border-white/5">
                      <span className="text-slate-600 dark:text-slate-400">Expected Internal Books</span> 
                      <span className="text-slate-900 dark:text-white font-medium">{formatCurrency(ev.verification.expected)}</span>
                   </div>
                   <div className="flex justify-between p-6 border-b border-slate-200 dark:border-white/5">
                      <span className="text-slate-600 dark:text-slate-400">Gateway Observed Net</span> 
                      <span className="text-slate-900 dark:text-white font-medium">{formatCurrency(ev.verification.observed)}</span>
                   </div>
                   <div className="flex justify-between p-6 border-b border-slate-200 dark:border-white/5 bg-primary/5">
                      <span className="text-primary font-bold">AI Proposed Adjustment</span> 
                      <span className="text-primary font-bold text-xl">{ev.hypothesis?.proposed_adjustment_amount > 0 ? '+' : ''}{formatCurrency(ev.hypothesis?.proposed_adjustment_amount)}</span>
                   </div>
                   <div className="flex justify-between p-8 bg-slate-100 dark:bg-white/5 text-xl items-center">
                      <span className="text-slate-900 dark:text-white font-bold">Reconciled Total</span>
                      <span className="flex items-center gap-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ev.verification.observed + (ev.hypothesis?.proposed_adjustment_amount || 0))}
                        {ev.verification.status === 'PASS' ? 
                          <span className="px-3 py-1 rounded-lg text-sm bg-success/20 text-success border border-success/30 flex items-center gap-1.5 uppercase tracking-widest"><CheckCircle2 className="w-4 h-4"/> Proof Valid</span> : 
                          <span className="px-3 py-1 rounded-lg text-sm bg-danger/20 text-danger border border-danger/30 flex items-center gap-1.5 uppercase tracking-widest"><AlertTriangle className="w-4 h-4"/> Proof Failed</span>}
                      </span>
                   </div>
                </div>
              ) : (
                <p className="text-slate-500 italic flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Verification data unavailable.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Governance Action Panel */}
            <div className={`p-10 rounded-[2.5rem] border relative overflow-hidden
               ${status === 'HUMAN_APPROVAL' ? 'bg-gradient-to-br from-indigo-100 to-white dark:from-[#1e1b4b] dark:to-[#0f172a] border-primary/30' : 
                 status === 'SAFE_AUTO_RESOLUTION' ? 'bg-gradient-to-br from-emerald-100 to-white dark:from-[#064e3b] dark:to-[#0f172a] border-success/30' : 
                 'bg-gradient-to-br from-red-100 to-white dark:from-[#450a0a] dark:to-[#0f172a] border-danger/30'}`}>
               
               <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Governance Engine</h2>
               <p className="text-sm text-slate-700 dark:text-slate-300 opacity-90 mb-8 leading-relaxed">Execution strictly controlled by materiality & confidence thresholds set by finance leaders.</p>
               
               {status === 'HUMAN_APPROVAL' ? (
                 <div className="space-y-4 relative z-10">
                   <button onClick={() => handleAction('approve')} className="w-full py-5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-[0_0_30px_rgba(26,86,219,0.3)] transition-all flex items-center justify-center gap-3 hover:-translate-y-1">
                     <CheckCircle2 className="w-5 h-5"/> Execute Adjustment
                   </button>
                   <button onClick={() => handleAction('reject')} className="w-full py-5 rounded-2xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold transition-all">
                     Reject & Investigate
                   </button>
                 </div>
               ) : status === 'SAFE_AUTO_RESOLUTION' || status === 'HUMAN_APPROVED' ? (
                 <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-100 dark:bg-black/20 rounded-3xl border border-success/20">
                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-8 h-8 text-success" />
                    </div>
                    <p className="text-success font-bold text-2xl mb-2">{status === 'HUMAN_APPROVED' ? 'Human Approved' : 'Auto-Resolved'}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">Adjustment securely applied to ledger.</p>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-100 dark:bg-black/20 rounded-3xl border border-danger/20">
                    <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mb-4">
                      <ShieldAlert className="w-8 h-8 text-danger" />
                    </div>
                    <p className="text-danger font-bold text-2xl mb-2 tracking-tight leading-tight">Escalated to Human</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">Ambiguous case blocked from auto-resolution.</p>
                 </div>
               )}
            </div>

            <div className="glass-card p-8 rounded-[2.5rem]">
              <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Transaction Graph</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Entities provided to the AI Engine for reasoning.</p>
              {ev && ev.nodes ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {ev.nodes.map((n: string, idx: number) => (
                    <div key={idx} className="px-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-mono truncate border border-slate-200 dark:border-white/5 hover:border-primary/40 transition-all cursor-default text-slate-800 dark:text-slate-300" title={n}>
                      {n}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Graph context missing.</p>
              )}
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
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">Audit Trail</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg">Immutable log of all automated and manual governance actions.</p>
        </div>
        <button onClick={() => {
            fetch('http://localhost:8000/api/audit').then(r => r.json()).then(data => setAuditEvents(data))
          }} className="px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl font-bold transition-colors">
          Refresh Log
        </button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-300 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-300 dark:border-white/10">
              <tr>
                <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Timestamp</th>
                <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Event ID</th>
                <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Record Ref</th>
                <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Action</th>
                <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Confidence</th>
                <th className="p-6 font-semibold text-slate-700 dark:text-slate-300">Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {auditEvents.map((e: any) => (
                <tr key={e.event_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-6 text-slate-600 dark:text-slate-400 text-xs font-mono">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">{e.event_id}</td>
                  <td className="p-6 text-primary cursor-pointer hover:underline font-medium" onClick={() => navigateToException(e.record_id)}>{e.record_id}</td>
                  <td className="p-6">
                    <span className={`text-[10px] uppercase px-3 py-1.5 rounded-md font-bold tracking-widest
                      ${e.action.includes('APPROVE') || e.action.includes('SAFE') ? 'bg-success/10 text-success border border-success/20' : 
                        e.action.includes('REJECT') ? 'bg-danger/10 text-danger border border-danger/20' : 
                        'bg-warning/10 text-warning border border-warning/20'}`}>
                      {e.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-6 text-slate-700 dark:text-slate-300 font-mono font-medium">{(e.confidence * 100).toFixed(1)}%</td>
                  <td className="p-6 text-slate-500 font-mono text-[10px] truncate max-w-[150px]" title={e.record_hash}>{e.record_hash}</td>
                </tr>
              ))}
              {auditEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium text-lg">No audit events recorded yet.</td>
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
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
         <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] mix-blend-screen animate-blob" style={{ animationDelay: '2s' }}></div>
         <div className="absolute -bottom-1/4 left-1/3 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <header className="border-b border-slate-200 dark:border-white/5 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[90rem] mx-auto h-20 flex items-center justify-between px-6 md:px-10">
           <div className="flex items-center gap-4 font-extrabold text-2xl tracking-tight cursor-pointer group" onClick={() => setCurrentView('dashboard')}>
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(26,86,219,0.5)] group-hover:shadow-[0_0_25px_rgba(26,86,219,0.7)] transition-all duration-300">
               <Activity className="w-6 h-6" />
             </div>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">FinEx</span>
           </div>
           
           <nav className="flex items-center gap-8">
             <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white transition-colors">
               {isDark ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
             </button>
             <button onClick={() => setCurrentView('dashboard')} className={`text-base font-bold transition-colors ${currentView === 'dashboard' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Dashboard</button>
             <button onClick={() => setCurrentView('audit')} className={`text-base font-bold transition-colors ${currentView === 'audit' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Audit Trail</button>
           </nav>
        </div>
      </header>
      
      <main className="relative z-10 pt-4">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'exception' && <ExceptionView />}
        {currentView === 'cluster' && <ClusterView />}
        {currentView === 'audit' && <AuditView />}
      </main>
    </div>
  )
}

export default App
