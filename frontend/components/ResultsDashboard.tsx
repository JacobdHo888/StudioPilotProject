import React, { useState } from 'react';
import { PipelineState } from '../types.ts';
import { 
  FileText, 
  Search, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  Link as LinkIcon, 
  Loader2, 
  CheckCircle2, 
  LayoutDashboard, 
  MapPin, 
  Users, 
  ShieldAlert, 
  Clapperboard,
  Activity,
  Clock,
  AlertCircle,
  ArrowRight,
  XCircle
} from 'lucide-react';

interface Props {
  state: PipelineState;
  error: string | null;
  onRecheck: () => void;
}

export const ResultsDashboard: React.FC<Props> = ({ state, error, onRecheck }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'script' | 'research' | 'plan' | 'risks' | 'changes'>('overview');

  const hasData = state.scriptAnalyst.data !== null;
  const isRunning = Object.values(state).some(agent => agent.status === 'running');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, available: hasData },
    { id: 'script', label: 'Script Data', icon: FileText, available: state.scriptAnalyst.data !== null },
    { id: 'research', label: 'Research', icon: Search, available: state.researchAgent.data !== null || state.researchAgent.logs.length > 0 },
    { id: 'plan', label: 'Schedule', icon: Calendar, available: state.productionPlanner.data !== null },
    { id: 'risks', label: 'Risks', icon: ShieldAlert, available: state.riskAnalyst.data !== null },
    { id: 'changes', label: 'Monitor', icon: RefreshCw, available: state.changeMonitor.data !== null },
  ] as const;

  // Calculate summary metrics
  const totalScenes = state.scriptAnalyst.data?.length || 0;
  const totalDays = state.productionPlanner.data?.length || 0;
  const highRisks = state.riskAnalyst.data?.filter(r => r.severity === 'High').length || 0;
  const totalLocations = new Set(state.scriptAnalyst.data?.flatMap(s => s.locations) || []).size;

  // Determine active agent for loading state
  const activeAgentEntry = Object.entries(state).find(([_, agent]) => agent.status === 'running');
  const activeAgentKey = activeAgentEntry ? activeAgentEntry[0] : null;
  
  const agentDisplayNames: Record<string, string> = {
    scriptAnalyst: 'Script Analyst',
    researchAgent: 'Research Agent',
    productionPlanner: 'Production Planner',
    riskAnalyst: 'Risk Analyst',
    changeMonitor: 'Change Monitor'
  };

  const agentDescriptions: Record<string, string> = {
    scriptAnalyst: 'Extracting scenes, characters, and dependencies from the screenplay...',
    researchAgent: 'Querying Parallel Search API for real-world logistical constraints...',
    productionPlanner: 'Synthesizing data into an optimized shooting schedule...',
    riskAnalyst: 'Evaluating the schedule for safety and logistical risks...',
    changeMonitor: 'Re-verifying facts and adapting the production plan...'
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-cinema-900/30 rounded-2xl border border-rose-500/30 p-8">
        <div className="bg-rose-500/10 p-4 rounded-full mb-4 shadow-lg border border-rose-500/20">
          <XCircle className="w-12 h-12 text-rose-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Pipeline Execution Failed</h3>
        <p className="text-sm text-gray-400 text-center max-w-lg mb-6">{error}</p>
        <div className="bg-cinema-800 p-4 rounded-lg border border-cinema-700 w-full max-w-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Troubleshooting Tips</p>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>Ensure the uploaded file is a valid screenplay format.</li>
            <li>Check if the Parallel Search API is reachable.</li>
            <li>Verify that the Gemini API key is correctly configured.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!hasData && !isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-cinema-900/30 rounded-2xl border border-cinema-800 border-dashed">
        <div className="bg-cinema-800 p-4 rounded-full mb-4 shadow-lg">
          <LayoutDashboard className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">Dashboard Ready</h3>
        <p className="text-sm max-w-md text-center">Upload a screenplay or use the sample text, then run the ADK pipeline to generate the production plan.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cinema-900 rounded-2xl border border-cinema-800 overflow-hidden shadow-2xl relative">
      
      {/* Top Summary Bar (Only show if we have data) */}
      {hasData && (
        <div className="grid grid-cols-4 divide-x divide-cinema-800 border-b border-cinema-800 bg-cinema-900/80">
          <div className="p-4 flex items-center gap-4">
            <div className="bg-blue-500/10 p-2 rounded-lg"><FileText className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Scenes</p>
              <p className="text-2xl font-bold text-gray-100">{totalScenes}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-2 rounded-lg"><Calendar className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Shoot Days</p>
              <p className="text-2xl font-bold text-gray-100">{totalDays || '-'}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="bg-amber-500/10 p-2 rounded-lg"><MapPin className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Unique Locations</p>
              <p className="text-2xl font-bold text-gray-100">{totalLocations}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="bg-rose-500/10 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-rose-400" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">High Risks</p>
              <p className="text-2xl font-bold text-gray-100">{state.riskAnalyst.data ? highRisks : '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-cinema-800 bg-[#0a0a0a] px-2 pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`flex items-center px-5 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 mb-[-1px]
                ${isActive ? 'text-blue-400 border-blue-500 bg-cinema-800/50' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-cinema-800/30'}
                ${!tab.available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a] custom-scrollbar relative">
        
        {/* Detailed Loading Overlay */}
        {isRunning && activeAgentKey && (
          <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8">
            <div className="bg-cinema-900 p-8 rounded-2xl border border-cinema-700 shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-20 animate-pulse"></div>
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">
                {agentDisplayNames[activeAgentKey]} is running
              </h3>
              <p className="text-sm text-gray-400 text-center mb-8">
                {agentDescriptions[activeAgentKey]}
              </p>
              
              <div className="space-y-3">
                {Object.entries(agentDisplayNames).map(([key, name]) => {
                  const status = state[key as keyof PipelineState].status;
                  // Only show agents relevant to the current flow (hide change monitor during initial run)
                  if (key === 'changeMonitor' && activeAgentKey !== 'changeMonitor' && status === 'idle') return null;
                  if (key !== 'changeMonitor' && activeAgentKey === 'changeMonitor') return null;

                  return (
                    <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${
                      status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20' :
                      status === 'running' ? 'bg-blue-500/10 border-blue-500/30' :
                      'bg-cinema-800/50 border-cinema-700/50'
                    }`}>
                      <span className={`text-sm font-medium ${
                        status === 'completed' ? 'text-emerald-400' :
                        status === 'running' ? 'text-blue-400' :
                        'text-gray-500'
                      }`}>{name}</span>
                      {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                      {status === 'idle' && <Clock className="w-4 h-4 text-gray-600" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && hasData && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-6">
              {/* Schedule Snapshot */}
              <div className="bg-cinema-900 border border-cinema-800 rounded-xl p-5 shadow-lg">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center"><Calendar className="w-4 h-4 mr-2 text-emerald-400"/> Schedule Snapshot</h3>
                {state.productionPlanner.data ? (
                  <div className="space-y-3">
                    {state.productionPlanner.data.slice(0, 3).map(day => (
                      <div key={day.dayNumber} className="flex items-center justify-between p-3 bg-cinema-800/50 rounded-lg border border-cinema-700/50">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-500/20 text-emerald-400 font-bold w-8 h-8 rounded flex items-center justify-center text-sm">D{day.dayNumber}</div>
                          <div className="text-sm text-gray-300 truncate max-w-[200px]">{day.locations.join(', ')}</div>
                        </div>
                        <div className="text-xs text-gray-500">{day.scenes.length} scenes</div>
                      </div>
                    ))}
                    {state.productionPlanner.data.length > 3 && (
                      <button onClick={() => setActiveTab('plan')} className="w-full py-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">View Full Schedule &rarr;</button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">Schedule generation pending...</div>
                )}
              </div>

              {/* Top Risks */}
              <div className="bg-cinema-900 border border-cinema-800 rounded-xl p-5 shadow-lg">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-rose-400"/> Critical Risks</h3>
                {state.riskAnalyst.data ? (
                  <div className="space-y-3">
                    {state.riskAnalyst.data.filter(r => r.severity === 'High' || r.severity === 'Medium').slice(0, 3).map((risk, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-cinema-800/50 rounded-lg border border-cinema-700/50">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${risk.severity === 'High' ? 'text-rose-400' : 'text-amber-400'}`} />
                        <div>
                          <p className="text-sm text-gray-200 font-medium line-clamp-1">{risk.description}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{risk.mitigation}</p>
                        </div>
                      </div>
                    ))}
                    {state.riskAnalyst.data.length > 3 && (
                      <button onClick={() => setActiveTab('risks')} className="w-full py-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">View All Risks &rarr;</button>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">Risk analysis pending...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCRIPT TAB */}
        {activeTab === 'script' && state.scriptAnalyst.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-500">
            {state.scriptAnalyst.data.map((scene, idx) => (
              <div key={idx} className="bg-cinema-900 p-5 rounded-xl border border-cinema-800 shadow-md hover:border-cinema-700 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-blue-400 text-lg">{scene.sceneNumber} - {scene.heading}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-cinema-800 px-2 py-1 rounded text-gray-400 border border-cinema-700">{scene.setting} • {scene.timeOfDay}</span>
                </div>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">{scene.summary}</p>
                
                <div className="space-y-3">
                  {scene.characters.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-1.5 flex items-center gap-1"><Users className="w-3 h-3"/> Characters</span>
                      <div className="flex flex-wrap gap-1.5">
                        {scene.characters.map(c => <span key={c} className="bg-cinema-800 border border-cinema-700 px-2 py-0.5 rounded text-xs text-gray-300">{c}</span>)}
                      </div>
                    </div>
                  )}
                  {(scene.props.length > 0 || scene.specialRequirements.length > 0) && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Props & Reqs</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[...scene.props, ...scene.specialRequirements].map(p => <span key={p} className="bg-amber-900/20 border border-amber-700/30 text-amber-400 px-2 py-0.5 rounded text-xs">{p}</span>)}
                      </div>
                    </div>
                  )}
                  {scene.dependencies && scene.dependencies.length > 0 && (
                    <div className="bg-blue-900/10 p-2.5 rounded-lg border border-blue-900/30 mt-2">
                      <span className="text-blue-400 text-xs font-semibold flex items-center mb-1.5 uppercase tracking-wider">
                        <LinkIcon className="w-3 h-3 mr-1.5" /> Dependencies
                      </span>
                      <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                        {scene.dependencies.map((dep, i) => <li key={i}>{dep}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESEARCH TAB */}
        {activeTab === 'research' && (state.researchAgent.data || state.researchAgent.logs.length > 0) && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {state.researchAgent.data && state.researchAgent.data.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {state.researchAgent.data.map((item, idx) => (
                  <div key={idx} className="bg-cinema-900 p-5 rounded-xl border border-cinema-800 shadow-md flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 shrink-0">
                      <h4 className="font-bold text-gray-100 mb-2 text-lg">{item.topic}</h4>
                      <div className="bg-cinema-800/50 p-2 rounded border border-cinema-700/50 mb-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Search Query</p>
                        <p className="text-xs text-blue-400 font-mono break-words">{item.query}</p>
                      </div>
                      <p className="text-xs text-amber-400 font-medium bg-amber-400/10 inline-block px-2 py-1 rounded border border-amber-400/20">Impact: {item.relevance}</p>
                    </div>
                    <div className="md:w-2/3 bg-cinema-800/30 p-4 rounded-lg border-l-2 border-blue-500">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2 flex items-center"><Search className="w-3 h-3 mr-1.5"/> Verified Findings</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{item.simulatedFindings}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-cinema-900/50 rounded-xl border border-cinema-800 border-dashed">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Logistical Constraints Found</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">The Research Agent analyzed the scenes and determined that no external verification (permits, weather, specialty equipment) was required for this script.</p>
              </div>
            )}
          </div>
        )}

        {/* PLAN TAB */}
        {activeTab === 'plan' && state.productionPlanner.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-in fade-in duration-500">
            {state.productionPlanner.data.map((day, idx) => (
              <div key={idx} className="bg-cinema-900 rounded-xl border border-cinema-800 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-cinema-800/80 p-4 border-b border-cinema-700 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-cinema-900 font-black text-xl w-10 h-10 rounded-lg flex items-center justify-center shadow-inner">
                      {day.dayNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-100">Shoot Day</h4>
                      <span className="text-xs text-emerald-400 font-medium">{day.estimatedHours} Hours Est.</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold flex items-center mb-1.5"><MapPin className="w-3 h-3 mr-1"/> Locations</span>
                    <p className="text-sm text-gray-200 font-medium">{day.locations.join(' • ')}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold flex items-center mb-1.5"><Clapperboard className="w-3 h-3 mr-1"/> Scenes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {day.scenes.map(s => <span key={s} className="bg-blue-900/30 border border-blue-700/50 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{s}</span>)}
                    </div>
                  </div>
                  <div className="mt-auto bg-cinema-800/50 p-3 rounded-lg border border-cinema-700/50">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Logistical Notes</span>
                    <p className="text-xs text-gray-400 italic leading-relaxed">{day.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === 'risks' && state.riskAnalyst.data && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {state.riskAnalyst.data.length > 0 ? (
              state.riskAnalyst.data.map((risk, idx) => (
                <div key={idx} className={`bg-cinema-900 p-5 rounded-xl border-l-4 shadow-md flex flex-col md:flex-row gap-4 ${
                  risk.severity === 'High' ? 'border-l-rose-500 border-y border-r border-cinema-800' : 
                  risk.severity === 'Medium' ? 'border-l-amber-500 border-y border-r border-cinema-800' : 'border-l-emerald-500 border-y border-r border-cinema-800'
                }`}>
                  <div className="md:w-1/3 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                        risk.severity === 'High' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                        risk.severity === 'Medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>{risk.severity} RISK</span>
                    </div>
                    <h4 className="font-bold text-gray-100 text-lg leading-tight mb-2">{risk.description}</h4>
                    <p className="text-xs text-gray-500 font-medium">Affected Scenes: <span className="text-gray-300">{risk.affectedScenes.join(', ')}</span></p>
                  </div>
                  <div className="md:w-2/3 bg-cinema-800/40 p-4 rounded-lg border border-cinema-700/50 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1.5 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500"/> Mitigation Strategy</span>
                    <p className="text-sm text-gray-300 leading-relaxed">{risk.mitigation}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-cinema-900/50 rounded-xl border border-cinema-800 border-dashed">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Significant Risks Identified</h3>
                <p className="text-sm text-gray-500 text-center max-w-md">The Risk Analyst reviewed the schedule and found no major logistical or safety concerns.</p>
              </div>
            )}
            
            {state.changeMonitor.status === 'idle' && (
              <div className="mt-8 pt-8 border-t border-cinema-800 text-center">
                <div className="inline-block bg-cinema-900 p-6 rounded-2xl border border-cinema-700 shadow-xl">
                  <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">Simulate Disruption</h4>
                  <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">Trigger the Change Monitor agent to simulate an unexpected event (e.g., weather, location loss) and dynamically re-evaluate the production plan.</p>
                  <button 
                    onClick={onRecheck}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 border border-blue-500"
                  >
                    Run Change Monitor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHANGES TAB */}
        {activeTab === 'changes' && state.changeMonitor.data && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-rose-500/10 border border-rose-500/30 p-6 rounded-2xl shadow-lg">
              <h3 className="text-rose-400 font-black text-xl flex items-center mb-3 uppercase tracking-wider">
                <AlertTriangle className="w-6 h-6 mr-2" />
                Disruption Detected
              </h3>
              <p className="text-gray-200 text-lg leading-relaxed">{state.changeMonitor.data.changeReason}</p>
            </div>

            {/* NEW: What Changed Section */}
            {state.changeMonitor.data.changedFacts && state.changeMonitor.data.changedFacts.length > 0 && (
              <div>
                <h4 className="font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center text-sm">
                  <Activity className="w-4 h-4 mr-2 text-amber-400"/> What Changed
                </h4>
                <div className="space-y-4">
                  {state.changeMonitor.data.changedFacts.map((fact, idx) => (
                    <div key={idx} className="bg-cinema-900 rounded-xl border border-cinema-700 shadow-md overflow-hidden">
                      <div className="bg-cinema-800/80 p-3 border-b border-cinema-700 flex justify-between items-center">
                        <span className="font-bold text-gray-200">{fact.topic}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Affected Scenes:</span>
                          <div className="flex gap-1">
                            {fact.affectedScenes.map(s => <span key={s} className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-xs font-bold">{s}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-cinema-700">
                        <div className="p-4 bg-cinema-900/50">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold flex items-center mb-2">
                            <Clock className="w-3 h-3 mr-1"/> Previous Finding
                          </span>
                          <p className="text-sm text-gray-400 line-through decoration-rose-500/50">{fact.previousFinding}</p>
                        </div>
                        <div className="p-4 bg-rose-900/10">
                          <span className="text-[10px] text-rose-400 uppercase tracking-wider font-bold flex items-center mb-2">
                            <AlertCircle className="w-3 h-3 mr-1"/> New Reality
                          </span>
                          <p className="text-sm text-gray-200 font-medium">{fact.newFinding}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center text-sm"><Calendar className="w-4 h-4 mr-2 text-blue-400"/> Adjusted Schedule</h4>
                <div className="space-y-3">
                  {state.changeMonitor.data.updatedPlan.map((day, idx) => (
                    <div key={idx} className="bg-cinema-900 p-4 rounded-xl border border-cinema-700 shadow-md flex justify-between items-center">
                      <div>
                        <span className="font-black text-blue-400 text-lg mr-3">D{day.dayNumber}</span>
                        <span className="text-sm text-gray-300 font-medium">{day.locations.join(', ')}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {day.scenes.map(s => <span key={s} className="bg-cinema-800 border border-cinema-600 text-gray-300 px-2 py-0.5 rounded text-xs font-bold">{s}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {state.changeMonitor.data.newRisks.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center text-sm"><ShieldAlert className="w-4 h-4 mr-2 text-amber-400"/> New Risks Introduced</h4>
                  <div className="space-y-3">
                    {state.changeMonitor.data.newRisks.map((risk, idx) => (
                      <div key={idx} className="bg-cinema-900 p-4 rounded-xl border-l-4 border-amber-500 border-y border-r border-cinema-700 shadow-md">
                        <p className="text-sm text-gray-100 font-bold mb-2">{risk.description}</p>
                        <div className="bg-cinema-800/50 p-2.5 rounded border border-cinema-700/50">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Mitigation</span>
                          <p className="text-xs text-gray-300">{risk.mitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
