import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, FileSearch, ShieldAlert, ShieldCheck } from 'lucide-react'

// Basic layout and navigation
function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedException, setSelectedException] = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)
  
  const [dashboardData, setDashboardData] = useState(null)
  const [clusters, setClusters] = useState([])
  const [exceptions, setExceptions] = useState([])
  
  // Fetch data
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
  }, [])

  const navigateToException = (excId) => {
    fetch(`http://localhost:8000/api/exceptions/${excId}`)
      .then(r => r.json())
      .then(data => {
        setSelectedException(data)
        setCurrentView('exception')
      })
  }

  const navigateToCluster = (clusterId) => {
    fetch(`http://localhost:8000/api/clusters/${clusterId}`)
      .then(r => r.json())
      .then(data => {
        setSelectedCluster(data)
        setCurrentView('cluster')
      })
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0)

  // --- VIEWS ---

  const DashboardView = () => (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">FinEx Controller</h1>
          <p className="text-muted-foreground mt-2 text-lg">AI Finance Recon & Resolution Engine</p>
        </div>
      </div>
      
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border shadow-lg">
            <p className="text-sm font-medium text-muted-foreground mb-2">Books Confidence</p>
            <p className="text-4xl font-bold text-primary">{(dashboardData.books_confidence * 100).toFixed(1)}%</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border shadow-lg">
            <p className="text-sm font-medium text-muted-foreground mb-2">Proven Value</p>
            <p className="text-3xl font-semibold text-green-400">{formatCurrency(dashboardData.proven_value)}</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border shadow-lg border-orange-500/30">
            <p className="text-sm font-medium text-muted-foreground mb-2">Under Investigation</p>
            <p className="text-3xl font-semibold text-orange-400">{formatCurrency(dashboardData.unresolved_value)}</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border shadow-lg border-red-500/30">
            <p className="text-sm font-medium text-muted-foreground mb-2">Total Exceptions</p>
            <p className="text-3xl font-semibold text-red-400">{dashboardData.total_exceptions}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2"><Activity className="text-primary"/> Systemic Root Causes</h2>
          <div className="space-y-3">
            {clusters.map(c => (
              <div key={c.cluster_id} onClick={() => navigateToCluster(c.cluster_id)} className="p-5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all hover:shadow-md hover:shadow-primary/10 flex justify-between items-center group">
                <div>
                  <h3 className="text-lg font-medium text-white group-hover:text-primary transition-colors">{c.name.replace(/_/g, ' ')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{c.exception_count} transactions affected</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-400">{formatCurrency(c.total_impact)}</p>
                  <ChevronRight className="inline-block text-muted-foreground mt-1 h-5 w-5"/>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2"><AlertTriangle className="text-orange-500"/> Major Exceptions</h2>
          <div className="space-y-3">
            {exceptions.slice(0, 5).map(e => (
              <div key={e.exception_id} onClick={() => navigateToException(e.exception_id)} className="p-4 rounded-xl bg-card border border-border hover:border-orange-500/50 cursor-pointer transition-all flex justify-between items-center group">
                <div>
                  <h3 className="font-medium text-white">{e.exception_id}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Order: {e.order_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-400">{formatCurrency(e.financial_impact)}</p>
                  <span className="text-[10px] uppercase px-2 py-1 bg-secondary rounded-full mt-2 inline-block">{e.status.replace(/_/g, ' ')}</span>
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
    const { exception_id, order_id, financial_impact, status, root_cause_category, confidence, evidence_package: ev } = selectedException
    
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center text-muted-foreground hover:text-white transition-colors mb-4"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</button>
        
        <div className="flex justify-between items-start border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{exception_id}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                ${status === 'SAFE_AUTO_RESOLUTION' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                  status === 'UNRESOLVED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                  'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-lg">Variance: <span className="text-red-400 font-semibold">{formatCurrency(financial_impact)}</span> | Order: {order_id}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><FileSearch className="text-primary"/> AI Investigation</h2>
              {ev && ev.hypothesis ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Root Cause</h3>
                    <p className="text-lg font-medium text-white">{ev.hypothesis.root_cause_hypothesis}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Explanation</h3>
                    <p className="text-gray-300 leading-relaxed">{ev.hypothesis.explanation}</p>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <div className="bg-secondary px-4 py-2 rounded-lg">
                      <span className="block text-xs text-muted-foreground">Confidence</span>
                      <span className="font-bold text-primary">{(ev.hypothesis.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-secondary px-4 py-2 rounded-lg">
                      <span className="block text-xs text-muted-foreground">Category</span>
                      <span className="font-bold text-white">{ev.hypothesis.root_cause_category}</span>
                    </div>
                  </div>
                </div>
              ) : (
                 <p className="text-muted-foreground italic">AI hypothesis unavailable or parsing failed.</p>
              )}
            </div>

            <div className="p-6 rounded-xl bg-card border border-border shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><ShieldCheck className="text-green-500"/> Deterministic Verification</h2>
              {ev && ev.verification ? (
                <div className="space-y-4 font-mono text-sm bg-black/40 p-4 rounded-lg border border-border/50">
                   <div className="flex justify-between border-b border-border/50 pb-2"><span>Expected Net:</span> <span>{formatCurrency(ev.verification.expected)}</span></div>
                   <div className="flex justify-between border-b border-border/50 py-2"><span>Observed Net:</span> <span>{formatCurrency(ev.verification.observed)}</span></div>
                   <div className="flex justify-between border-b border-border/50 py-2 text-primary"><span>Proposed Adj:</span> <span>{ev.hypothesis?.proposed_adjustment_amount > 0 ? '+' : ''}{formatCurrency(ev.hypothesis?.proposed_adjustment_amount)}</span></div>
                   <div className="flex justify-between pt-2 text-white font-bold">
                      <span>Verified Total:</span>
                      <span className="flex items-center gap-2">
                        {formatCurrency(ev.verification.observed + (ev.hypothesis?.proposed_adjustment_amount || 0))}
                        {ev.verification.status === 'PASS' ? <CheckCircle2 className="text-green-500 h-4 w-4"/> : <AlertTriangle className="text-red-500 h-4 w-4"/>}
                      </span>
                   </div>
                   <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      Result: <span className={ev.verification.status === 'PASS' ? 'text-green-400' : 'text-red-400'}>{ev.verification.status}</span>
                      <br/>Reason: {ev.verification.reason}
                   </div>
                </div>
              ) : (
                <p className="text-muted-foreground italic">Verification data unavailable.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h2 className="text-lg font-semibold mb-4">Transaction Graph</h2>
              {ev && ev.nodes ? (
                <div className="space-y-2">
                  {ev.nodes.map(n => (
                    <div key={n} className="px-3 py-2 bg-secondary rounded text-xs font-mono truncate border border-border/50 hover:border-primary/50 transition-colors cursor-default" title={n}>
                      {n}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Graph context missing.</p>
              )}
            </div>

            <div className="p-6 rounded-xl bg-card border border-border bg-gradient-to-br from-card to-secondary/30">
               <h2 className="text-lg font-semibold mb-4">Governance Action</h2>
               <p className="text-sm text-muted-foreground mb-4">System recommends based on confidence and materiality thresholds.</p>
               {status === 'HUMAN_APPROVAL' ? (
                 <div className="space-y-3">
                   <button className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">Approve Resolution</button>
                   <button className="w-full py-2.5 rounded-lg bg-secondary text-white font-semibold hover:bg-secondary/80 transition-colors">Reject / Keep Unresolved</button>
                 </div>
               ) : status === 'SAFE_AUTO_RESOLUTION' ? (
                 <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium text-center">
                    Safely Auto-Resolved by Engine
                 </div>
               ) : (
                 <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium text-center">
                    Human Investigation Required
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
      <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
        <button onClick={() => setCurrentView('dashboard')} className="flex items-center text-muted-foreground hover:text-white transition-colors mb-4"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Dashboard</button>
        
        <div className="flex flex-col items-center text-center py-10 bg-card border border-border rounded-2xl shadow-xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
           <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Systemic Root Cause</h2>
           <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">{selectedCluster.name.replace(/_/g, ' ')}</h1>
           <div className="flex gap-6">
             <div className="text-center">
               <p className="text-sm text-muted-foreground">Financial Impact</p>
               <p className="text-3xl font-bold text-orange-400">{formatCurrency(selectedCluster.total_impact)}</p>
             </div>
             <div className="w-px h-12 bg-border"></div>
             <div className="text-center">
               <p className="text-sm text-muted-foreground">Affected Records</p>
               <p className="text-3xl font-bold text-white">{selectedCluster.exception_count}</p>
             </div>
           </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold">Affected Exceptions</h3>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="p-4 font-medium text-muted-foreground">Exception ID</th>
                  <th className="p-4 font-medium text-muted-foreground">Order ID</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">Variance</th>
                  <th className="p-4 font-medium text-muted-foreground text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {selectedCluster.exceptions.map(e => (
                  <tr key={e.exception_id} className="hover:bg-secondary/20 cursor-pointer transition-colors" onClick={() => navigateToException(e.exception_id)}>
                    <td className="p-4 font-medium text-white">{e.exception_id}</td>
                    <td className="p-4 text-muted-foreground">{e.order_id}</td>
                    <td className="p-4 text-right font-semibold text-red-400">{formatCurrency(e.financial_impact)}</td>
                    <td className="p-4 text-center">
                       <span className={`text-[10px] uppercase px-2 py-1 rounded-full ${e.status === 'SAFE_AUTO_RESOLUTION' ? 'bg-green-500/20 text-green-400' : e.status === 'UNRESOLVED' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
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
    )
  }

  return (
    <div className="min-h-screen bg-background dark selection:bg-primary/30 text-foreground pb-20">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-16 flex items-center px-8">
           <div className="flex items-center gap-2 font-bold text-xl tracking-tight cursor-pointer" onClick={() => setCurrentView('dashboard')}>
             <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">F</div>
             <span>FinEx</span>
           </div>
        </div>
      </header>
      <main>
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'exception' && <ExceptionView />}
        {currentView === 'cluster' && <ClusterView />}
      </main>
    </div>
  )
}

export default App
