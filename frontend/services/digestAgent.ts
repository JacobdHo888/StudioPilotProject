import { GoogleGenAI } from '@google/genai';
import { LedgerTool } from './ledgerTool';
import { DispatchEvent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const runDailyDigest = async (): Promise<DispatchEvent> => {
    try {
        // 1. Query Firestore (mocked) for state
        const dbState = LedgerTool.getDatabaseState();
        
        // Filter for tasks created in the last 24 hours (simulated by taking all in this session)
        const recentTasks = dbState.tasks;
        const reviewQueue = recentTasks.filter(t => t.status === 'REJECTED' || t.status === 'ACTION_FAILED');
        const totals = await LedgerTool.reconcile();

        // 2. Construct the context for Gemini
        const context = `
        Current Ledger Totals:
        - Total Tasks Confirmed: ${totals.total_tasks}
        - Total Confirmed Pay: $${totals.total_confirmed}
        
        Recent Tasks (Last 24h):
        ${JSON.stringify(recentTasks, null, 2)}
        
        Items Requiring Manual Review:
        ${JSON.stringify(reviewQueue, null, 2)}
        `;

        // 3. Call Gemini to generate the digest
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are the FrictionForge Digest Agent. Your job is to read the daily shift log and write a short, prioritized, plain-English summary for the human operator.
            
            Context from Firestore:
            ${context}
            
            Write a concise briefing covering:
            1. What's closing soon (deadlines).
            2. What needs manual review (anomalies, rejections, action failures).
            3. What's been paid/confirmed.
            
            Keep it punchy, professional, and easy to read. Do not use markdown headers, just plain text paragraphs or bullet points.`,
        });

        return {
            id: `digest-${Math.random().toString(36).substring(7)}`,
            timestamp: new Date().toISOString(),
            type: 'DIGEST_GENERATED',
            agent: 'DIGEST_AGENT',
            message: 'Daily shift digest generated successfully.',
            payload: {
                summary: response.text.trim(),
                metrics_snapshot: totals
            }
        };

    } catch (error: any) {
        console.error("Error generating digest:", error);
        return {
            id: `digest-err-${Math.random().toString(36).substring(7)}`,
            timestamp: new Date().toISOString(),
            type: 'ACTION_FAILED',
            agent: 'DIGEST_AGENT',
            message: `Failed to generate daily digest: ${error.message}`
        };
    }
};
