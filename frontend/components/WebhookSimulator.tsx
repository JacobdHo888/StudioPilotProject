import React, { useState } from 'react';
import { Send, RefreshCw, Braces, AlertTriangle } from 'lucide-react';

interface WebhookSimulatorProps {
    onTrigger: (payload: string) => void;
    isProcessing: boolean;
}

const DEFAULT_PAYLOAD = `{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiAidGFza21hc3RlckBmcmljdGlvbmZvcmdlLmxvY2FsIiwgImhpc3RvcnlJZCI6ICI5ODc2NTQzMjEifQ==",
    "messageId": "1234567890",
    "publishTime": "2023-10-27T12:00:00.000Z"
  },
  "subscription": "projects/frictionforge-dev/subscriptions/gmail-push-sub"
}`;

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({ onTrigger, isProcessing }) => {
    const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
    const [error, setError] = useState<string | null>(null);

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(payload);
            setPayload(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (e) {
            setError("MALFORMED JSON PAYLOAD");
        }
    };

    const handleSubmit = () => {
        try {
            JSON.parse(payload);
            setError(null);
            onTrigger(payload);
        } catch (e) {
            setError("CANNOT INJECT INVALID JSON");
        }
    };

    return (
        <div className="flex flex-col h-full bg-vulcan-900 border border-vulcan-700 rounded shadow-lg relative overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-vulcan-700 bg-vulcan-800 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Braces className="w-4 h-4 text-magma-400" />
                    <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Payload Injector</h2>
                </div>
                <button 
                    onClick={handleFormat}
                    className="text-[10px] font-mono flex items-center space-x-1 text-vulcan-400 hover:text-magma-400 transition-colors uppercase tracking-wider"
                >
                    <RefreshCw className="w-3 h-3" />
                    <span>Format</span>
                </button>
            </div>
            
            {/* Editor Area */}
            <div className="flex-1 p-4 flex flex-col relative bg-vulcan-950">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest">
                        Target: <span className="text-magma-400">POST /webhook/pubsub</span>
                    </label>
                </div>
                
                <textarea
                    value={payload}
                    onChange={(e) => {
                        setPayload(e.target.value);
                        setError(null);
                    }}
                    className="flex-1 w-full bg-transparent text-vulcan-100 font-mono text-sm p-0 border-none focus:ring-0 outline-none resize-none"
                    spellCheck="false"
                />
                
                {error && (
                    <div className="absolute bottom-4 left-4 right-4 bg-magma-600/20 border border-magma-500 text-magma-400 px-3 py-2 rounded flex items-center space-x-2 backdrop-blur-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold tracking-wider">{error}</span>
                    </div>
                )}
            </div>
            
            {/* Action Bar */}
            <div className="p-4 border-t border-vulcan-700 bg-vulcan-800 flex justify-between items-center">
                <div className="text-[10px] font-mono text-vulcan-600 uppercase tracking-widest">
                    Simulates test_trigger.py
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className={`relative overflow-hidden flex items-center space-x-2 px-6 py-2 rounded font-bold text-xs tracking-widest uppercase transition-all duration-200 ${
                        isProcessing 
                            ? 'bg-vulcan-700 text-vulcan-500 cursor-not-allowed border border-vulcan-600' 
                            : 'bg-magma-500 text-vulcan-950 hover:bg-magma-400 border border-magma-400 shadow-magma-glow hover:shadow-magma-glow-intense active:scale-95'
                    }`}
                >
                    {isProcessing ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Injecting...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            <span>Inject Payload</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
