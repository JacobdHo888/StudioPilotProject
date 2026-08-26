import React, { useState } from 'react';
import { PipelineState, RiskStatus } from '../types.ts';
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
  XCircle
} from 'lucide-react';

interface Props {
  state: PipelineState;
  error: string | null;
  onRecheck: () => void;
  onUpdateRisk: (id: string, status: RiskStatus, note?: string) => void;
}

export const ResultsDashboard: React.FC<Props> = ({ state, error, onRecheck, onUpdateRisk }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'script' | 'research' | 'plan' | 'risks' | 'changes'>('overview');

  const hasData = state.scriptAnalyst.data !== null;
  const isRunning = Object.values(state).some(agent => agent.status === 'running');
  
  const coreAgents = ['scriptAnalyst', 'researchAgent', 'productionPlanner', 'riskAnalyst', 'changeMonitor'] as const;
  const isCoreRunning = coreAgents.some(key => state[key].status === 'running');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, available: hasData },
    { id: 'script', label: 'Script Breakdown', icon: FileText, available: state.scriptAnalyst.data !== null },
    { id: 'research', label: 'Research Dossier', icon: Search, available: state.researchAgent.data !== null || state.researchAgent.logs.length > 0 },
    { id: 'plan', label: 'Call Sheets', icon: Calendar, available: state.productionPlanner.data !== null },
    { id: 'risks', label: 'Risk Matrix', icon: ShieldAlert, available: state.riskAnalyst.data !== null },
    { id: 'changes', label: 'Revisions', icon: RefreshCw, available: state.productionPlanner.data !== null },
  ] as const;

  const totalScenes = state.scriptAnalyst.data?.length || 0;
  const totalDays = state.productionPlanner.data?.length || 0;
  const highRisks = state.riskAnalyst.data?.filter(r => r.severity === 'High' && r.status !== 'Resolved').length || 0;
  const totalLocations = new Set(state.scriptAnalyst.data?.flatMap(s => s.locations) || []).size;

  const activeAgentEntry = Object.entries(state).find(([key, agent]) => coreAgents.includes(key as any) && agent.status === 'running');
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
      <div className="h-full flex flex-col items-center justify-center bg-studio-900/50 rounded-2xl border border-studio-danger/30 p-8 backdrop-blur-sm">
        <div className="bg-studio-danger/10 p-4 rounded-full mb-4 shadow-[0_0_30px_rgba(255,51,102,0.2)] border border-studio-danger/20">
          <XCircle className="w-12 h-12 text-studio-danger" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 font-mono uppercase tracking-widest">System Failure</h3>
        <p className="text-sm text-gray-400 text-center max-w-lg mb-6 font-mono">{error}</p>
        <div className="bg-studio-950 p-5 rounded-xl border border-studio-800 w-full max-w-lg shadow-inner">
          <p className="text-xs text-studio-gold uppercase tracking-widest font-bold mb-3 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Diagnostics</p>
          <ul className="text-xs text-gray-400 list-disc list-inside space-y-2 font-mono">
            <li>Verify screenplay format and encoding.</li>
            <li>Check Parallel Search API connectivity.</li>
            <li>Validate Gemini API key permissions.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!hasData && !isCoreRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-studio-900/40 rounded-2xl border border-studio-800 border-dashed backdrop-blur-sm">
        <div className="hud-corners p-8 flex flex-col items-center">
          <Clapperboard className="w-12 h-12 text-studio-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-300 mb-2 font-mono uppercase tracking-widest">Standby for Input</h3>
          <p className="text-xs max-w-md text-center text-gray-500 font-mono">Upload a screenplay to initialize the ADK pipeline and generate the production matrix.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-studio-900/90 backdrop-blur-md rounded-2xl border border-studio-700 overflow-hidden shadow-2xl relative">
      
      {/* Top Summary Bar (HUD Style) */}
      {hasData && (
        <div className="grid grid-cols-4 divide-x divide-studio-800 border-b border-studio-700 bg-studio-950/80">
          <div className="p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-studio-accent/50"></div>
            <div className="bg-studio-accent/10 p-2.5 rounded-lg border border-studio-accent/20"><FileText className="w-5 h-5 text-studio-accent" /></div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">Total Scenes</p>
              <p className="text-2xl font-bold text-white font-mono">{totalScenes}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-studio-success/50"></div>
            <div className="bg-studio-success/10 p-2.5 rounded-lg border border-studio-success/20"><Calendar className="w-5 h-5 text-studio-success" /></div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">Shoot Days</p>
              <p className="text-2xl font-bold text-white font-mono">{totalDays || '-'}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-studio-gold/50"></div>
            <div className="bg-studio-gold/10 p-2.5 rounded-lg border border-studio-gold/20"><MapPin className="w-5 h-5 text-studio-gold" /></div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">Locations</p>
              <p className="text-2xl font-bold text-white font-mono">{totalLocations}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-studio-danger/50"></div>
            <div className="bg-studio-danger/10 p-2.5 rounded-lg border border-studio-danger/20"><AlertTriangle className="w-5 h-5 text-studio-danger" /></div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">Open Risks</p>
              <p className="text-2xl font-bold text-white font-mono">{state.riskAnalyst.data ? highRisks : '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-studio-700 bg-studio-950 px-4 pt-3 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`flex items-center px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all rounded-t-lg border-t border-x mb-[-1px] font-mono
                ${isActive ? 'text-studio-accent border-studio-700 bg-studio-900 shadow-[0_-4px_10px_rgba(0,229,255,0.05)]' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-studio-800/50'}
                ${!tab.available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon className="w-3.5 h-3.5 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-studio-900 custom-scrollbar relative">
        
        {/* Detailed Loading Overlay */}
        {isCoreRunning && activeAgentKey && (
          <div className="absolute inset-0 bg-studio-950/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-8">
            <div className="hud-corners p-10 bg-studio-900/80 border border-studio-700 shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-studio-accent rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <Loader2 className="w-14 h-14 text-studio-accent animate-spin relative z-10" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2 font-mono uppercase tracking-widest">
                {agentDisplayNames[activeAgentKey]}
              </h3>
              <p className="text-xs text-studio-accent text-center mb-8 font-mono uppercase tracking-widest animate-pulse">
                {agentDescriptions[activeAgentKey]}
              </p>
              
              <div className="space-y-3">
                {Object.entries(agentDisplayNames).map(([key, name]) => {
                  const status = state[key as keyof PipelineState].status;
                  if (key === 'changeMonitor' && activeAgentKey !== 'changeMonitor' && status === 'idle') return null;
                  if (key !== 'changeMonitor' && activeAgentKey === 'changeMonitor') return null;

                  return (
                    <div key={key} className={`flex items-center justify-between p-3 rounded border font-mono text-xs uppercase tracking-widest ${
                      status === 'completed' ? 'bg-studio-success/10 border-studio-success/30 text-studio-success' :
                      status === 'running' ? 'bg-studio-accent/10 border-studio-accent/50 text-studio-accent shadow-[0_0_10px_rgba(0,229,255,0.2)]' :
                      'bg-studio-950 border-studio-800 text-gray-600'
                    }`}>
                      <span>{name}</span>
                      {status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                      {status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {status === 'idle' && <Clock className="w-4 h-4" />}
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
              <div className="bg-studio-950 border border-studio-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-studio-success/50"></div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center font-mono"><Calendar className="w-4 h-4 mr-2 text-studio-success"/> Schedule Snapshot</h3>
                {state.productionPlanner.data ? (
                  <div className="space-y-3">
                    {state.productionPlanner.data.slice(0, 3).map(day => (
                      <div key={day.dayNumber} className="flex items-center justify-between p-3 bg-studio-900 rounded border border-studio-800">
                        <div className="flex items-center gap-4">
                          <div className="bg-studio-success/20 text-studio-success font-bold w-10 h-10 rounded flex items-center justify-center text-sm font-mono border border-studio-success/30">D{day.dayNumber}</div>
                          <div className="text-sm text-gray-200 truncate max-w-[200px] font-medium">{day.locations.join(', ')}</div>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{day.scenes.length} SCENES</div>
                      </div>
                    ))}
                    {state.productionPlanner.data.length > 3 && (
                      <button onClick={() => setActiveTab('plan')} className="w-full py-3 mt-2 text-xs text-studio-accent hover:text-white font-bold uppercase tracking-widest transition-colors border border-studio-800 rounded bg-studio-900 hover:bg-studio-800">View Full Schedule</button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 font-mono uppercase tracking-widest">Generation pending...</div>
                )}
              </div>

              {/* Top Risks */}
              <div className="bg-studio-950 border border-studio-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-studio-danger/50"></div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center font-mono"><ShieldAlert className="w-4 h-4 mr-2 text-studio-danger"/> Critical Risks</h3>
                {state.riskAnalyst.data ? (
                  <div className="space-y-3">
                    {state.riskAnalyst.data.filter(r => r.severity === 'High' && r.status !== 'Resolved').slice(0, 3).map((risk, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-studio-900 rounded border border-studio-danger/30">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-studio-danger" />
                        <div>
                          <p className="text-sm text-gray-200 font-medium line-clamp-1">{risk.description}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{risk.mitigation}</p>
                        </div>
                      </div>
                    ))}
                    {state.riskAnalyst.data.length > 3 && (
                      <button onClick={() => setActiveTab('risks')} className="w-full py-3 mt-2 text-xs text-studio-accent hover:text-white font-bold uppercase tracking-widest transition-colors border border-studio-800 rounded bg-studio-900 hover:bg-studio-800">View Risk Matrix</button>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-600 font-mono uppercase tracking-widest">Analysis pending...</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCRIPT TAB */}
        {activeTab === 'script' && state.scriptAnalyst.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {state.scriptAnalyst.data.map((scene, idx) => (
              <div key={idx} className="bg-studio-950 p-6 rounded-xl border border-studio-700 shadow-lg relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-studio-accent/50"></div>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-script font-bold text-studio-accent text-lg tracking-tight">{scene.sceneNumber} - {scene.heading}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-studio-900 px-2.5 py-1 rounded text-gray-400 border border-studio-700 font-mono">{scene.setting} • {scene.timeOfDay}</span>
                </div>
                <p className="text-sm text-gray-300 mb-5 leading-relaxed font-script bg-studio-900/50 p-3 rounded border border-studio-800">{scene.summary}</p>
                
                <div className="space-y-4">
                  {scene.characters.length > 0 && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-2 flex items-center gap-1.5 font-mono"><Users className="w-3.5 h-3.5"/> Characters</span>
                      <div className="flex flex-wrap gap-2">
                        {scene.characters.map(c => <span key={c} className="bg-studio-800 border border-studio-700 px-2.5 py-1 rounded text-xs text-gray-200 font-medium">{c}</span>)}
                      </div>
                    </div>
                  )}
                  {(scene.props.length > 0 || scene.specialRequirements.length > 0) && (
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-2 font-mono">Props & Reqs</span>
                      <div className="flex flex-wrap gap-2">
                        {[...scene.props, ...scene.specialRequirements].map(p => <span key={p} className="bg-studio-gold/10 border border-studio-gold/30 text-studio-gold px-2.5 py-1 rounded text-xs font-medium">{p}</span>)}
                      </div>
                    </div>
                  )}
                  {scene.dependencies && scene.dependencies.length > 0 && (
                    <div className="bg-studio-accent/5 p-3 rounded border border-studio-accent/20 mt-3">
                      <span className="text-studio-accent text-[10px] font-bold flex items-center mb-2 uppercase tracking-widest font-mono">
                        <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Dependencies
                      </span>
                      <ul className="list-disc list-inside text-xs text-gray-300 space-y-1.5 font-mono">
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
              <div className="grid grid-cols-1 gap-6">
                {state.researchAgent.data.map((item, idx) => (
                  <div key={idx} className="bg-studio-950 p-6 rounded-xl border border-studio-700 shadow-lg flex flex-col md:flex-row gap-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-studio-gold/50"></div>
                    <div className="md:w-1/3 shrink-0">
                      <h4 className="font-bold text-white mb-3 text-lg font-mono uppercase tracking-tight">{item.topic}</h4>
                      <div className="bg-studio-900 p-3 rounded border border-studio-800 mb-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Search Query</p>
                        <p className="text-xs text-studio-accent font-mono break-words">{item.query}</p>
                      </div>
                      <p className="text-[10px] text-studio-gold font-bold uppercase tracking-widest bg-studio-gold/10 inline-block px-2.5 py-1 rounded border border-studio-gold/20">Impact: {item.relevance}</p>
                    </div>
                    <div className="md:w-2/3 bg-studio-900 p-5 rounded-lg border border-studio-800 flex flex-col">
                      {item.status === 'timeout' || item.status === 'error' ? (
                        <div className="bg-studio-danger/10 p-4 rounded border border-studio-danger/30 flex items-start gap-3 h-full">
                          <AlertTriangle className="w-5 h-5 text-studio-danger shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-studio-danger font-mono uppercase tracking-widest mb-2">Research Incomplete</p>
                            <p className="text-xs text-gray-400 font-mono leading-relaxed">The Parallel Search API {item.status === 'timeout' ? 'timed out' : 'encountered an error'} while verifying this constraint. Proceeding with unverified assumptions.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 flex items-center font-mono"><Search className="w-3.5 h-3.5 mr-2 text-studio-accent"/> Verified Findings</p>
                          <p className="text-sm text-gray-200 leading-relaxed mb-5 font-mono">{item.simulatedFindings}</p>
                          
                          {/* Source Attribution */}
                          <div className="mt-auto bg-studio-950 p-4 rounded border border-studio-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center font-mono">
                                <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Source
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1.5" /> {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                            {item.sourceUrl && (
                              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-studio-accent hover:underline truncate block mb-2.5 font-mono">
                                {item.sourceUrl}
                              </a>
                            )}
                            {item.excerpt && (
                              <p className="text-xs text-gray-400 italic border-l-2 border-studio-600 pl-3 py-1 font-script">"{item.excerpt}"</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 bg-studio-950 rounded-xl border border-studio-800 border-dashed">
                <CheckCircle2 className="w-16 h-16 text-studio-success mb-5 opacity-50" />
                <h3 className="text-xl font-bold text-gray-200 mb-2 font-mono uppercase tracking-widest">No Logistical Constraints</h3>
                <p className="text-sm text-gray-500 text-center max-w-md font-mono">The Research Agent analyzed the scenes and determined that no external verification was required for this script.</p>
              </div>
            )}
          </div>
        )}

        {/* PLAN TAB */}
        {activeTab === 'plan' && state.productionPlanner.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {state.productionPlanner.data.map((day, idx) => (
              <div key={idx} className="bg-studio-950 rounded-xl border border-studio-700 shadow-lg overflow-hidden flex flex-col">
                <div className="bg-studio-900 p-5 border-b border-studio-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-studio-success text-studio-950 font-black text-2xl w-12 h-12 rounded flex items-center justify-center shadow-inner font-mono">
                      {day.dayNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-white uppercase tracking-widest text-sm font-mono">Shoot Day</h4>
                      <span className="text-xs text-studio-success font-bold font-mono">{day.estimatedHours} Hours Est.</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center mb-2 font-mono"><MapPin className="w-3.5 h-3.5 mr-1.5"/> Locations</span>
                    <p className="text-sm text-gray-200 font-medium leading-relaxed">{day.locations.join(' • ')}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center mb-2 font-mono"><Clapperboard className="w-3.5 h-3.5 mr-1.5"/> Scenes</span>
                    <div className="flex flex-wrap gap-2">
                      {day.scenes.map(s => <span key={s} className="bg-studio-accent/10 border border-studio-accent/30 text-studio-accent px-2.5 py-1 rounded text-xs font-bold font-mono">{s}</span>)}
                    </div>
                  </div>
                  <div className="mt-auto bg-studio-900 p-4 rounded border border-studio-800">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">Logistical Notes</span>
                    <p className="text-xs text-gray-400 italic leading-relaxed font-script">{day.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RISKS TAB */}
        {activeTab === 'risks' && state.riskAnalyst.data && (
          <div className="space-y-5 animate-in fade-in duration-500">
            {state.riskAnalyst.data.length > 0 ? (
              state.riskAnalyst.data.map((risk, idx) => {
                const isResolved = risk.status === 'Resolved';
                return (
                  <div key={risk.id || idx} className={`bg-studio-950 p-6 rounded-xl border-l-4 shadow-lg flex flex-col gap-5 transition-all ${
                    isResolved ? 'opacity-50 border-l-gray-600 bg-studio-950/50' : 
                    risk.severity === 'High' ? 'border-l-studio-danger border-y border-r border-studio-700 bg-warning-stripes' : 
                    risk.severity === 'Medium' ? 'border-l-studio-gold border-y border-r border-studio-700 bg-warning-stripes-amber' : 'border-l-studio-success border-y border-r border-studio-700'
                  }`}>
                    <div className="flex flex-col md:flex-row gap-6 relative z-10">
                      <div className="md:w-1/3 shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-widest font-mono ${
                            isResolved ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                            risk.severity === 'High' ? 'bg-studio-danger/20 text-studio-danger border border-studio-danger/30' : 
                            risk.severity === 'Medium' ? 'bg-studio-gold/20 text-studio-gold border border-studio-gold/30' : 'bg-studio-success/20 text-studio-success border border-studio-success/30'
                          }`}>{risk.severity} RISK</span>
                          {isResolved && <span className="text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-widest bg-studio-800 text-gray-400 border border-studio-700 font-mono">Resolved</span>}
                        </div>
                        <h4 className={`font-bold text-lg leading-tight mb-3 ${isResolved ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-100'}`}>{risk.description}</h4>
                        {!isResolved && <p className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">Affected Scenes: <span className="text-gray-200">{risk.affectedScenes.join(', ')}</span></p>}
                      </div>
                      {!isResolved && (
                        <div className="md:w-2/3 bg-studio-900 p-5 rounded border border-studio-800 flex flex-col justify-center">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 flex items-center font-mono"><CheckCircle2 className="w-4 h-4 mr-2 text-studio-success"/> Mitigation Strategy</span>
                          <p className="text-sm text-gray-200 leading-relaxed font-mono">{risk.mitigation}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Status & Note Controls */}
                    <div className="mt-2 pt-4 border-t border-studio-800 flex items-center gap-4 relative z-10">
                      <select 
                        value={risk.status} 
                        onChange={(e) => onUpdateRisk(risk.id, e.target.value as any, risk.resolutionNote)}
                        className="bg-studio-900 border border-studio-700 text-xs rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-studio-accent font-mono uppercase tracking-widest font-bold cursor-pointer"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Add resolution note (e.g. 'Permits Coordinator assigned')..." 
                        defaultValue={risk.resolutionNote || ''}
                        onBlur={(e) => onUpdateRisk(risk.id, risk.status, e.target.value)}
                        className="flex-1 bg-studio-900 border border-studio-700 rounded px-4 py-2 text-xs text-gray-300 focus:border-studio-accent focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-16 bg-studio-950 rounded-xl border border-studio-800 border-dashed">
                <CheckCircle2 className="w-16 h-16 text-studio-success mb-5 opacity-50" />
                <h3 className="text-xl font-bold text-gray-200 mb-2 font-mono uppercase tracking-widest">No Significant Risks</h3>
                <p className="text-sm text-gray-500 text-center max-w-md font-mono">The Risk Analyst reviewed the schedule and found no major logistical or safety concerns.</p>
              </div>
            )}
          </div>
        )}

        {/* CHANGES TAB (PLAN HISTORY) */}
        {activeTab === 'changes' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header with button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-studio-950 p-6 rounded-xl border border-studio-700 shadow-lg gap-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1 font-mono uppercase tracking-widest">Plan Revisions</h3>
                <p className="text-sm text-gray-400 font-mono">Track disruptions and schedule adaptations over time.</p>
              </div>
              <button 
                onClick={onRecheck}
                disabled={isRunning}
                className="bg-studio-accent hover:bg-[#00C4EB] disabled:bg-studio-800 disabled:text-gray-600 text-studio-950 px-6 py-3 rounded font-bold transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] disabled:shadow-none border border-transparent uppercase tracking-widest text-xs flex items-center shrink-0"
              >
                {isRunning && activeAgentKey === 'changeMonitor' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Simulate Disruption</>
                )}
              </button>
            </div>

            {/* History List */}
            {state.changeMonitor.history && state.changeMonitor.history.length > 0 ? (
              <div className="space-y-10 relative pl-10 before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-studio-800">
                {state.changeMonitor.history.map((report, index) => (
                  <div key={report.id} className="relative">
                    {/* Dot */}
                    <div className="absolute -left-[37px] top-6 w-7 h-7 bg-studio-950 border-2 border-studio-accent rounded-full flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,229,255,0.5)]">
                      <div className="w-2.5 h-2.5 bg-studio-accent rounded-full"></div>
                    </div>
                    
                    {/* Content Card */}
                    <div className="bg-studio-950 rounded-xl border border-studio-700 shadow-xl overflow-hidden">
                      <div className="bg-studio-900 p-5 border-b border-studio-700 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center font-mono uppercase tracking-widest">
                          <RefreshCw className="w-5 h-5 mr-3 text-studio-accent" />
                          Revision {state.changeMonitor.history.length - index}
                        </h3>
                        <span className="text-xs text-gray-400 font-mono bg-studio-950 px-3 py-1.5 rounded border border-studio-800">
                          {new Date(report.timestamp!).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="p-6 space-y-8">
                        {/* Disruption Reason */}
                        <div className="bg-studio-danger/10 border border-studio-danger/30 p-5 rounded bg-warning-stripes">
                          <h4 className="text-studio-danger font-bold flex items-center mb-2 text-xs uppercase tracking-widest font-mono">
                            <AlertTriangle className="w-4 h-4 mr-2" /> Disruption Detected
                          </h4>
                          <p className="text-gray-200 text-sm leading-relaxed font-mono">{report.changeReason}</p>
                        </div>

                        {/* What Changed */}
                        {report.changedFacts && report.changedFacts.length > 0 && (
                          <div>
                            <h4 className="font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center text-xs font-mono">
                              <Activity className="w-4 h-4 mr-2 text-studio-gold"/> Fact Changes
                            </h4>
                            <div className="space-y-4">
                              {report.changedFacts.map((fact, idx) => (
                                <div key={idx} className="bg-studio-900 rounded border border-studio-700 shadow-md overflow-hidden">
                                  <div className="bg-studio-950 p-4 border-b border-studio-700 flex justify-between items-center">
                                    <span className="font-bold text-gray-200 font-mono uppercase tracking-tight">{fact.topic}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">Affected:</span>
                                      <div className="flex gap-1.5">
                                        {fact.affectedScenes.map(s => <span key={s} className="bg-studio-danger/20 text-studio-danger border border-studio-danger/30 px-2 py-0.5 rounded text-xs font-bold font-mono">{s}</span>)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-studio-700">
                                    <div className="p-5 bg-studio-900">
                                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center mb-3 font-mono">
                                        <Clock className="w-3.5 h-3.5 mr-1.5"/> Previous Finding
                                      </span>
                                      <p className="text-sm text-gray-500 line-through decoration-studio-danger/50 font-mono">{fact.previousFinding}</p>
                                    </div>
                                    <div className="p-5 bg-studio-danger/5">
                                      <span className="text-[10px] text-studio-danger uppercase tracking-widest font-bold flex items-center mb-3 font-mono">
                                        <AlertCircle className="w-3.5 h-3.5 mr-1.5"/> New Reality
                                      </span>
                                      <p className="text-sm text-gray-200 font-medium mb-4 font-mono">{fact.newFinding}</p>
                                      
                                      {fact.sourceUrl && (
                                        <div className="bg-studio-950 p-3 rounded border border-studio-danger/20">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold flex items-center font-mono">
                                              <LinkIcon className="w-3 h-3 mr-1.5" /> Source
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                              {fact.timestamp ? new Date(fact.timestamp).toLocaleTimeString() : 'N/A'}
                                            </span>
                                          </div>
                                          <a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-studio-accent hover:underline truncate block mb-2 font-mono">
                                            {fact.sourceUrl}
                                          </a>
                                          {fact.excerpt && (
                                            <p className="text-[10px] text-gray-400 italic border-l-2 border-studio-danger/30 pl-2.5 font-script">"{fact.excerpt}"</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Adjusted Schedule & Risks */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                            <h4 className="font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center text-xs font-mono"><Calendar className="w-4 h-4 mr-2 text-studio-accent"/> Adjusted Schedule</h4>
                            <div className="space-y-3">
                              {report.updatedPlan.map((day, idx) => (
                                <div key={idx} className="bg-studio-900 p-4 rounded border border-studio-700 shadow-md flex justify-between items-center">
                                  <div>
                                    <span className="font-black text-studio-accent text-lg mr-3 font-mono">D{day.dayNumber}</span>
                                    <span className="text-sm text-gray-300 font-medium">{day.locations.join(', ')}</span>
                                  </div>
                                  <div className="flex gap-1.5">
                                    {day.scenes.map(s => <span key={s} className="bg-studio-950 border border-studio-700 text-gray-300 px-2 py-0.5 rounded text-xs font-bold font-mono">{s}</span>)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {report.newOrReopenedRisks && report.newOrReopenedRisks.length > 0 && (
                            <div>
                              <h4 className="font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center text-xs font-mono"><ShieldAlert className="w-4 h-4 mr-2 text-studio-gold"/> New or Reopened Risks</h4>
                              <div className="space-y-3">
                                {report.newOrReopenedRisks.map((risk, idx) => (
                                  <div key={idx} className="bg-studio-900 p-4 rounded border-l-4 border-studio-gold border-y border-r border-studio-700 shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                      <p className="text-sm text-gray-100 font-bold">{risk.description}</p>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest bg-studio-gold/20 text-studio-gold border border-studio-gold/30 font-mono">{risk.status}</span>
                                    </div>
                                    <div className="bg-studio-950 p-3 rounded border border-studio-800 mb-2">
                                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">Mitigation</span>
                                      <p className="text-xs text-gray-300 font-mono">{risk.mitigation}</p>
                                    </div>
                                    {risk.resolutionNote && (
                                      <p className="text-xs text-studio-danger italic font-mono mt-2">Note: {risk.resolutionNote}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 bg-studio-950 rounded-xl border border-studio-800 border-dashed">
                <Activity className="w-16 h-16 text-studio-accent mb-5 opacity-30" />
                <h3 className="text-xl font-bold text-gray-300 mb-2 font-mono uppercase tracking-widest">No Disruptions Yet</h3>
                <p className="text-sm text-gray-500 text-center max-w-md font-mono">Click "Simulate Disruption" to see how the Change Monitor adapts the production plan to real-world changes.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
