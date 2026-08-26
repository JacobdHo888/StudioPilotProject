import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Clapperboard, Settings, Info, Loader2, Upload, File as FileIcon, FileText, X, Activity, Terminal, Radio, RotateCcw } from 'lucide-react';
import { PipelineState, FileData, SearchLog, ActivityLog, RiskStatus } from './types.ts';
import { ResultsDashboard } from './components/ResultsDashboard.tsx';
import { AgentStatusBadge } from './components/AgentStatusBadge.tsx';
import { 
  runScriptAnalyst, 
  runResearchAgent, 
  runProductionPlanner, 
  runRiskAnalyst, 
  runChangeMonitor
} from './services/agentPipeline.ts';

const SAMPLE_SCRIPT = `EXT. GRIFFITH OBSERVATORY - NIGHT
Heavy rain lashes against the iconic white domes. ELARA (30s, sharp, wearing a leather jacket) sits astride a vintage motorcycle, engine idling. She watches the entrance like a hawk.

INT. OBSERVATORY PLANETARIUM - CONTINUOUS
KAEL (50s, anxious) paces beneath the star projector. He clutches a titanium lockbox. 
Elara enters, dripping wet. She nods. Kael slides the lockbox across the carpet.

EXT. OBSERVATORY ROOFTOP - LATER
The rain is torrential now. Elara sprints across the roof with the lockbox. 
Suddenly, a massive heavy-lift drone rises over the parapet, its spotlight blinding her. 
Elara executes a desperate diving stunt to avoid the drone's grappling hook, sliding across the slick, wet concrete.`;

const INITIAL_STATE: PipelineState = {
  scriptAnalyst: { status: 'idle', data: null },
  researchAgent: { status: 'idle', data: null, logs: [] },
  productionPlanner: { status: 'idle', data: null },
  riskAnalyst: { status: 'idle', data: null },
  changeMonitor: { status: 'idle', data: null, history: [] },
};

export default function App() {
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPT);
  const [uploadedFile, setUploadedFile] = useState<FileData | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState>(INITIAL_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedState = localStorage.getItem('studiopilot_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.pipelineState) setPipelineState(parsed.pipelineState);
        if (parsed.activityLogs) {
          setActivityLogs(parsed.activityLogs.map((l: any) => ({...l, timestamp: new Date(l.timestamp)})));
        }
      } catch (e) {
        console.error("Failed to restore state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('studiopilot_state', JSON.stringify({ pipelineState, activityLogs }));
    }
  }, [pipelineState, activityLogs, isLoaded]);

  const addLog = useCallback((agent: string, message: string, type: ActivityLog['type'] = 'info') => {
    setActivityLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      agent,
      message,
      type
    }]);
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activityLogs]);

  const updateAgentState = (agent: keyof PipelineState, update: Partial<PipelineState[keyof PipelineState]>) => {
    setPipelineState(prev => ({
      ...prev,
      [agent]: { ...prev[agent], ...update }
    }));
  };

  const handleSearchLog = useCallback((log: SearchLog) => {
    setPipelineState(prev => ({
      ...prev,
      researchAgent: {
        ...prev.researchAgent,
        logs: [...(prev.researchAgent.logs || []), log]
      }
    }));
    addLog('Research Agent', `Parallel Search: [${log.category}] ${log.query}`, 'request');
  }, [addLog]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.fountain')) {
      reader.onloadend = () => {
        setScriptText(reader.result as string);
        setUploadedFile(null);
        addLog('System', `Loaded text file: ${file.name}`, 'info');
      };
      reader.readAsText(file);
    } else {
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUploadedFile({
          name: file.name,
          mimeType: file.type || 'application/pdf',
          data: base64
        });
        setScriptText('');
        addLog('System', `Loaded document: ${file.name}`, 'info');
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setScriptText(SAMPLE_SCRIPT);
    addLog('System', 'Cleared uploaded file, loaded sample script.', 'info');
  };

  const handleUpdateRisk = useCallback((riskId: string, status: RiskStatus, note?: string) => {
    setPipelineState(prev => {
      if (!prev.riskAnalyst.data) return prev;
      const updatedRisks = prev.riskAnalyst.data.map(r => 
        r.id === riskId ? { ...r, status, resolutionNote: note } : r
      );
      return {
        ...prev,
        riskAnalyst: { ...prev.riskAnalyst, data: updatedRisks }
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setPipelineState(INITIAL_STATE);
    setActivityLogs([]);
    setGlobalError(null);
    setIsRunning(false);
    localStorage.removeItem('studiopilot_state');
    localStorage.removeItem('studiopilot_research');
    addLog('System', 'Pipeline reset to initial state.', 'info');
  }, [addLog]);

  const runPipeline = useCallback(async () => {
    if (!scriptText.trim() && !uploadedFile) return;
    
    setIsRunning(true);
    setGlobalError(null);
    setPipelineState(INITIAL_STATE);
    setActivityLogs([]);
    addLog('Orchestrator', 'Initializing ADK Multi-Agent Pipeline...', 'info');

    try {
      // 1. Script Analyst
      updateAgentState('scriptAnalyst', { status: 'running' });
      addLog('Script Analyst', 'Ingesting screenplay and extracting structured entities...', 'request');
      const input = uploadedFile ? uploadedFile : scriptText;
      const scenes = await runScriptAnalyst(input);
      updateAgentState('scriptAnalyst', { status: 'completed', data: scenes });
      addLog('Script Analyst', `Successfully extracted ${scenes.length} scenes.`, 'success');

      // 2. Research Agent
      updateAgentState('researchAgent', { status: 'running', logs: [] });
      addLog('Research Agent', 'Analyzing scenes for real-world constraints...', 'info');
      const research = await runResearchAgent(scenes, handleSearchLog);
      updateAgentState('researchAgent', { status: 'completed', data: research });
      addLog('Research Agent', `Completed research. Found ${research.length} logistical constraints.`, 'success');

      // 3. Production Planner
      updateAgentState('productionPlanner', { status: 'running' });
      addLog('Production Planner', 'Synthesizing scenes and research into shooting schedule...', 'request');
      const plan = await runProductionPlanner(scenes, research);
      updateAgentState('productionPlanner', { status: 'completed', data: plan });
      addLog('Production Planner', `Generated ${plan.length}-day production schedule.`, 'success');

      // 4. Risk Analyst
      updateAgentState('riskAnalyst', { status: 'running' });
      addLog('Risk Analyst', 'Evaluating schedule for logistical and safety risks...', 'request');
      const risks = await runRiskAnalyst(plan, scenes);
      updateAgentState('riskAnalyst', { status: 'completed', data: risks });
      addLog('Risk Analyst', `Identified ${risks.length} potential risks.`, 'success');

      addLog('Orchestrator', 'Pipeline execution completed successfully.', 'success');
    } catch (error) {
      console.error("Pipeline Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGlobalError(errorMessage);
      addLog('Orchestrator', `Pipeline failed: ${errorMessage}`, 'error');
      
      const agents: (keyof PipelineState)[] = ['scriptAnalyst', 'researchAgent', 'productionPlanner', 'riskAnalyst'];
      for (const agent of agents) {
        setPipelineState(prev => {
          if (prev[agent].status === 'running') {
            return { ...prev, [agent]: { ...prev[agent], status: 'error', error: errorMessage } };
          }
          return prev;
        });
      }
    } finally {
      setIsRunning(false);
    }
  }, [scriptText, uploadedFile, handleSearchLog, addLog]);

  const handleRecheck = useCallback(async () => {
    const latestPlan = pipelineState.changeMonitor.data?.updatedPlan || pipelineState.productionPlanner.data;
    const latestRisks = pipelineState.riskAnalyst.data; 
    const scenes = pipelineState.scriptAnalyst.data;
    
    if (!latestPlan || !latestRisks || !scenes) return;

    setIsRunning(true);
    setGlobalError(null);
    updateAgentState('changeMonitor', { status: 'running' });
    addLog('Change Monitor', 'Initiating recheck of previously verified facts...', 'request');

    try {
      const changeReport = await runChangeMonitor(latestPlan, latestRisks, scenes, handleSearchLog);
      
      const completeReport = {
        ...changeReport,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now()
      };

      setPipelineState(prev => ({
        ...prev,
        riskAnalyst: {
          ...prev.riskAnalyst,
          data: completeReport.updatedRisks 
        },
        changeMonitor: {
          status: 'completed',
          data: completeReport,
          history: [completeReport, ...(prev.changeMonitor.history || [])]
        }
      }));
      addLog('Change Monitor', 'Plan updated based on new constraints.', 'success');
    } catch (error) {
      console.error("Change Monitor Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGlobalError(errorMessage);
      addLog('Change Monitor', `Failed to update plan: ${errorMessage}`, 'error');
      updateAgentState('changeMonitor', { status: 'error', error: errorMessage });
    } finally {
      setIsRunning(false);
    }
  }, [pipelineState, handleSearchLog, addLog]);

  return (
    <div className="flex flex-col h-screen bg-studio-950 text-gray-100 font-sans overflow-hidden">
      {/* Top Navigation Bar - Cinematic Slate Vibe */}
      <header className="bg-studio-900 border-b border-studio-700 px-6 py-3 flex items-center justify-between shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-studio-accent/10 border border-studio-accent/30 p-2 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.15)]">
            <Clapperboard className="w-5 h-5 text-studio-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight flex items-center gap-2">
              STUDIOPILOT <span className="text-studio-600 font-normal">|</span> <span className="text-sm font-mono text-studio-gold">PROD_COORD_SYS</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Agentic Cinema Network</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-studio-accent bg-studio-accent/5 px-3 py-1.5 rounded-full border border-studio-accent/20">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-wider font-bold">ADK Online</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400 border-l border-studio-700 pl-6 font-mono text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Gemini 2.5 Flash</span>
            <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Parallel Search</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Input & Live Feed */}
        <div className="w-[420px] bg-studio-900 border-r border-studio-700 flex flex-col shrink-0 z-10 shadow-2xl relative">
          
          {/* Upload Panel */}
          <div className="p-6 border-b border-studio-700 bg-studio-900">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2 font-mono">
                <FileText className="w-4 h-4 text-studio-accent" /> Source Material
              </h2>
              {!uploadedFile && (
                <button onClick={() => setScriptText(SAMPLE_SCRIPT)} className="text-[10px] text-studio-accent hover:text-white uppercase font-bold tracking-wider transition-colors">
                  Load Sample
                </button>
              )}
            </div>

            {uploadedFile ? (
              <div className="w-full h-40 bg-studio-950 border border-studio-700 rounded-xl p-4 flex flex-col items-center justify-center mb-5 relative group hover:border-studio-accent/50 transition-colors shadow-inner">
                <button onClick={clearUploadedFile} className="absolute top-2 right-2 p-1.5 bg-studio-800 hover:bg-studio-danger rounded-full text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
                <FileIcon className="w-10 h-10 text-studio-accent mb-3" />
                <p className="text-sm font-bold text-white text-center truncate w-full px-4">{uploadedFile.name}</p>
                <p className="text-[10px] text-studio-success mt-2 uppercase tracking-widest font-mono">Ready for Breakdown</p>
              </div>
            ) : (
              <div className="relative mb-5 group">
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  className="w-full h-40 bg-studio-950 border border-studio-700 rounded-xl p-4 text-xs text-gray-200 font-script focus:outline-none focus:border-studio-accent focus:ring-1 focus:ring-studio-accent/50 transition-all resize-none custom-scrollbar shadow-inner leading-relaxed"
                  placeholder="Paste screenplay text here..."
                  disabled={isRunning}
                />
                <div className="absolute bottom-3 right-3 opacity-40 group-hover:opacity-100 transition-opacity">
                  <input type="file" accept=".pdf,.txt,.fountain" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="bg-studio-800 hover:bg-studio-700 text-white px-3 py-1.5 rounded-lg shadow-lg transition-colors flex items-center gap-2 text-xs font-medium border border-studio-600">
                    <Upload className="w-3.5 h-3.5" /> Upload PDF
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={runPipeline}
                disabled={isRunning || (!scriptText.trim() && !uploadedFile)}
                className="flex-1 bg-studio-accent hover:bg-[#00C4EB] disabled:bg-studio-800 disabled:text-gray-500 disabled:border-studio-700 text-studio-950 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:shadow-none border border-transparent uppercase tracking-widest text-xs"
              >
                {isRunning ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2 fill-current" /> Run ADK Pipeline</>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={isRunning || pipelineState.scriptAnalyst.status === 'idle'}
                className="bg-studio-800 hover:bg-studio-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 px-4 rounded-xl transition-all border border-studio-700 flex items-center justify-center"
                title="Reset Pipeline"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Agent Status Overview */}
          <div className="px-6 py-4 border-b border-studio-700 bg-studio-900">
             <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 font-mono">Agent Network Status</h2>
             <div className="space-y-2">
                <AgentStatusBadge name="Script Analyst" status={pipelineState.scriptAnalyst.status} description="Entity Extraction" />
                <AgentStatusBadge name="Research Agent" status={pipelineState.researchAgent.status} description="Parallel Web Search" />
                <AgentStatusBadge name="Production Planner" status={pipelineState.productionPlanner.status} description="Schedule Synthesis" />
                <AgentStatusBadge name="Risk Analyst" status={pipelineState.riskAnalyst.status} description="Safety & Logistics" />
             </div>
          </div>

          {/* Live Agent Activity Feed */}
          <div className="flex-1 flex flex-col overflow-hidden bg-studio-950">
            <div className="px-6 py-3 border-b border-studio-800 flex justify-between items-center">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                <Terminal className="w-3.5 h-3.5" /> Terminal Log
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar font-mono text-[10px] leading-relaxed">
              {activityLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-studio-700 space-y-2">
                  <Activity className="w-6 h-6 opacity-20" />
                  <p className="uppercase tracking-widest">Awaiting Execution</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="text-studio-600 shrink-0 mt-0.5">
                      {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="flex-1">
                      <span className={`font-bold mr-2 ${
                        log.agent === 'Orchestrator' ? 'text-purple-400' :
                        log.agent === 'Script Analyst' ? 'text-studio-accent' :
                        log.agent === 'Research Agent' ? 'text-studio-gold' :
                        log.agent === 'Production Planner' ? 'text-studio-success' :
                        log.agent === 'Risk Analyst' ? 'text-studio-danger' :
                        log.agent === 'Change Monitor' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        [{log.agent}]
                      </span>
                      <span className={`
                        ${log.type === 'error' ? 'text-studio-danger' : ''}
                        ${log.type === 'success' ? 'text-studio-success' : ''}
                        ${log.type === 'warning' ? 'text-studio-gold' : ''}
                        ${log.type === 'request' ? 'text-gray-300' : 'text-gray-400'}
                      `}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Right Area - Results Dashboard */}
        <div className="flex-1 bg-studio-950 p-6 overflow-hidden flex flex-col relative">
          {/* Subtle background grid for cinematic tech feel */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
          
          <div className="relative z-10 h-full flex flex-col">
            <ResultsDashboard 
              state={pipelineState} 
              error={globalError}
              onRecheck={handleRecheck} 
              onUpdateRisk={handleUpdateRisk}
            />
          </div>
        </div>

      </main>
    </div>
  );
}
