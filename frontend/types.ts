export interface Scene {
  sceneNumber: string;
  heading: string;
  setting: string;
  timeOfDay: string;
  summary: string;
  characters: string[];
  locations: string[];
  props: string[];
  specialRequirements: string[];
  dependencies: string[];
}

export interface SearchLog {
  query: string;
  category: string;
  result: string;
  timestamp: number;
}

export interface ResearchItem {
  topic: string;
  query: string;
  simulatedFindings: string;
  relevance: string;
  sourceUrl: string;
  excerpt: string;
  timestamp: string;
}

export interface ShootDay {
  dayNumber: number;
  locations: string[];
  scenes: string[];
  estimatedHours: number;
  notes: string;
}

export interface Risk {
  id: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  mitigation: string;
  affectedScenes: string[];
}

export interface ChangedFact {
  topic: string;
  previousFinding: string;
  newFinding: string;
  sourceUrl: string;
  excerpt: string;
  timestamp: string;
  affectedScenes: string[];
}

export interface ChangeReport {
  id?: string;
  timestamp?: number;
  changeReason: string;
  changedFacts: ChangedFact[];
  updatedPlan: ShootDay[];
  newRisks: Risk[];
}

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface PipelineState {
  scriptAnalyst: { status: AgentStatus; data: Scene[] | null; error?: string };
  researchAgent: { status: AgentStatus; data: ResearchItem[] | null; logs: SearchLog[]; error?: string };
  productionPlanner: { status: AgentStatus; data: ShootDay[] | null; error?: string };
  riskAnalyst: { status: AgentStatus; data: Risk[] | null; error?: string };
  changeMonitor: { status: AgentStatus; data: ChangeReport | null; history: ChangeReport[]; error?: string };
  locationVisualizer: { status: AgentStatus; data: Record<string, string> | null; error?: string };
}

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // base64 encoded data
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  agent: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'request';
}
