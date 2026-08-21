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
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-cinema-success" />;
      case 'running': return <Loader2 className="w-5 h-5 text-cinema-accent animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-cinema-danger" />;
      default: return <CircleDashed className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'completed': return 'border-cinema-success/30 bg-cinema-success/5';
      case 'running': return 'border-cinema-accent/50 bg-cinema-accent/10';
      case 'error': return 'border-cinema-danger/50 bg-cinema-danger/10';
      default: return 'border-cinema-700 bg-cinema-800/50';
    }
  };

  return (
    <div className={`flex items-start p-3 rounded-lg border ${getBorderColor()} transition-colors duration-300`}>
      <div className="mt-0.5 mr-3">
        {getStatusIcon()}
      </div>
      <div>
        <h4 className={`font-medium ${status === 'idle' ? 'text-gray-400' : 'text-gray-100'}`}>{name}</h4>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
};
