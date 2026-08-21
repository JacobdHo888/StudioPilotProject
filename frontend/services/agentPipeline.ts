import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Scene, ResearchItem, ShootDay, Risk, ChangeReport, FileData, SearchLog } from '../types.ts';

// Initialize the SDK. API_KEY must be provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Helper function to execute API calls with exponential backoff retry logic and timeout.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  timeoutMs: number = 45000 // 45 seconds max per agent call
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error: any) {
      attempt++;
      console.error(`API call failed (attempt ${attempt}/${maxRetries}):`, error);
      
      // Do not retry on 400 Bad Request or 401 Unauthorized
      if (error?.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw new Error(`Client error ${error.status}: ${error.message || 'Unknown error'}`);
      }

      if (attempt >= maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts. Last error: ${error.message || error}`);
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unexpected end of retry loop");
}

/**
 * Agent 1: Script Analyst
 */
export const runScriptAnalyst = async (scriptInput: string | FileData): Promise<Scene[]> => {
  return withRetry(async () => {
    const parts: any[] = [];
    
    if (typeof scriptInput === 'string') {
      parts.push({ text: `Analyze the following screenplay and extract structured scene data. Be robust to messy or non-standard formatting:\n\n${scriptInput}` });
    } else {
      parts.push({
        inlineData: {
          mimeType: scriptInput.mimeType,
          data: scriptInput.data
        }
      });
      parts.push({ text: `Analyze the attached screenplay document and extract structured scene data. Be robust to messy or non-standard formatting.` });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: "You are an expert Script Analyst for a film production. Extract scenes, characters, locations, props, timing, special requirements (like weather, stunts, VFX), and dependencies between scenes. Handle screenplays that don't perfectly follow standard formatting—infer scene boundaries and headings intelligently.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.STRING, description: "e.g., 1, 2A. Infer if missing." },
              heading: { type: Type.STRING, description: "Full scene heading, e.g., EXT. BANK - DAY" },
              setting: { type: Type.STRING, description: "INT or EXT" },
              timeOfDay: { type: Type.STRING, description: "DAY, NIGHT, CONTINUOUS, etc." },
              summary: { type: Type.STRING, description: "Brief 1-sentence summary of action" },
              characters: { type: Type.ARRAY, items: { type: Type.STRING } },
              locations: { type: Type.ARRAY, items: { type: Type.STRING } },
              props: { type: Type.ARRAY, items: { type: Type.STRING } },
              specialRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
              dependencies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dependencies between scenes or specific prerequisites (e.g., 'Requires Scene 1 to be shot first', 'Needs nightfall')" },
            },
            required: ["sceneNumber", "heading", "setting", "timeOfDay", "summary", "characters", "locations", "props", "specialRequirements", "dependencies"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from API");
    }
    
    try {
      const parsed = JSON.parse(response.text.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("No scenes could be extracted. The input may be malformed or not a recognized screenplay format.");
      }
      return parsed;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("Failed to parse JSON response from Script Analyst");
    }
  });
};

/**
 * Simulates the Parallel Search API response based on the query.
 */
function simulateParallelSearch(query: string, category: string, isRecheck: boolean = false): string {
  if (!query) throw new Error("Empty search query provided.");
  
  const q = query.toLowerCase();
  if (q.includes('bank') || q.includes('downtown')) {
    if (isRecheck) return "URGENT UPDATE: Downtown bank location has revoked all commercial filming permits for the next 30 days due to a recent security incident.";
    return "Parallel Search Result: Downtown bank locations require a 'Commercial Filming Permit' (Form 4B). Minimum 14 days processing time. Police detail required for exterior shots involving weapons.";
  }
  if (q.includes('weather') || q.includes('rain') || category === 'WEATHER') {
    if (isRecheck) return "URGENT UPDATE: Severe thunderstorm and flash flood warning issued for the region covering the planned shoot dates. All exterior filming is highly discouraged.";
    return "Parallel Search Result: Historical weather data for this region shows a 60% chance of heavy rain in April. Recommend weather-sealed equipment and backup indoor cover sets.";
  }
  if (q.includes('weapon') || q.includes('blaster') || q.includes('gun')) {
    return "Parallel Search Result: Prop weapons must be inspected by a licensed set armorer. Local ordinances prohibit brandishing realistic prop weapons in public view without prior neighborhood notification.";
  }
  if (q.includes('van') || q.includes('vehicle') || q.includes('driving')) {
    return "Parallel Search Result: Intermittent Traffic Control (ITC) permit required for driving shots. Max hold time is 3 minutes per take.";
  }
  return `Parallel Search Result: Standard filming regulations apply for '${query}'. No extraordinary restrictions found.`;
}

/**
 * Agent 2: Research Agent
 */
export const runResearchAgent = async (
  scenes: Scene[],
  onSearchLog: (log: SearchLog) => void
): Promise<ResearchItem[]> => {
  return withRetry(async () => {
    const parallelSearchDeclaration: FunctionDeclaration = {
      name: 'parallelSearch',
      description: 'Search the web for real-world locations, permit regulations, specialty equipment availability, and historical weather data.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'The specific search query (e.g., "Los Angeles bank filming permits")' },
          category: { type: Type.STRING, description: 'Category: LOCATION, PERMIT, EQUIPMENT, or WEATHER' }
        },
        required: ['query', 'category']
      }
    };

    const needsSearch = scenes.some(s =>
      s.setting.toUpperCase().includes('EXT') ||
      s.locations.some(l => !l.toUpperCase().includes('INT.')) ||
      s.specialRequirements.length > 0 ||
      s.props.some(p => p.toLowerCase().includes('weapon') || p.toLowerCase().includes('vehicle') || p.toLowerCase().includes('car'))
    );

    const systemInstruction = `You are a Production Research Agent.
EXPLICIT RULES FOR RESEARCH:
1. ALWAYS search for real-world locations to check permit rules or restrictions.
2. ALWAYS search for historical weather data if the scene is EXT (exterior).
3. ALWAYS search for specialty equipment (e.g., cranes, prop weapons, specialized vehicles).
4. DO NOT search for generic indoor sets (e.g., 'INT. BEDROOM') or common everyday props.

You must use the parallelSearch tool to gather this information.`;

    let contents: any[] = [
      {
        role: 'user',
        parts: [{ text: `Analyze these scenes and perform necessary research using the parallelSearch tool.\n\nScenes:\n${JSON.stringify(scenes, null, 2)}` }]
      }
    ];

    const toolResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [parallelSearchDeclaration] }],
        toolConfig: {
          functionCallingConfig: {
            mode: needsSearch ? 'ANY' : 'AUTO',
            allowedFunctionNames: needsSearch ? ['parallelSearch'] : undefined
          }
        }
      }
    });

    let finalContents = [...contents];

    if (toolResponse.functionCalls && toolResponse.functionCalls.length > 0) {
      finalContents.push(toolResponse.candidates[0].content);

      const functionResponsesParts = [];
      for (const call of toolResponse.functionCalls) {
        if (call.name === 'parallelSearch') {
          const args = call.args as any;
          const query = args.query || 'General search';
          const category = args.category || 'GENERAL';
          
          let result = "";
          try {
            result = simulateParallelSearch(query, category, false);
          } catch (err) {
            result = `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }

          onSearchLog({
            query,
            category,
            result,
            timestamp: Date.now()
          });

          functionResponsesParts.push({
            functionResponse: {
              name: call.name,
              response: { result }
            }
          });
        }
      }

      finalContents.push({
        role: 'user',
        parts: functionResponsesParts
      });
    }

    const finalResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: finalContents,
      config: {
        systemInstruction: systemInstruction + "\n\nNow, summarize your findings into the final JSON array format. If no research was needed or found, return an empty array [].",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING, description: "What is being researched (e.g., 'Bank Location Permits')" },
              query: { type: Type.STRING, description: "The search query used" },
              simulatedFindings: { type: Type.STRING, description: "The result of the search" },
              relevance: { type: Type.STRING, description: "Why this matters to the production" },
            },
            required: ["topic", "query", "simulatedFindings", "relevance"]
          }
        }
      }
    });

    if (!finalResponse.text) {
      throw new Error("Empty response from API");
    }

    try {
      const parsedData = JSON.parse(finalResponse.text.trim());
      // Persist research results for the Change Monitor to diff against later
      localStorage.setItem('studiopilot_research', JSON.stringify(parsedData));
      return parsedData;
    } catch (e) {
      throw new Error("Failed to parse JSON response from Research Agent");
    }
  });
};

/**
 * Agent 3: Production Planner
 */
export const runProductionPlanner = async (scenes: Scene[], research: ResearchItem[]): Promise<ShootDay[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Create a shooting schedule based on these scenes and research constraints.\n\nScenes:\n${JSON.stringify(scenes)}\n\nResearch:\n${JSON.stringify(research)}`,
      config: {
        systemInstruction: "You are a Production Planner. Group scenes logically by location and characters to minimize company moves. Account for research constraints and scene dependencies. Assume a standard 10-hour shoot day.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dayNumber: { type: Type.INTEGER },
              locations: { type: Type.ARRAY, items: { type: Type.STRING } },
              scenes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of scene numbers" },
              estimatedHours: { type: Type.NUMBER },
              notes: { type: Type.STRING, description: "Logistical notes for the day" },
            },
            required: ["dayNumber", "locations", "scenes", "estimatedHours", "notes"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from API");
    }
    
    try {
      const parsed = JSON.parse(response.text.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Failed to generate a valid production schedule.");
      }
      return parsed;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("Failed to parse JSON response from Production Planner");
    }
  });
};

/**
 * Agent 4: Risk Analyst
 */
export const runRiskAnalyst = async (plan: ShootDay[], scenes: Scene[]): Promise<Risk[]> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze this production plan and the original scenes for risks (scheduling, location, resources, weather).\n\nPlan:\n${JSON.stringify(plan)}\n\nScenes:\n${JSON.stringify(scenes)}`,
      config: {
        systemInstruction: "You are a Risk Analyst for film production. Identify potential bottlenecks, safety issues, or scheduling conflicts. Provide actionable mitigations. If no risks are found, return an empty array [].",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              severity: { type: Type.STRING, description: "Must be 'Low', 'Medium', or 'High'" },
              mitigation: { type: Type.STRING },
              affectedScenes: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["id", "description", "severity", "mitigation", "affectedScenes"]
          }
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from API");
    }
    
    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      throw new Error("Failed to parse JSON response from Risk Analyst");
    }
  });
};

/**
 * Agent 5: Change Monitor
 */
export const runChangeMonitor = async (
  plan: ShootDay[], 
  risks: Risk[],
  scenes: Scene[],
  onSearchLog: (log: SearchLog) => void
): Promise<ChangeReport> => {
  return withRetry(async () => {
    // 1. Retrieve persisted research
    const storedResearch = localStorage.getItem('studiopilot_research');
    if (!storedResearch) {
      throw new Error("No previous research found in storage to compare against.");
    }
    const previousResearch: ResearchItem[] = JSON.parse(storedResearch);
    const changedFacts: any[] = [];

    // 2. Re-run searches and diff
    for (const item of previousResearch) {
      let newResult = "";
      try {
        newResult = simulateParallelSearch(item.query, 'RECHECK', true);
      } catch (err) {
        newResult = `Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
      
      onSearchLog({
        query: item.query,
        category: 'RECHECK',
        result: newResult,
        timestamp: Date.now()
      });

      if (newResult !== item.simulatedFindings) {
        changedFacts.push({
          topic: item.topic,
          previousFinding: item.simulatedFindings,
          newFinding: newResult
        });
      }
    }

    // 3. If no changes, return early
    if (changedFacts.length === 0) {
      return {
        changeReason: "Re-ran all research queries. No changes detected in real-world constraints.",
        changedFacts: [],
        updatedPlan: plan,
        newRisks: risks
      };
    }

    // 4. If changes exist, ask Gemini to evaluate impact and update plan
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `The following real-world facts have changed since the production plan was created:\n${JSON.stringify(changedFacts, null, 2)}\n\nCurrent Plan:\n${JSON.stringify(plan)}\n\nCurrent Risks:\n${JSON.stringify(risks)}\n\nScenes:\n${JSON.stringify(scenes)}`,
      config: {
        systemInstruction: "You are a Change Monitor. Evaluate the impact of the changed facts on the Current Plan. Generate an updated plan that accommodates these changes (e.g., moving exterior scenes, changing locations). Identify new risks caused by these changes. Also, explicitly list the changed facts and which scenes they affect.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            changeReason: { type: Type.STRING, description: "Summary of what changed and how it impacted the plan" },
            changedFacts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  previousFinding: { type: Type.STRING },
                  newFinding: { type: Type.STRING },
                  affectedScenes: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["topic", "previousFinding", "newFinding", "affectedScenes"]
              }
            },
            updatedPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  scenes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  estimatedHours: { type: Type.NUMBER },
                  notes: { type: Type.STRING },
                },
                required: ["dayNumber", "locations", "scenes", "estimatedHours", "notes"]
              }
            },
            newRisks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  mitigation: { type: Type.STRING },
                  affectedScenes: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["id", "description", "severity", "mitigation", "affectedScenes"]
              }
            }
          },
          required: ["changeReason", "changedFacts", "updatedPlan", "newRisks"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from API");
    }
    
    try {
      return JSON.parse(response.text.trim());
    } catch (e) {
      throw new Error("Failed to parse JSON response from Change Monitor");
    }
  });
};
