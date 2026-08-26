import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Scene, ResearchItem, ShootDay, Risk, ChangeReport, FileData, SearchLog } from '../types.ts';

// Initialize the SDK. API_KEY must be provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
const MODEL_NAME = 'gemini-2.5-flash';

// Configuration for Parallel Search limits
const MAX_SEARCHES_PER_RUN = 3;
const SEARCH_TIMEOUT_MS = 8000; // 8 seconds max per search call

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
 * Returns a JSON string containing the result, source URL, excerpt, and timestamp.
 */
async function simulateParallelSearch(query: string, category: string, isRecheck: boolean = false): Promise<string> {
  if (!query) throw new Error("Empty search query provided.");
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const q = query.toLowerCase();
  const timestamp = new Date().toISOString();
  
  let result = "";
  let url = "";
  let excerpt = "";
  
  if (q.includes('griffith') || q.includes('observatory')) {
    if (isRecheck) {
      result = "URGENT UPDATE: Griffith Observatory has suspended all exterior filming permits for the upcoming month due to emergency structural repairs on the main terrace.";
      url = "https://laparks.org/griffith/filming-updates";
      excerpt = "...effective immediately, all exterior commercial filming permits are suspended for 30 days due to terrace structural repairs...";
    } else {
      result = "Filming at Griffith Observatory requires a special 'City Park Film Permit'. Minimum 21 days notice. Night shoots require additional neighborhood noise variances.";
      url = "https://film.lacity.org/griffith-observatory-guidelines";
      excerpt = "...requires a City Park Film Permit with a minimum 21-day advance notice. Night filming (after 10 PM) mandates neighborhood noise variances...";
    }
  } else if (q.includes('weather') || q.includes('rain') || category === 'WEATHER') {
    if (isRecheck) {
      result = "URGENT UPDATE: National Weather Service has upgraded the forecast to a severe thunderstorm warning with high lightning risk. All elevated exterior filming (rooftops) must be grounded.";
      url = "https://weather.gov/alerts/ca-los-angeles";
      excerpt = "...SEVERE THUNDERSTORM WARNING IN EFFECT. High risk of lightning strikes. All elevated outdoor activities must be grounded immediately...";
    } else {
      result = "Historical weather data indicates a 70% chance of precipitation. Rain towers may not be needed, but electrical safety protocols for wet conditions must be enforced.";
      url = "https://weather.com/past/los-angeles/april";
      excerpt = "...historical averages for April show a 70% chance of precipitation. Wet-weather electrical safety protocols apply...";
    }
  } else if (q.includes('drone') || q.includes('heavy-lift')) {
    result = "Heavy-lift drones require an FAA Part 107 certified pilot and a closed-set perimeter of 500 feet. Cannot fly directly over unprotected cast/crew.";
    url = "https://faa.gov/uas/commercial_operators/filming";
    excerpt = "...heavy-lift UAS operations require Part 107 certification and a strict 500-foot closed-set perimeter. Flights over unprotected persons are strictly prohibited...";
  } else if (q.includes('motorcycle') || q.includes('vehicle') || q.includes('stunt')) {
    result = "Vintage motorcycles require a specialized picture car mechanic on set. Stunt riding requires a wet-down permit if streets are artificially wetted.";
    url = "https://sagaftra.org/stunt-safety-vehicles";
    excerpt = "...use of vintage or modified motorcycles requires a dedicated picture car mechanic. Artificial wet-downs for stunts require municipal water permits...";
  } else {
    result = `Standard filming regulations apply for '${query}'. No extraordinary restrictions found.`;
    url = "https://filmla.com/general-guidelines";
    excerpt = "...standard commercial filming guidelines apply...";
  }
  
  return JSON.stringify({ result, sourceUrl: url, excerpt, timestamp }, null, 2);
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
      s.props.some(p => p.toLowerCase().includes('weapon') || p.toLowerCase().includes('vehicle') || p.toLowerCase().includes('car') || p.toLowerCase().includes('drone'))
    );

    const systemInstruction = `You are a Production Research Agent.
EXPLICIT RULES FOR RESEARCH:
1. ALWAYS search for real-world locations to check permit rules or restrictions.
2. ALWAYS search for historical weather data if the scene is EXT (exterior).
3. ALWAYS search for specialty equipment (e.g., cranes, prop weapons, specialized vehicles, drones).
4. DO NOT search for generic indoor sets (e.g., 'INT. BEDROOM') or common everyday props.
5. CRITICAL: You have a strict limit of ${MAX_SEARCHES_PER_RUN} search queries. Prioritize the most critical logistical risks (locations, dangerous stunts, weather).

You must use the parallelSearch tool to gather this information. The tool returns a JSON string containing the result, sourceUrl, excerpt, and timestamp. If a search times out or fails, note it and set the status accordingly.`;

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

      // Enforce the cap on Parallel Search calls
      const callsToExecute = toolResponse.functionCalls.slice(0, MAX_SEARCHES_PER_RUN);
      if (toolResponse.functionCalls.length > MAX_SEARCHES_PER_RUN) {
        console.warn(`Capped searches at ${MAX_SEARCHES_PER_RUN}. Ignored ${toolResponse.functionCalls.length - MAX_SEARCHES_PER_RUN} queries.`);
      }

      const functionResponsesParts = [];
      for (const call of callsToExecute) {
        if (call.name === 'parallelSearch') {
          const args = call.args as any;
          const query = args.query || 'General search';
          const category = args.category || 'GENERAL';
          
          let result = "";
          try {
            const searchPromise = simulateParallelSearch(query, category, false);
            const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), SEARCH_TIMEOUT_MS));
            result = await Promise.race([searchPromise, timeoutPromise]);
          } catch (err) {
            if (err instanceof Error && err.message === 'TIMEOUT') {
              result = JSON.stringify({ error: "Search timed out. Research incomplete for this item.", status: "timeout" });
            } else {
              result = JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error', status: "error" });
            }
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
        systemInstruction: systemInstruction + "\n\nNow, summarize your findings into the final JSON array format. Extract the sourceUrl, excerpt, and timestamp from the tool's JSON response. If a tool response contains an error or timeout, set the 'status' field to 'timeout' or 'error' accordingly, otherwise 'success'. If no research was needed or found, return an empty array [].",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING, description: "What is being researched (e.g., 'Bank Location Permits')" },
              query: { type: Type.STRING, description: "The search query used" },
              simulatedFindings: { type: Type.STRING, description: "The result of the search or the error message" },
              relevance: { type: Type.STRING, description: "Why this matters to the production" },
              sourceUrl: { type: Type.STRING, description: "The URL of the source (empty if error)" },
              excerpt: { type: Type.STRING, description: "A short excerpt from the source (empty if error)" },
              timestamp: { type: Type.STRING, description: "The timestamp of the retrieval" },
              status: { type: Type.STRING, description: "'success', 'timeout', or 'error'" }
            },
            required: ["topic", "query", "simulatedFindings", "relevance", "sourceUrl", "excerpt", "timestamp", "status"]
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
        systemInstruction: "You are a Risk Analyst for film production. Identify potential bottlenecks, safety issues, or scheduling conflicts. Provide actionable mitigations. Assign a unique 'id' to each risk. Set 'status' to 'Open' for all new risks. If no risks are found, return an empty array [].",
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
              status: { type: Type.STRING, description: "Must be 'Open'" },
              resolutionNote: { type: Type.STRING }
            },
            required: ["id", "description", "severity", "mitigation", "affectedScenes", "status"]
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
    const recheckResults: any[] = [];

    // 2. Re-run searches with cap and timeout
    const itemsToRecheck = previousResearch.slice(0, MAX_SEARCHES_PER_RUN);
    
    for (const item of itemsToRecheck) {
      let newRawResult = "";
      let parsedNewResult: any = null;
      try {
        const searchPromise = simulateParallelSearch(item.query, 'RECHECK', true);
        const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), SEARCH_TIMEOUT_MS));
        newRawResult = await Promise.race([searchPromise, timeoutPromise]);
        parsedNewResult = JSON.parse(newRawResult);
      } catch (err) {
        if (err instanceof Error && err.message === 'TIMEOUT') {
           newRawResult = JSON.stringify({ error: "Search timed out. Research incomplete.", status: "timeout" });
        } else {
           newRawResult = JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error', status: "error" });
        }
        parsedNewResult = JSON.parse(newRawResult);
      }
      
      const newFindingText = parsedNewResult?.result || parsedNewResult?.error || newRawResult;

      onSearchLog({
        query: item.query,
        category: 'RECHECK',
        result: newFindingText,
        timestamp: Date.now()
      });

      // Compare the core finding text against the previously extracted simulatedFindings
      if (newFindingText !== item.simulatedFindings && !newFindingText.includes('Unknown error')) {
        recheckResults.push({
          topic: item.topic,
          previousResearch: item,
          newRawSearchResult: newRawResult
        });
      }
    }

    // 3. If no changes, return early
    if (recheckResults.length === 0) {
      return {
        changeReason: "Re-ran all research queries. No changes detected in real-world constraints.",
        changedFacts: [],
        updatedPlan: plan,
        updatedRisks: risks,
        newOrReopenedRisks: []
      };
    }

    // 4. If changes exist, ask Gemini to evaluate impact and update plan
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `The following are the previous research findings and the NEW raw search results just retrieved:\n${JSON.stringify(recheckResults, null, 2)}\n\nCurrent Plan:\n${JSON.stringify(plan)}\n\nCurrent Risks:\n${JSON.stringify(risks)}\n\nScenes:\n${JSON.stringify(scenes)}`,
      config: {
        systemInstruction: "You are a Change Monitor. Compare the 'previousResearch' with the 'newRawSearchResult' for each topic. If the core facts have changed, add it to 'changedFacts' and evaluate the impact on the Current Plan. Generate an updated plan that accommodates these changes (e.g., moving exterior scenes, changing locations).\n\nCRITICAL RISK EVALUATION:\nYou will receive 'Current Risks'. Some may have status 'Resolved'. If the 'changedFacts' directly contradict the resolution of a 'Resolved' risk, change its status back to 'Open' and update its 'resolutionNote' to explain why it was reopened. Do not reopen risks for unrelated reasons. Add any entirely new risks to the list. Return the complete list of all risks as 'updatedRisks'. Also, return a separate list called 'newOrReopenedRisks' containing ONLY the risks that were newly created or had their status changed from 'Resolved' to 'Open'. For 'changedFacts', pass through the provided sourceUrl, excerpt, and timestamp, and determine the 'affectedScenes'.",
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
                  sourceUrl: { type: Type.STRING },
                  excerpt: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  affectedScenes: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["topic", "previousFinding", "newFinding", "sourceUrl", "excerpt", "timestamp", "affectedScenes"]
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
            updatedRisks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  mitigation: { type: Type.STRING },
                  affectedScenes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  status: { type: Type.STRING, description: "'Open', 'In Progress', or 'Resolved'" },
                  resolutionNote: { type: Type.STRING }
                },
                required: ["id", "description", "severity", "mitigation", "affectedScenes", "status"]
              }
            },
            newOrReopenedRisks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  mitigation: { type: Type.STRING },
                  affectedScenes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  status: { type: Type.STRING },
                  resolutionNote: { type: Type.STRING }
                },
                required: ["id", "description", "severity", "mitigation", "affectedScenes", "status"]
              }
            }
          },
          required: ["changeReason", "changedFacts", "updatedPlan", "updatedRisks", "newOrReopenedRisks"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from API");
    }
    
    try {
      const parsed = JSON.parse(response.text.trim());
      return parsed;
    } catch (e) {
      throw new Error("Failed to parse JSON response from Change Monitor");
    }
  });
};
