export type EventType = 
    | 'SYS_INIT' 
    | 'EMAIL_INTERCEPTED' 
    | 'TRIAGE_PASSED'
    | 'TRIAGE_REJECTED'
    | 'SANITIZATION_PASSED'
    | 'SANITIZATION_FAILED'
    | 'EXTRACTION_ATTEMPTED' 
    | 'VERIFICATION_RETURNED' 
    | 'LEDGER_UPDATED' 
    | 'ACTION_TAKEN' 
    | 'WATCHDOG_ESCALATION'
    | 'CALENDAR_EVENT_CREATED'
    | 'DRAFT_COMPOSED'
    | 'ACTION_FAILED'
    | 'DIGEST_GENERATED'
    | 'REVIEW_RESOLVED';

export type AgentType = 
    | 'SYSTEM' 
    | 'GMAIL_LISTENER' 
    | 'TRIAGE_FILTER'
    | 'SANITIZER'
    | 'EXTRACTOR' 
    | 'VERIFIER' 
    | 'LEDGER_CLERK' 
    | 'DISPATCHER' 
    | 'WATCHDOG'
    | 'CALENDAR_TOOL'
    | 'DRAFT_COMPOSER'
    | 'DIGEST_AGENT';

export interface ExtractorPayload {
    task_type: string;
    platform: string;
    deadline: string;
    pay_amount: number | null;
    pay_currency: string;
    confidence_note: string;
}

export interface VerifierPayload {
    verdict: 'CONFIRMED' | 'NEEDS_REVIEW' | 'REJECTED';
    reason: string;
}

export interface DispatchEvent {
    id: string;
    timestamp: string;
    type: EventType;
    agent: AgentType;
    message: string;
    payload?: any;
    
    // OpenTelemetry Tracing Fields
    trace_id?: string;
    task_id?: string;
    span_id?: string;
    parent_span_id?: string;
    duration_ms?: number;
}

export interface LedgerTotal {
    category: string;
    count: number;
    value: number;
}

export interface ReviewQueueItem {
    id: string;
    taskId: string;
    timestamp: string;
    reason: string;
    status: 'PENDING' | 'RESOLVED';
    verdict?: string;
}

// --- FIRESTORE SCHEMA DEFINITIONS ---

export interface TaskDocument {
    task_id: string;
    platform: string;
    task_type: string;
    deadline: string;
    pay_amount: number;
    pay_currency: string;
    status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'ACTION_FAILED';
    email_id: string;
    verifier_verdict: string;
    created_at: string;
}

export interface LedgerDocument {
    platform: string;
    tasks_completed: number;
    pending_pay: number;
    confirmed_pay: number;
}
