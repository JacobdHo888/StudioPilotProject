import React, { useState, useEffect, useRef } from 'react';
import { DispatchEvent, LedgerTotal, ReviewQueueItem } from '../types';
import { Database, AlertOctagon, FileText, RefreshCw } from 'lucide-react';

interface ActiveShiftPanelProps {
    events: DispatchEvent[];
    onRunDigest: () => void;
    onResolve: (taskId: string) => void;
}

export const ActiveShiftPanel: React.FC<ActiveShiftPanelProps> = ({ events, onRunDigest, onResolve }) => {
    const [isDigesting, setIsDigesting] = useState(false);
    const [flashLedger, setFlashLedger] = useState(false);
    const prevLedgerCount = useRef(0);

    // Trigger ledger flash animation when a new LEDGER_UPDATED event arrives
    useEffect(() => {
        const ledgerEvents = events.filter(e => e.type === 'LEDGER_UPDATED');
        if (ledgerEvents.length > prevLedgerCount.current) {
            setFlashLedger(true);
            const timer = setTimeout(() => setFlashLedger(false), 1500);
            prevLedgerCount.current = ledgerEvents.length;
            return () => clearTimeout(timer);
        }
    }, [events]);

    const handleDigestClick = async () => {
        setIsDigesting(true);
        await onRunDigest();
        setIsDigesting(false);
    };

    // Derive state from events
    const reviewQueue: ReviewQueueItem[] = events
        .filter(e => e.type === 'WATCHDOG_ESCALATION')
        .filter(e => !events.some(res => res.type === 'REVIEW_RESOLVED' && res.task_id === e.task_id))
        .map(e => {
            const precedingEvent = events.slice(0, events.indexOf(e)).reverse().find(prev => prev.type === 'VERIFICATION_RETURNED' || prev.type === 'SANITIZATION_FAILED');
            const verdict = precedingEvent?.type === 'SANITIZATION_FAILED' ? 'QUARANTINED' : (precedingEvent?.payload?.verdict || 'ESCALATED');
            
            return {
                id: e.id,
                taskId: e.task_id || '',
                timestamp: e.timestamp,
                reason: e.payload?.reason || e.message,
                status: 'PENDING',
                verdict: verdict
            };
        });

    const latestLedgerUpdate = [...events].reverse().find(e => e.type === 'LEDGER_UPDATED');
    const reconciled = latestLedgerUpdate?.payload?.reconciled_totals || { total_tasks: 0, total_pending: 0, total_confirmed: 0 };

    const totals: LedgerTotal[] = [
        { category: 'Tasks Confirmed', count: reconciled.total_tasks, value: reconciled.total_confirmed },
        { category: 'Pending Pay', count: 0, value: reconciled.total_pending },
        { category: 'Anomalies Queued', count: reviewQueue.length, value: 0 }
    ];

    const getVerdictColor = (verdict?: string) => {
        if (verdict === 'REJECTED' || verdict === 'QUARANTINED') return 'text-status-red border-status-red';
        if (verdict === 'NEEDS_REVIEW') return 'text-status-amber border-status-amber';
        return 'text-vulcan-400 border-vulcan-600';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Ledger Totals */}
            <div className={`flex-1 border-b flex flex-col min-h-0 transition-colors duration-300 ${flashLedger ? 'animate-ledger-flash border-status-purple' : 'border-vulcan-700'}`}>
                <div className="p-3 border-b border-vulcan-700 flex items-center justify-between shrink-0 bg-vulcan-800">
                    <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-status-purple" />
                        <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Ledger Totals</h2>
                    </div>
                    <button 
                        onClick={handleDigestClick}
                        disabled={isDigesting}
                        className="flex items-center space-x-1 text-[9px] font-bold tracking-widest uppercase bg-vulcan-950 hover:bg-vulcan-700 text-vulcan-100 px-2 py-1 rounded border border-vulcan-600 transition-colors disabled:opacity-50"
                    >
                        {isDigesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                        <span>Digest</span>
                    </button>
                </div>
                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {totals.map((total, idx) => (
                        <div key={idx} className="bg-vulcan-900 border border-vulcan-700 p-3 rounded-sm">
                            <div className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest mb-1">
                                {total.category}
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-mono text-status-purple leading-none">{total.count}</span>
                                {total.value > 0 && (
                                    <span className="text-xs font-mono text-status-purple leading-none">${total.value.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Review Queue */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="p-3 border-b border-vulcan-700 flex items-center space-x-2 shrink-0 bg-vulcan-800">
                    <AlertOctagon className="w-4 h-4 text-status-red" />
                    <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Review Queue</h2>
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${reviewQueue.length > 0 ? 'bg-status-red text-vulcan-950' : 'bg-vulcan-900 text-vulcan-400'}`}>
                        {reviewQueue.length}
                    </span>
                </div>
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    {reviewQueue.length === 0 ? (
                        <div className="text-[10px] font-mono text-vulcan-500 uppercase tracking-widest text-center mt-4">
                            Queue Empty
                        </div>
                    ) : (
                        reviewQueue.map(item => (
                            <div key={item.id} className="bg-vulcan-900 border border-vulcan-700 p-2 flex flex-col space-y-2 rounded-sm animate-log-pulse">
                                <div className="flex justify-between items-center border-b border-vulcan-800 pb-1">
                                    <span className="text-[10px] font-mono text-vulcan-400">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 uppercase border rounded-sm ${getVerdictColor(item.verdict)}`}>
                                        {item.verdict}
                                    </span>
                                </div>
                                <div className="text-[11px] font-mono text-vulcan-100 leading-relaxed">
                                    {item.reason}
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button 
                                        onClick={() => onResolve(item.taskId)}
                                        className="text-[9px] font-bold tracking-widest uppercase text-vulcan-400 hover:text-status-blue transition-colors"
                                    >
                                        [ RESOLVE ]
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
