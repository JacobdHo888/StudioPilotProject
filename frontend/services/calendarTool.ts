import { TaskDocument } from '../types';
import { withRetry } from './utils';

export class CalendarTool {
    /**
     * Creates a Google Calendar event two hours before the task deadline.
     * Uses a narrowly scoped credential separate from Gmail.
     */
    static async createEvent(task: TaskDocument): Promise<any> {
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
                throw new Error("Calendar API Rate Limit Exceeded (429)");
            }
            
            // Parse deadline and subtract 2 hours
            const deadlineDate = new Date(task.deadline);
            if (isNaN(deadlineDate.getTime())) {
                throw new Error("Invalid deadline format provided to CalendarTool.");
            }
            const startTime = new Date(deadlineDate.getTime() - 2 * 60 * 60 * 1000);
            
            return {
                status: 'success',
                action: 'calendar.events.insert',
                credential_scope: 'https://www.googleapis.com/auth/calendar.events',
                event: {
                    summary: `[${task.platform}] ${task.task_type}`,
                    start: startTime.toISOString(),
                    end: deadlineDate.toISOString(),
                }
            };
        });
    }
}
