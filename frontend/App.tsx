import React, { useState, useCallback, useEffect } from 'react';
import { PayloadInjector } from './components/PayloadInjector';
import { DispatchLog } from './components/DispatchLog';
import { Dashboard } from './components/Dashboard';
import { ActiveShiftPanel } from './components/ActiveShiftPanel';
import { TraceViewer } from './components/TraceViewer';
import { DispatchEvent } from './types';
import { simulateDispatchEvents } from './services/agentService';
import { runDailyDigest } from './services/digestAgent';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
    const [events, setEvents] = useState<DispatchEvent[]>([
        {
            id: 'init-1',
            timestamp: new Date().toISOString(),
            type: 'SYS_INIT',
            agent: 'SYSTEM',
            message: 'FrictionForge Dispatch Console initialized. Listening to shift log...'
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [centerView, setCenterView] = useState<'LOG' | 'DASHBOARD'>('LOG');
    const [uptime, setUptime] = useState(0);

    // Uptime Counter
    useEffect(() => {
        const interval = setInterval(() => setUptime(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const handleInject = useCallback(async (payload: string) => {
        setIsProcessing(true);
        
        const simulatedEvents = await simulateDispatchEvents(payload);
        
        // Play them back with a staggered delay to simulate real-time independent agents
        for (const evt of simulatedEvents) {
            const delay = Math.floor(Math.random() * 600) + 200;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            setEvents(prev => [...prev, {
                ...evt,
                timestamp: new Date().toISOString()
            }]);
        }
        
        setIsProcessing(false);
    }, []);

    const handleRunDigest = useCallback(async () => {
        const digestEvent = await runDailyDigest();
        setEvents(prev => [...prev, digestEvent]);
    }, []);

    const handleResolve = useCallback((taskId: string) => {
        setEvents(prev => [...prev, {
            id: `evt-${Math.random().toString(36).substring(2, 10)}`,
            timestamp: new Date().toISOString(),
            type: 'REVIEW_RESOLVED',
            agent: 'DISPATCHER',
            message: `Manual review completed. Task anomaly resolved.`,
            task_id: taskId
        }]);
    }, []);

    return (
        <div className="flex h-screen w-screen items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden relative bg-vulcan-950">
            
            {/* Trace Viewer Modal Overlay */}
            {selectedTraceId && (
                <TraceViewer 
                    traceId={selectedTraceId} 
                    events={events} 
                    onClose={() => setSelectedTraceId(null)} 
                />
            )}

            {/* Bounded Application Container */}
            <div className="flex flex-col w-full max-w-[1440px] h-full max-h-[900px] bg-vulcan-900 border border-vulcan-700 rounded-xl shadow-2xl overflow-hidden relative z-10">
                
                {/* Persistent Mission Control Header */}
                <div className="h-10 bg-vulcan-800 border-b border-vulcan-700 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-status-green">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-green opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-green"></span>
                            </span>
                            <span className="tracking-widest font-bold">NIGHT_SHIFT_ACTIVE</span>
                        </div>
                        <div className="h-3 w-px bg-vulcan-700"></div>
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-vulcan-400">
                            <Activity className="w-3 h-3" />
                            <span className="tracking-widest">SYS_OPS</span>
                        </div>
                    </div>
                    <div className="text-[10px] font-mono text-vulcan-400 tracking-widest flex items-center space-x-2">
                        <span>UPTIME</span>
                        <span className="text-vulcan-100 font-bold">{formatUptime(uptime)}</span>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Left Panel: Injector */}
                    <div className="w-72 shrink-0 h-full border-r border-vulcan-700 bg-vulcan-800/30">
                        <PayloadInjector onInject={handleInject} isProcessing={isProcessing} />
                    </div>
                    
                    {/* Center Panel: Dispatch Log / Dashboard */}
                    <div className="flex-1 h-full relative bg-vulcan-900 min-w-0 flex flex-col">
                        {/* Tab Header */}
                        <div className="flex border-b border-vulcan-700 bg-vulcan-800 shrink-0">
                            <button 
                                onClick={() => setCenterView('LOG')}
                                className={`px-6 py-3 text-xs font-bold tracking-widest uppercase border-r border-vulcan-700 transition-colors ${centerView === 'LOG' ? 'bg-vulcan-900 text-status-blue shadow-[inset_0_2px_0_0_#3b82f6]' : 'text-vulcan-500 hover:text-vulcan-300'}`}
                            >
                                Shift Log
                            </button>
                            <button 
                                onClick={() => setCenterView('DASHBOARD')}
                                className={`px-6 py-3 text-xs font-bold tracking-widest uppercase border-r border-vulcan-700 transition-colors ${centerView === 'DASHBOARD' ? 'bg-vulcan-900 text-status-blue shadow-[inset_0_2px_0_0_#3b82f6]' : 'text-vulcan-500 hover:text-vulcan-300'}`}
                            >
                                Telemetry
                            </button>
                        </div>
                        
                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {centerView === 'LOG' ? (
                                <DispatchLog events={events} onOpenTrace={setSelectedTraceId} />
                            ) : (
                                <Dashboard events={events} onResolve={handleResolve} />
                            )}
                        </div>
                    </div>
                    
                    {/* Right Panel: Active Shift Status */}
                    <div className="w-80 shrink-0 h-full border-l border-vulcan-700 bg-vulcan-800/30">
                        <ActiveShiftPanel events={events} onRunDigest={handleRunDigest} onResolve={handleResolve} />
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default App;
