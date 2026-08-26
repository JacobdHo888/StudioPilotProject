import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Film, Settings, Info, Loader2, Upload, File as FileIcon, X, Activity, Terminal } from 'lucide-react';
import { PipelineState, FileData, SearchLog, ActivityLog } from './types.ts';
import { ResultsDashboard } from './components/ResultsDashboard.tsx';
import { 
  runScriptAnalyst, 
  runResearchAgent, 
  runProductionPlanner, 
  runRiskAnalyst, 
  runChangeMonitor,
  runLocationVisualizer
} from './services/agentPipeline.ts';

// Entirely original demo screenplay created for this hackathon.
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
  locationVisualizer: { status: 'idle', data: null },
};

export default function App() {
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPT);
  const [uploadedFile, setUploadedFile] = useState<FileData | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState>(INITIAL_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((agent: string, message: string, type: ActivityLog['type'] = 'info') => {
    setActivityLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      agent,
      message,
      type
    }]);
  }, []);

  // Auto-scroll logs
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

      // Fire and forget Location Visualizer (Imagen 3)
      const uniqueLocations = Array.from(new Set(scenes.flatMap(s => s.locations)));
      if (uniqueLocations.length > 0) {
        updateAgentState('locationVisualizer', { status: 'running' });
        addLog('Location Visualizer', `Generating concept art for ${uniqueLocations.length} locations using Imagen 3...`, 'request');
        
        runLocationVisualizer(uniqueLocations).then(images => {
          updateAgentState('locationVisualizer', { status: 'completed', data: images });
          addLog('Location Visualizer', `Generated ${Object.keys(images).length} location thumbnails.`, 'success');
        }).catch(err => {
          console.error("Location Visualizer Error:", err);
          updateAgentState('locationVisualizer', { status: 'error', error: String(err) });
          addLog('Location Visualizer', `Failed to generate images: ${String(err)}`, 'error');
        });
      } else {
        updateAgentState('locationVisualizer', { status: 'completed', data: {} });
      }

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
      
      // Mark currently running core agent as error
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
    // Use the latest plan and risks from history, or fallback to initial planner/risk analyst
    const latestPlan = pipelineState.changeMonitor.data?.updatedPlan || pipelineState.productionPlanner.data;
    const latestRisks = pipelineState.changeMonitor.data?.newRisks || pipelineState.riskAnalyst.data;
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
    <div className="flex flex-col h-screen bg-cinema-900 text-gray-100 font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-cinema-900 border-b border-cinema-800 px-6 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2 rounded-lg shadow-lg shadow-blue-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">StudioPilot</h1>
            <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest">ADK Multi-Agent Network</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-gray-400 bg-cinema-800 px-3 py-1.5 rounded-full border border-cinema-700">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-mono text-xs">ADK Backend Connected</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400 border-l border-cinema-700 pl-6">
            <span className="flex items-center gap-1.5 hover:text-gray-200 cursor-pointer transition-colors"><Settings className="w-4 h-4" /> Gemini 2.5 Flash</span>
            <span className="flex items-center gap-1.5 hover:text-gray-200 cursor-pointer transition-colors"><Info className="w-4 h-4" /> Parallel Search API</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Input & Live Feed */}
        <div className="w-[400px] bg-cinema-900 border-r border-cinema-800 flex flex-col shrink-0 z-10 shadow-xl">
          
          {/* Upload Panel */}
          <div className="p-5 border-b border-cinema-800 bg-cinema-900/50">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" /> Input Source
              </h2>
              {!uploadedFile && (
                <button onClick={() => setScriptText(SAMPLE_SCRIPT)} className="text-[10px] text-blue-400 hover:text-blue-300 uppercase font-bold tracking-wider transition-colors">
                  Load Sample
                </button>
              )}
            </div>

            {uploadedFile ? (
              <div className="w-full h-32 bg-cinema-800/50 border border-cinema-700 rounded-xl p-4 flex flex-col items-center justify-center mb-4 relative group hover:border-blue-500/50 transition-colors">
                <button onClick={clearUploadedFile} className="absolute top-2 right-2 p-1.5 bg-cinema-700 hover:bg-cinema-600 rounded-full text-gray-300 transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
                <FileIcon className="w-8 h-8 text-blue-400 mb-2" />
                <p className="text-sm font-medium text-gray-200 text-center truncate w-full px-4">{uploadedFile.name}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Ready for Analysis</p>
              </div>
            ) : (
              <div className="relative mb-4 group">
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  className="w-full h-32 bg-cinema-800/50 border border-cinema-700 rounded-xl p-3 text-xs text-gray-300 font-mono focus:outline-none focus:border-blue-500/50 focus:bg-cinema-800 transition-all resize-none custom-scrollbar"
                  placeholder="Paste screenplay text here..."
                  disabled={isRunning}
                />
                <div className="absolute bottom-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                  <input type="file" accept=".pdf,.txt,.fountain" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="bg-cinema-700 hover:bg-cinema-600 text-white px-3 py-1.5 rounded-lg shadow-lg transition-colors flex items-center gap-2 text-xs font-medium border border-cinema-600">
                    <Upload className="w-3.5 h-3.5" /> Upload PDF
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={runPipeline}
              disabled={isRunning || (!scriptText.trim() && !uploadedFile)}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-cinema-800 disabled:text-gray-500 disabled:border-cinema-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-blue-900/20 border border-blue-500 disabled:shadow-none"
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing Pipeline...</>
              ) : (
                <><Play className="w-4 h-4 mr-2 fill-current" /> Run ADK Pipeline</>
              )}
            </button>
          </div>

          {/* Live Agent Activity Feed */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
            <div className="px-5 py-3 border-b border-cinema-800 bg-cinema-900/80 flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" /> Live Activity Feed
              </h2>
              {isRunning && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar font-mono text-[11px]">
              {activityLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                  <Activity className="w-6 h-6 opacity-20" />
                  <p>Awaiting pipeline execution...</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="text-gray-500 shrink-0 mt-0.5">
                      {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="flex-1">
                      <span className={`font-bold mr-2 ${
                        log.agent === 'Orchestrator' ? 'text-purple-400' :
                        log.agent === 'Script Analyst' ? 'text-blue-400' :
                        log.agent === 'Research Agent' ? 'text-amber-400' :
                        log.agent === 'Production Planner' ? 'text-emerald-400' :
                        log.agent === 'Risk Analyst' ? 'text-rose-400' :
                        log.agent === 'Change Monitor' ? 'text-cyan-400' :
                        log.agent === 'Location Visualizer' ? 'text-fuchsia-400' :
                        'text-gray-400'
                      }`}>
                        [{log.agent}]
                      </span>
                      <span className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'warning' ? 'text-yellow-400' : ''}
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
        <div className="flex-1 bg-[#0a0a0a] p-6 overflow-hidden flex flex-col">
          <ResultsDashboard 
            state={pipelineState} 
            error={globalError}
            onRecheck={handleRecheck} 
          />
        </div>

      </main>
    </div>
  );
}
