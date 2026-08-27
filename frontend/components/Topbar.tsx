import React from 'react';
import { Activity, Terminal, Settings, Flame, Zap } from 'lucide-react';
import { AppView } from '../types';

interface TopbarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentView, onViewChange }) => {
    const navItems = [
        { id: AppView.SIMULATOR, label: 'INJECTOR', icon: Terminal },
        { id: AppView.DASHBOARD, label: 'TELEMETRY', icon: Activity },
        { id: AppView.SETTINGS, label: 'CONFIG', icon: Settings },
    ];

    return (
        <header className="bg-vulcan-900 border-b border-vulcan-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo Section */}
                    <div className="flex items-center space-x-3">
                        <div className="relative flex items-center justify-center w-10 h-10 bg-vulcan-800 border border-vulcan-700 rounded shadow-magma-glow">
                            <Flame className="w-6 h-6 text-magma-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black tracking-widest text-vulcan-100 uppercase leading-tight">
                                Friction<span className="text-magma-400">Forge</span>
                            </span>
                            <span className="text-[10px] font-mono text-vulcan-400 tracking-widest uppercase">
                                Taskmaster Node
                            </span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex space-x-1 bg-vulcan-800 p-1 rounded border border-vulcan-700">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onViewChange(item.id)}
                                    className={`flex items-center space-x-2 px-4 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-vulcan-700 text-magma-400 shadow-sm' 
                                            : 'text-vulcan-400 hover:text-vulcan-100 hover:bg-vulcan-700/50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Status */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 px-3 py-1 bg-vulcan-800 border border-vulcan-700 rounded">
                            <div className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-magma-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-magma-500"></span>
                            </div>
                            <span className="text-[10px] font-mono text-vulcan-400 uppercase tracking-wider">Vertex AI</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
