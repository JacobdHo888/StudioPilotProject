import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DispatchEvent } from '../types';
import { LedgerTool } from '../services/ledgerTool';
import { Activity, AlertOctagon, CheckCircle2, Clock, XCircle, Database } from 'lucide-react';

interface DashboardProps {
    events: DispatchEvent[];
    onResolve: (taskId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ events, onResolve }) => {
    // Derive state synchronously from the mock Firestore
    const dbState = useMemo(() => LedgerTool.getDatabaseState(), [events]);
    
    const chartData = useMemo(() => {
        return dbState.ledgers.map(l => ({
            name: l.platform,
            pay: l.confirmed_pay
        }));
    }, [dbState.ledgers]);

    const recentTasks = useMemo(() => {
        return [...dbState.tasks].reverse().slice(0, 10);
    }, [dbState.tasks]);

    const reviewQueue = useMemo(() => {
        return events
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
            })
            .reverse();
    }, [events]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return <CheckCircle2 className="w-4 h-4 text-status-green" />;
            case 'PENDING': return <Clock className="w-4 h-4 text-status-amber" />;
            case 'REJECTED': return <XCircle className="w-4 h-4 text-status-red" />;
            case 'ACTION_FAILED': return <AlertOctagon className="w-4 h-4 text-status-red" />;
            default: return <Activity className="w-4 h-4 text-vulcan-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'text-status-green';
            case 'PENDING': return 'text-status-amber';
            case 'REJECTED': return 'text-status-red';
            case 'ACTION_FAILED': return 'text-status-red';
            default: return 'text-vulcan-400';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 overflow-y-auto p-6 bg-vulcan-900">
            {/* Top Row: Chart & High Level Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-64 shrink-0">
                <div className="lg:col-span-2 bg-vulcan-800/50 border border-vulcan-700 rounded-sm p-4 flex flex-col">
                    <div className="flex items-center space-x-2 mb-4">
                        <Database className="w-4 h-4 text-status-purple" />
                        <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Confirmed Pay by Platform</h2>
                    </div>
                    <div className="flex-1 min-h-0">
                        {chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[10px] font-mono text-vulcan-500 uppercase tracking-widest">
                                No Ledger Data
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        cursor={{ fill: '#1e293b' }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', fontSize: '12px', fontFamily: 'monospace' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Confirmed Pay']}
                                    />
                                    <Bar dataKey="pay" fill="#d946ef" radius={[2, 2, 0, 0]} maxBarSize={60}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill="#d946ef" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                
                {/* Review Queue Summary */}
                <div className="bg-vulcan-800/50 border border-vulcan-700 rounded-sm p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <AlertOctagon className="w-4 h-4 text-status-red" />
                            <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Review Queue</h2>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${reviewQueue.length > 0 ? 'bg-status-red text-vulcan-950' : 'bg-vulcan-900 text-vulcan-400'}`}>
                            {reviewQueue.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {reviewQueue.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[10px] font-mono text-vulcan-500 uppercase tracking-widest">
                                Queue Empty
                            </div>
                        ) : (
                            reviewQueue.map(item => (
                                <div key={item.id} className="bg-vulcan-900 border border-vulcan-700 p-2 rounded-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-mono text-vulcan-400">
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span className={`text-[8px] font-bold uppercase ${item.verdict === 'NEEDS_REVIEW' ? 'text-status-amber' : 'text-status-red'}`}>
                                            {item.verdict}
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-mono text-vulcan-100 line-clamp-2 mb-2">
                                        {item.reason}
                                    </div>
                                    <div className="flex justify-end">
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

            {/* Bottom Row: Recent Tasks */}
            <div className="flex-1 bg-vulcan-800/50 border border-vulcan-700 rounded-sm p-4 flex flex-col min-h-[300px]">
                <div className="flex items-center space-x-2 mb-4 shrink-0">
                    <Activity className="w-4 h-4 text-status-blue" />
                    <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Recent Tasks</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {recentTasks.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[10px] font-mono text-vulcan-500 uppercase tracking-widest">
                            No Tasks Logged
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-vulcan-700 text-[10px] font-mono text-vulcan-500 uppercase tracking-widest">
                                    <th className="pb-2 font-normal">Status</th>
                                    <th className="pb-2 font-normal">Platform</th>
                                    <th className="pb-2 font-normal">Task Type</th>
                                    <th className="pb-2 font-normal">Deadline</th>
                                    <th className="pb-2 font-normal text-right">Pay</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-mono text-vulcan-100">
                                {recentTasks.map(task => (
                                    <tr key={task.task_id} className="border-b border-vulcan-700/50 hover:bg-vulcan-700/50 transition-colors">
                                        <td className="py-3 flex items-center space-x-2">
                                            {getStatusIcon(task.status)}
                                            <span className={`text-[10px] font-bold ${getStatusColor(task.status)}`}>{task.status}</span>
                                        </td>
                                        <td className="py-3 text-vulcan-300">{task.platform}</td>
                                        <td className="py-3 truncate max-w-[200px]">{task.task_type}</td>
                                        <td className="py-3 text-vulcan-400">
                                            {new Date(task.deadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </td>
                                        <td className="py-3 text-right font-bold text-status-purple">
                                            ${task.pay_amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
