import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export type HydraNodeType = 'Project' | 'Topic' | 'Session' | 'ToolEvent' | 'DecisionNode';

export type HydraEdgeType = 
  | 'CONTAINS'
  | 'SHARED_PATTERN_WITH'
  | 'OVERWROTE'
  | 'DEPENDS_ON'
  | 'PRODUCED';

export interface HydraNode {
  id: string;
  type: HydraNodeType;
  label: string;
  properties: Record<string, any>;
  timestamp: string;
  embedding?: number[];
}

export interface HydraEdge {
  id: string;
  source: string; // Source Node ID
  target: string; // Target Node ID
  type: HydraEdgeType;
  weight?: number;
  properties?: Record<string, any>;
  timestamp: string;
}

export interface MyceliumLink {
  id: string;
  sourceProjectId: string;
  targetProjectId: string;
  topic: string;
  strength: number; // 0.1 to 1.0
  reason: string;
}

export interface DecisionConflict {
  id: string;
  projectId: string;
  sessionId: string;
  originalDecision: string;
  newDecision: string;
  agent: string;
  timestamp: string;
}

export class HydraGraphEngine {
  private nodes: Map<string, HydraNode> = new Map();
  private edges: Map<string, HydraEdge> = new Map();
  private storagePath: string;

  constructor(customStoragePath?: string) {
    this.storagePath = customStoragePath || path.resolve(process.cwd(), 'hydradb_state.json');
  }

  public async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.nodes = new Map(Object.entries(parsed.nodes || {}));
      this.edges = new Map(Object.entries(parsed.edges || {}));
    } catch (e) {
      // Initialize fresh graph
      this.nodes = new Map();
      this.edges = new Map();
    }
  }

  public async persist(): Promise<void> {
    try {
      const payload = {
        nodes: Object.fromEntries(this.nodes),
        edges: Object.fromEntries(this.edges),
        updatedAt: new Date().toISOString()
      };
      await fs.writeFile(this.storagePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {}
  }

  public addNode(node: HydraNode): HydraNode {
    this.nodes.set(node.id, node);
    return node;
  }

  public getNode(id: string): HydraNode | undefined {
    return this.nodes.get(id);
  }

  public addEdge(
    source: string, 
    target: string, 
    type: HydraEdgeType, 
    properties: Record<string, any> = {},
    weight: number = 1.0
  ): HydraEdge {
    const id = `edge_${crypto.createHash('md5').update(`${source}_${type}_${target}`).digest('hex').substring(0, 12)}`;
    const edge: HydraEdge = {
      id,
      source,
      target,
      type,
      weight,
      properties,
      timestamp: new Date().toISOString()
    };
    this.edges.set(id, edge);
    return edge;
  }

  // Find cross-project semantic connections (Underground Mycelium Network)
  public getMyceliumLinks(): MyceliumLink[] {
    const links: MyceliumLink[] = [];
    const projects = Array.from(this.nodes.values()).filter(n => n.type === 'Project');

    // Build map of project -> topics
    const projectTopics: Record<string, Set<string>> = {};
    for (const p of projects) {
      projectTopics[p.id] = new Set();
    }

    for (const edge of this.edges.values()) {
      if (edge.type === 'CONTAINS') {
        const source = this.nodes.get(edge.source);
        const target = this.nodes.get(edge.target);
        if (source?.type === 'Project' && target?.type === 'Topic') {
          projectTopics[source.id]?.add(target.label.toLowerCase());
        }
      }
    }

    // Connect projects that share semantic themes
    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const pA = projects[i];
        const pB = projects[j];
        const topicsA = projectTopics[pA.id] || new Set();
        const topicsB = projectTopics[pB.id] || new Set();

        const commonTopics = Array.from(topicsA).filter(t => topicsB.has(t) && t !== 'general');
        if (commonTopics.length > 0) {
          const strength = Math.min(1.0, 0.3 + commonTopics.length * 0.2);
          links.push({
            id: `mycelium_${pA.id}_${pB.id}`,
            sourceProjectId: pA.id,
            targetProjectId: pB.id,
            topic: commonTopics.join(', '),
            strength,
            reason: `Shared architectural themes: ${commonTopics.join(', ')}`
          });
        }
      }
    }

    return links;
  }

  // Detect and retrieve decision overrides (LongMemEval Track 3)
  public getDecisionConflicts(): DecisionConflict[] {
    const conflicts: DecisionConflict[] = [];

    for (const edge of this.edges.values()) {
      if (edge.type === 'OVERWROTE') {
        const targetDecision = this.nodes.get(edge.target);
        const sourceSession = this.nodes.get(edge.source);

        if (targetDecision && sourceSession) {
          conflicts.push({
            id: edge.id,
            projectId: sourceSession.properties.projectId,
            sessionId: sourceSession.id,
            originalDecision: targetDecision.properties.description || targetDecision.label,
            newDecision: edge.properties?.reason || 'Agent overrode prior decision',
            agent: sourceSession.properties.provider || 'AI Agent',
            timestamp: edge.timestamp
          });
        }
      }
    }

    return conflicts;
  }

  public getFullGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      myceliumLinks: this.getMyceliumLinks(),
      decisionConflicts: this.getDecisionConflicts()
    };
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

// Global HydraDB singleton instance
export const hydra = new HydraGraphEngine();
