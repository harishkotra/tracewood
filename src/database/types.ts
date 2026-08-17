export type AgentProvider = "claude" | "codex" | "opencode" | "pi";

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
}

export interface Topic {
  id: string;
  projectId: string;
  name: string; // e.g. "Authentication"
  description?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  provider: AgentProvider;
  projectId: string;
  topicId?: string; // Grouped theme
  startedAt: string;
  endedAt?: string;
  title?: string;
  summary?: string;
  intent?: "feature" | "bugfix" | "refactor" | "research" | "configuration" | "testing" | "deployment" | "other";
  topics: string[]; // Raw tags/topics
  filesChanged: string[]; // List of files
  toolCallCount: number;
  tokenCount?: number;
  estimatedCost?: number;
  outcome?: "success" | "partial" | "failed" | "unknown";
  importance?: number; // 0.0 to 1.0
  embedding?: number[];
}

export interface Event {
  id: string;
  sessionId: string;
  type: string; // "tool_call" | "message" | "error" | etc.
  name: string;
  content?: string;
  timestamp: string;
}
