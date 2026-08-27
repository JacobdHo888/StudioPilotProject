import React, { useState } from 'react';
import { Send, RefreshCw, Radio, ChevronDown } from 'lucide-react';
import { injectMockEmail } from '../services/agentService';

interface PayloadInjectorProps {
    onInject: (payload: string) => void;
    isProcessing: boolean;
}

const createGmailPayload = (historyId: string) => ({
    message: {
        data: btoa(JSON.stringify({ emailAddress: "taskmaster@frictionforge.local", historyId })),
        messageId: `msg-${historyId}-${Date.now()}`,
        publishTime: new Date().toISOString()
    },
    subscription: "projects/frictionforge-dev/subscriptions/gmail-push-sub"
});

const FIXTURES = [
    {
        name: "Fixture 1: Cognivue Task",
        description: "Clean task from Cognivue Tasking.",
        payload: createGmailPayload("hist-clean-001")
    },
    {
        name: "Fixture 2: Missing Info",
        description: "Missing deadline, vague amount.",
        payload: createGmailPayload("hist-missing-002")
    },
    {
        name: "Fixture 3: Adversarial/Tricky",
        description: "Multiple amounts/dates to test Verifier.",
        payload: createGmailPayload("hist-tricky-003")
    },
    {
        name: "Fixture 4: Noise/Newsletter",
        description: "Marketing email, should be filtered by Triage.",
        payload: createGmailPayload("hist-noise-004")
    },
    {
        name: "Fixture 5: Prompt Injection",
        description: "Malicious payload attempting to override instructions.",
        payload: createGmailPayload("hist-inject-005")
    }
];

export const PayloadInjector: React.FC<PayloadInjectorProps> = ({ onInject, isProcessing }) => {
    const [payload, setPayload] = useState(JSON.stringify(FIXTURES[0].payload, null, 2));
    const [activeFixture, setActiveFixture] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleInject = () => {
        let payloadToSend = payload;
        try {
            // If it parses as JSON, assume it's a properly formatted Pub/Sub payload
            JSON.parse(payload);
        } catch (e) {
            // If it's not JSON, treat it as raw email text pasted by the user.
            // We generate a custom historyId, inject the raw text into the mock DB,
            // and wrap it in the expected Pub/Sub JSON structure automatically.
            const customHistoryId = `hist-custom-${Date.now()}`;
            injectMockEmail(customHistoryId, payload);
            payloadToSend = JSON.stringify(createGmailPayload(customHistoryId), null, 2);
        }
        onInject(payloadToSend);
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(payload);
            setPayload(JSON.stringify(parsed, null, 2));
        } catch (e) {
            // If it fails to parse, assume it's raw text and wrap it into a valid webhook payload
            const customHistoryId = `hist-custom-${Date.now()}`;
            injectMockEmail(customHistoryId, payload);
            setPayload(JSON.stringify(createGmailPayload(customHistoryId), null, 2));
        }
    };

    const selectFixture = (index: number) => {
        setActiveFixture(index);
        setPayload(JSON.stringify(FIXTURES[index].payload, null, 2));
        setShowDropdown(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-vulcan-700 flex items-center space-x-2 shrink-0 bg-vulcan-800">
                <Radio className="w-4 h-4 text-status-blue" />
                <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Signal Injector</h2>
            </div>
            
            <div className="p-3 border-b border-vulcan-700 relative shrink-0">
                <div className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest mb-2">Test Fixtures</div>
                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between bg-vulcan-900 border border-vulcan-700 p-2 text-xs font-mono text-vulcan-100 hover:border-vulcan-600 transition-colors rounded-sm"
                >
                    <span className="truncate">{FIXTURES[activeFixture].name}</span>
                    <ChevronDown className="w-3 h-3 text-vulcan-400" />
                </button>
                
                {showDropdown && (
                    <div className="absolute top-full left-3 right-3 mt-1 bg-vulcan-800 border border-vulcan-700 shadow-xl z-50 rounded-sm overflow-hidden">
                        {FIXTURES.map((fixture, idx) => (
                            <button
                                key={idx}
                                onClick={() => selectFixture(idx)}
                                className="w-full text-left p-2 border-b border-vulcan-700 last:border-0 hover:bg-vulcan-700 transition-colors"
                            >
                                <div className="text-xs font-mono text-vulcan-100">{fixture.name}</div>
                                <div className="text-[10px] font-mono text-vulcan-400 mt-0.5">{fixture.description}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="flex-1 p-3 flex flex-col min-h-0">
                <div className="mb-2 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest">Payload (JSON or Raw Text)</span>
                    <button 
                        onClick={handleFormat}
                        className="text-[10px] font-mono text-vulcan-500 hover:text-vulcan-100 uppercase transition-colors"
                        title="Format JSON or Wrap Raw Text"
                    >
                        [FMT]
                    </button>
                </div>
                <textarea
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    className="flex-1 w-full bg-vulcan-950 text-vulcan-100 font-mono text-[10px] p-3 border border-vulcan-700 rounded-sm focus:border-status-blue outline-none resize-none overflow-y-auto"
                    spellCheck="false"
                    placeholder="Paste raw email text here, or a valid Pub/Sub JSON payload..."
                />
            </div>
            
            <div className="p-3 border-t border-vulcan-700 shrink-0 bg-vulcan-800">
                <button
                    onClick={handleInject}
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-center space-x-2 py-2.5 border rounded-sm font-bold text-[10px] tracking-widest uppercase transition-all ${
                        isProcessing 
                            ? 'bg-vulcan-800 text-vulcan-500 border-vulcan-700 cursor-not-allowed' 
                            : 'bg-vulcan-950 text-status-blue border-status-blue hover:bg-status-blue hover:text-vulcan-950'
                    }`}
                >
                    {isProcessing ? (
                        <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Transmitting...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-3 h-3" />
                            <span>Transmit Signal</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
