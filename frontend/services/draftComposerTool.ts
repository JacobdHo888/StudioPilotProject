import { TaskDocument } from '../types';
import { withRetry } from './utils';

export class DraftComposerTool {
    /**
     * Drafts a short acknowledgment reply on the relevant email thread.
     * Strictly limited to drafts.create() to ensure a human hits send.
     */
    static async composeDraft(task: TaskDocument): Promise<any> {
        return withRetry(async () => {
            // Defensive Guard: Ensure deadline and pay_amount are valid before acting
            if (!task.deadline || task.deadline === 'Unknown') {
                throw new Error("Refused: Task is missing a valid deadline.");
            }
            if (task.pay_amount === null || task.pay_amount === undefined || task.pay_amount <= 0) {
                throw new Error("Refused: Task is missing a valid pay amount.");
            }

            // Simulate a random network failure to trigger the retry-with-backoff logic
            if (Math.random() < 0.25) {
                throw new Error("Gmail API Timeout (504)");
            }
            
            return {
                status: 'success',
                action: 'gmail.users.drafts.create',
                credential_scope: 'https://www.googleapis.com/auth/gmail.compose',
                security_note: "Tool is strictly prohibited from calling gmail.users.messages.send",
                draft: {
                    threadId: task.email_id,
                    message: {
                        subject: `Re: Task Confirmation - ${task.task_type}`,
                        body: `Acknowledged. I have logged the ${task.task_type} task for ${task.platform}. The deadline is noted as ${task.deadline}.`
                    }
                }
            };
        });
    }
}
