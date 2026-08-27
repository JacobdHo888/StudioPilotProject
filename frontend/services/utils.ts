/**
 * Executes an asynchronous operation with exponential backoff retries.
 * 
 * @param operation The async function to execute.
 * @param maxRetries Maximum number of attempts before failing.
 * @param baseDelayMs Base delay in milliseconds for the exponential backoff.
 */
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 500
): Promise<T> => {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            attempt++;
            if (attempt >= maxRetries) {
                throw error;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            console.warn(`[Retry Logic] Operation failed, retrying in ${delay}ms... (Attempt ${attempt} of ${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error("Unreachable");
};
