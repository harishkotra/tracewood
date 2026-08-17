import crypto from 'crypto';
import { Session, Event, AgentProvider } from '../../database/types.js';

export interface RawParsedSession {
  id: string;
  provider: AgentProvider;
  projectPath: string;
  projectName: string;
  startedAt: string;
  endedAt?: string;
  title?: string;
  summary?: string;
  intent?: Session['intent'];
  topics: string[];
  filesChanged: string[];
  toolCallCount: number;
  tokenCount?: number;
  estimatedCost?: number;
  outcome?: Session['outcome'];
  importance?: number;
  events: Omit<Event, 'id' | 'sessionId'>[];
}

export function normalizeSession(raw: RawParsedSession): { session: Session; events: Event[] } {
  // Generate deterministic projectId from projectPath
  const projectId = crypto.createHash('md5').update(raw.projectPath).digest('hex').substring(0, 16);
  
  const session: Session = {
    id: raw.id,
    provider: raw.provider,
    projectId,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt || raw.startedAt,
    title: raw.title || `Session ${raw.id.substring(0, 6)}`,
    summary: raw.summary,
    intent: raw.intent || 'other',
    topics: raw.topics || [],
    filesChanged: raw.filesChanged || [],
    toolCallCount: raw.toolCallCount || 0,
    tokenCount: raw.tokenCount,
    estimatedCost: raw.estimatedCost,
    outcome: raw.outcome || 'unknown',
    importance: raw.importance || 0.1,
  };

  const events: Event[] = raw.events.map((e, index) => ({
    id: `${session.id}_evt_${index}`,
    sessionId: session.id,
    type: e.type,
    name: e.name,
    content: e.content,
    timestamp: e.timestamp
  }));

  return { session, events };
}
