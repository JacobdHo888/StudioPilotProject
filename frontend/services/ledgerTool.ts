import { TaskDocument, LedgerDocument } from '../types';

/**
 * In-memory mock of Firestore for the frontend simulation.
 * In the actual Python ADK backend, this maps directly to the Firestore client.
 */
const mockFirestore = {
    tasks: new Map<string, TaskDocument>(),
    ledgers: new Map<string, LedgerDocument>()
};

export class LedgerTool {
    /**
     * Exposes read-only access to the mock database for the Digest Agent.
     */
    static getDatabaseState() {
        return {
            tasks: Array.from(mockFirestore.tasks.values()),
            ledgers: Array.from(mockFirestore.ledgers.values())
        };
    }

    /**
     * Simulates a Firestore transaction to atomically write a task
     * and update the platform's ledger totals.
     */
    static async recordConfirmedTask(task: TaskDocument): Promise<LedgerDocument> {
        const platformKey = task.platform.toLowerCase();
        
        // 1. Read current ledger state (Transaction GET)
        let ledger = mockFirestore.ledgers.get(platformKey) || {
            platform: task.platform,
            tasks_completed: 0,
            pending_pay: 0,
            confirmed_pay: 0
        };

        // 2. Validate (ensure task doesn't already exist to prevent double-counting)
        if (mockFirestore.tasks.has(task.task_id)) {
            throw new Error(`Transaction Failed: Task ${task.task_id} already exists in ledger.`);
        }

        // 3. Calculate new totals
        const updatedLedger: LedgerDocument = {
            ...ledger,
            tasks_completed: ledger.tasks_completed + 1,
            confirmed_pay: ledger.confirmed_pay + task.pay_amount
        };

        // 4. Write updates (Transaction SET/UPDATE)
        mockFirestore.tasks.set(task.task_id, task);
        mockFirestore.ledgers.set(platformKey, updatedLedger);

        return updatedLedger;
    }

    /**
     * Updates the status of an existing task in Firestore.
     * Used when downstream actions (like Calendar or Drafts) fail.
     */
    static async updateTaskStatus(taskId: string, status: TaskDocument['status']): Promise<void> {
        const task = mockFirestore.tasks.get(taskId);
        if (task) {
            task.status = status;
            mockFirestore.tasks.set(taskId, task);
        }
    }

    /**
     * Reconciles all ledgers to get a global sum of pending and confirmed pay.
     * Scans the ledger collection and aggregates the totals.
     */
    static async reconcile(): Promise<{ total_tasks: number, total_pending: number, total_confirmed: number }> {
        let total_tasks = 0;
        let total_pending = 0;
        let total_confirmed = 0;

        // In real Firestore: const snapshot = await db.collection('ledger').get();
        for (const ledger of mockFirestore.ledgers.values()) {
            total_tasks += ledger.tasks_completed;
            total_pending += ledger.pending_pay;
            total_confirmed += ledger.confirmed_pay;
        }

        return { total_tasks, total_pending, total_confirmed };
    }
}
