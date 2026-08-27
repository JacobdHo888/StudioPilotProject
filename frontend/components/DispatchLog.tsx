import React, { useEffect, useRef } from 'react';
import { DispatchEvent, EventType } from '../types';
import { Activity } from 'lucide-react';

interface DispatchLogProps {
    events: DispatchEvent[];
    onOpenTrace: (traceId: string) => void;
}

export const DispatchLog: React.FC<DispatchLogProps> = ({ events, onOpenTrace }) => {
    const endOfLogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    const getEventColor = (type: EventType, payload?: any) => {
        switch (type) {
            case 'SYS_INIT': return 'text-vulcan-500';
            case 'EMAIL_INTERCEPTED': return 'text-status-cyan';
            case 'TRIAGE_PASSED': return 'text-status-green';
            case 'TRIAGE_REJECTED': return 'text-vulcan-500';
            case 'SANITIZATION_PASSED': return 'text-status-green';
            case 'SANITIZATION_FAILED': return 'text-status-red';
            case 'EXTRACTION_ATTEMPTED': return 'text-status-amber';
            case 'VERIFICATION_RETURNED': 
                if (payload?.verdict === 'CONFIRMED') return 'text-status-green';
                if (payload?.verdict === 'NEEDS_REVIEW') return 'text-status-amber';
                return 'text-status-red';
            case 'LEDGER_UPDATED': return 'text-status-purple';
            case 'ACTION_TAKEN': return 'text-status-blue';
            case 'WATCHDOG_ESCALATION': return 'text-status-red';
            case 'CALENDAR_EVENT_CREATED': return 'text-status-blue';
            case 'DRAFT_COMPOSED': return 'text-status-blue';
            case 'ACTION_FAILED': return 'text-status-red';
            case 'DIGEST_GENERATED': return 'text-status-purple';
            case 'REVIEW_RESOLVED': return 'text-status-green';
            default: return 'text-vulcan-400';
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
    };

    return (
        <div className="flex flex-col h-full font-mono text-xs overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {events.map((evt) => (
                    <div key={evt.id} className="flex flex-col group hover:bg-vulcan-800/50 py-2 px-3 -mx-3 rounded transition-colors animate-log-pulse">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-vulcan-500 shrink-0 select-none">
                                [{formatTime(evt.timestamp)}]
                            </span>
                            
                            {/* Trace Badge */}
                            {evt.trace_id && (
                                <button 
                                    onClick={() => onOpenTrace(evt.trace_id!)}
                                    className="flex items-center space-x-1 text-[9px] bg-vulcan-800 hover:bg-vulcan-700 text-vulcan-300 px-1.5 py-0.5 rounded border border-vulcan-700 transition-colors"
                                    title="View Trace"
                                >
                                    <Activity className="w-3 h-3" />
                                    <span>{evt.task_id?.split('-')[1]}</span>
                                </button>
                            )}

                            <span className="text-vulcan-400 shrink-0">
                                {evt.agent}
                            </span>
                            <span className={`font-bold shrink-0 ${getEventColor(evt.type, evt.payload)}`}>
                                {evt.type}
                            </span>
                            <span className="text-vulcan-100 break-words flex-1 min-w-[150px]">
                                {'>'} {evt.message}
                            </span>
                        </div>
                        
                        {evt.payload && (
                            <div className="mt-2 text-[10px] text-vulcan-300 border-l border-vulcan-700 pl-3 py-1.5 bg-vulcan-950/80 rounded-r overflow-x-auto w-full">
                                <pre className="whitespace-pre-wrap break-words font-mono leading-relaxed">{JSON.stringify(evt.payload, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={endOfLogRef} className="h-8 flex items-center space-x-2 text-vulcan-500 px-3 -mx-3">
                    <span className="animate-pulse">█</span>
                </div>
            </div>
        </div>
    );
};
