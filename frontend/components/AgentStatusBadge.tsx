import React from 'react';
import { CheckCircle2, CircleDashed, Loader2, AlertCircle } from 'lucide-react';
import { AgentStatus } from '../types.ts';

interface Props {
  name: string;
  status: AgentStatus;
  description: string;
}

export const AgentStatusBadge: React.FC<Props> = ({ name, status, description }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-studio-success" />;
      case 'running': return <Loader2 className="w-4 h-4 text-studio-accent animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-studio-danger" />;
      default: return <CircleDashed className="w-4 h-4 text-studio-600" />;
    }
  };

  const getStyles = () => {
    switch (status) {
      case 'completed': return 'border-studio-success/30 bg-studio-success/5';
      case 'running': return 'border-studio-accent bg-studio-accent/10 shadow-[0_0_10px_rgba(0,229,255,0.2)]';
      case 'error': return 'border-studio-danger/50 bg-studio-danger/10';
      default: return 'border-studio-800 bg-transparent';
    }
  };

  return (
    <div className={`flex items-center p-2.5 rounded-lg border ${getStyles()} transition-all duration-300`}>
      <div className="mr-3">
        {getStatusIcon()}
      </div>
      <div className="flex-1 flex justify-between items-center">
        <h4 className={`text-xs font-bold uppercase tracking-wider font-mono ${status === 'idle' ? 'text-gray-500' : 'text-gray-200'}`}>{name}</h4>
        {status === 'running' && <span className="text-[9px] text-studio-accent uppercase tracking-widest animate-pulse">Active</span>}
      </div>
    </div>
  );
};
