import React from 'react';
import { Activity, Terminal, Settings, Hammer } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    const navItems = [
        { id: AppView.DASHBOARD, label: 'Dashboard', icon: Activity },
        { id: AppView.SIMULATOR, label: 'Webhook Simulator', icon: Terminal },
        { id: AppView.SETTINGS, label: 'Settings', icon: Settings },
    ];

    return (
        <div className="w-64 bg-forge-800 border-r border-forge-700 flex flex-col h-full">
            <div className="p-6 flex items-center space-x-3 border-b border-forge-700">
                <div className="p-2 bg-forge-accent/20 rounded-lg">
                    <Hammer className="w-6 h-6 text-forge-accent" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">FrictionForge</h1>
                    <p className="text-xs text-slate-400">Taskmaster Agent</p>
                </div>
            </div>
            
            <nav className="flex-1 py-4">
                <ul className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onViewChange(item.id)}
                                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                                        isActive 
                                            ? 'bg-forge-700 text-white' 
                                            : 'text-slate-400 hover:bg-forge-700/50 hover:text-slate-200'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            
            <div className="p-4 border-t border-forge-700">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>System Online</span>
                </div>
            </div>
        </div>
    );
};
