import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, Trash2, ChevronRight } from 'lucide-react';

interface LogTerminalProps {
    logs: LogEntry[];
    onClear: () => void;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({ logs, onClear }) => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const getLevelStyles = (level: string) => {
        switch (level) {
            case 'INFO': return 'text-blue-400 border-blue-400/20 bg-blue-400/5';
            case 'WARN': return 'text-magma-300 border-magma-300/20 bg-magma-300/5';
            case 'ERROR': return 'text-magma-500 border-magma-500/20 bg-magma-500/5';
            case 'AGENT': return 'text-magma-400 border-magma-400/20 bg-magma-400/5';
            case 'DEBUG': return 'text-vulcan-400 border-vulcan-400/20 bg-vulcan-400/5';
            default: return 'text-vulcan-300 border-vulcan-300/20 bg-vulcan-300/5';
        }
    };

    return (
        <div className="flex flex-col h-full bg-vulcan-950 border border-vulcan-700 rounded shadow-lg overflow-hidden scanlines">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-vulcan-800 border-b border-vulcan-700 relative z-20">
                <div className="flex items-center space-x-2">
                    <TerminalIcon className="w-4 h-4 text-vulcan-400" />
                    <span className="text-xs font-bold tracking-widest uppercase text-vulcan-100">Orchestrator Output</span>
                </div>
                <button 
                    onClick={onClear}
                    className="p-1.5 text-vulcan-400 hover:text-magma-500 hover:bg-vulcan-700 rounded transition-colors"
                    title="Clear Output"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            
            {/* Log Area */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3 relative z-20">
                {logs.length === 0 ? (
                    <div className="text-vulcan-600 flex items-center space-x-2">
                        <span className="animate-pulse">_</span>
                        <span>AWAITING TELEMETRY...</span>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex flex-col break-words group">
                            <div className="flex items-start space-x-2">
                                <span className="text-vulcan-600 shrink-0 select-none">
                                    {new Date(log.timestamp).toISOString().split('T')[1].replace('Z', '')}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 w-14 text-center ${getLevelStyles(log.level)}`}>
                                    {log.level}
                                </span>
                                <span className="text-vulcan-100 leading-relaxed flex-1">
                                    {log.message}
                                </span>
                            </div>
                            {log.details && (
                                <div className="ml-24 mt-2 p-3 bg-vulcan-900 border-l-2 border-vulcan-700 text-vulcan-400 overflow-x-auto">
                                    <pre className="text-[10px] leading-tight">{JSON.stringify(log.details, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={endOfLogsRef} className="h-4 flex items-center text-magma-400">
                    <ChevronRight className="w-3 h-3" />
                    <span className="animate-pulse">_</span>
                </div>
            </div>
        </div>
    );
};
