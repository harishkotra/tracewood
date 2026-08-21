import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { hydraCloud } from './hydraCloud.js';

export type HydraNodeType = 'Project' | 'Topic' | 'Session' | 'ToolEvent' | 'DecisionNode' | 'Package' | 'Symbol' | 'Constraint' | 'Endpoint';

export type HydraEdgeType = 
  | 'CONTAINS'
  | 'SHARED_PATTERN_WITH'
  | 'OVERWROTE'
  | 'REVISED_BY'
  | 'DEPENDS_ON'
  | 'PRODUCED'
  | 'DEFINES'
  | 'CALLS'
  | 'EXPOSES'
  | 'CONSUMES'
  | 'VIOLATES';

export interface DecisionLineage {
  originalDecisionId: string;
  originalDescription: string;
  revisions: {
    sessionId: string;
    agent: string;
    newDescription: string;
    timestamp: string;
  }[];
}

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
  source: string;
  target: string;
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
  strength: number;
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

export interface BlastRadiusResult {
  packageName: string;
  affectedProjectIds: string[];
  affectedProjectNames: string[];
  blastPercentage: number;
}

export interface TroubledBranch {
  topicId: string;
  topicName: string;
  projectId: string;
  projectName: string;
  failedCount: number;
  totalSessions: number;
  failureRate: number;
  reason: string;
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
      this.nodes = new Map();
      this.edges = new Map();
    }

    // Initialize official HydraDB API connection if key present
    await hydraCloud.initDatabase();
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

  // Dependency Scanner & Blast Radius
  public async scanProjectDependencies(projectId: string, projectPath: string): Promise<string[]> {
    const packages: string[] = [];
    
    // Check package.json
    try {
      const pkgPath = path.join(projectPath, 'package.json');
      const raw = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      const deps = { ...(raw.dependencies || {}), ...(raw.devDependencies || {}) };

      for (const [pkgName, version] of Object.entries(deps)) {
        const pkgId = `pkg_${pkgName}`;
        this.addNode({
          id: pkgId,
          type: 'Package',
          label: pkgName,
          properties: { version, ecosystem: 'npm' },
          timestamp: new Date().toISOString()
        });

        this.addEdge(projectId, pkgId, 'DEPENDS_ON', { version });
        packages.push(pkgName);
      }
    } catch (e) {}

    // Check requirements.txt
    try {
      const reqPath = path.join(projectPath, 'requirements.txt');
      const raw = await fs.readFile(reqPath, 'utf-8');
      const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

      for (const line of lines) {
        const pkgName = line.split(/[==|>=|<=]/)[0].trim();
        if (pkgName) {
          const pkgId = `pkg_${pkgName}`;
          this.addNode({
            id: pkgId,
            type: 'Package',
            label: pkgName,
            properties: { line, ecosystem: 'pypi' },
            timestamp: new Date().toISOString()
          });

          this.addEdge(projectId, pkgId, 'DEPENDS_ON', { spec: line });
          packages.push(pkgName);
        }
      }
    } catch (e) {}
    return packages;
  }

  // Implicit Cross-Repo API Endpoint & Constraint Scanner
  public async scanProjectEndpointsAndConstraints(projectId: string, projectPath: string): Promise<{ endpoints: string[]; constraints: string[] }> {
    const endpoints: string[] = [];
    const constraints: string[] = [];

    try {
      // Scan for README or doc architectural constraints
      const readmePath = path.join(projectPath, 'README.md');
      try {
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        const lines = readmeContent.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().includes('must') || line.toLowerCase().includes('require') || line.toLowerCase().includes('never')) {
            const constraintText = line.replace(/^[-*#>\s]+/, '').trim();
            if (constraintText.length > 15 && constraintText.length < 120) {
              const cId = `constraint_${crypto.createHash('md5').update(`${projectId}_${constraintText}`).digest('hex').substring(0, 12)}`;
              this.addNode({
                id: cId,
                type: 'Constraint',
                label: constraintText,
                properties: { projectId, source: 'README.md' },
                timestamp: new Date().toISOString()
              });
              this.addEdge(projectId, cId, 'CONTAINS');
              constraints.push(constraintText);
            }
          }
        }
      } catch (e) {}

      // Scan src directory for API Endpoints & Client Calls
      const srcDir = path.join(projectPath, 'src');
      try {
        const files = await fs.readdir(srcDir, { recursive: true });
        for (const f of files) {
          if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py'))) {
            const fullFilePath = path.join(srcDir, f);
            try {
              const code = await fs.readFile(fullFilePath, 'utf-8');
              
              // Express/Fastify/Next route handlers
              const routeMatches = code.matchAll(/(app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g);
              for (const match of routeMatches) {
                const route = `${match[2].toUpperCase()} ${match[3]}`;
                const epId = `endpoint_${crypto.createHash('md5').update(route).digest('hex').substring(0, 12)}`;
                this.addNode({
                  id: epId,
                  type: 'Endpoint',
                  label: route,
                  properties: { route: match[3], method: match[2].toUpperCase(), file: f },
                  timestamp: new Date().toISOString()
                });
                this.addEdge(projectId, epId, 'EXPOSES');
                endpoints.push(route);
              }

              // Fetch/Axios client calls to endpoints
              const callMatches = code.matchAll(/(fetch|axios\.(get|post|put|delete))\(['"]([^'"]+)['"]/g);
              for (const match of callMatches) {
                const url = match[3];
                if (url.startsWith('/api') || url.startsWith('http')) {
                  const targetEpId = `endpoint_${crypto.createHash('md5').update(`GET ${url}`).digest('hex').substring(0, 12)}`;
                  if (this.nodes.has(targetEpId)) {
                    this.addEdge(projectId, targetEpId, 'CONSUMES', { file: f });
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    } catch (e) {}

    return { endpoints, constraints };
  }

  public detectConstraintViolations(): { constraintId: string; constraintText: string; violatingSessionId: string; reason: string }[] {
    const violations: { constraintId: string; constraintText: string; violatingSessionId: string; reason: string }[] = [];
    const constraints = Array.from(this.nodes.values()).filter(n => n.type === 'Constraint');

    for (const constraint of constraints) {
      const cText = constraint.label.toLowerCase();
      // Search sessions that mention terms conflicting with the constraint
      for (const edge of this.edges.values()) {
        if (edge.type === 'OVERWROTE' || edge.type === 'REVISED_BY') {
          const session = this.nodes.get(edge.source);
          if (session && session.properties.summary) {
            const summary = session.properties.summary.toLowerCase();
            if ((cText.includes('auth') && summary.includes('removed auth')) ||
                (cText.includes('token') && summary.includes('bypass')) ||
                (cText.includes('rate limit') && summary.includes('disable'))) {
              
              const vId = `viol_${session.id}_${constraint.id}`;
              this.addEdge(session.id, constraint.id, 'VIOLATES', { reason: session.properties.summary });
              violations.push({
                constraintId: constraint.id,
                constraintText: constraint.label,
                violatingSessionId: session.id,
                reason: session.properties.summary
              });
            }
          }
        }
      }
    }
    return violations;
  }

  public getDependencyBlastRadius(packageName: string): BlastRadiusResult {
    const cleanPkg = packageName.toLowerCase();
    const pkgId = `pkg_${cleanPkg}`;
    const affectedProjectIds: string[] = [];
    const affectedProjectNames: string[] = [];

    const allProjects = Array.from(this.nodes.values()).filter(n => n.type === 'Project');

    for (const edge of this.edges.values()) {
      if (edge.type === 'DEPENDS_ON') {
        const targetNode = this.nodes.get(edge.target);
        if (targetNode?.label?.toLowerCase() === cleanPkg || edge.target === pkgId) {
          const sourceProj = this.nodes.get(edge.source);
          if (sourceProj && sourceProj.type === 'Project' && !affectedProjectIds.includes(sourceProj.id)) {
            affectedProjectIds.push(sourceProj.id);
            affectedProjectNames.push(sourceProj.label);
          }
        }
      }
    }

    const blastPercentage = allProjects.length > 0
      ? Math.round((affectedProjectIds.length / allProjects.length) * 100)
      : 0;

    return {
      packageName,
      affectedProjectIds,
      affectedProjectNames,
      blastPercentage
    };
  }

  public getAllKnownPackages(): { name: string; projectCount: number }[] {
    const pkgMap: Record<string, Set<string>> = {};

    for (const edge of this.edges.values()) {
      if (edge.type === 'DEPENDS_ON') {
        const target = this.nodes.get(edge.target);
        const source = this.nodes.get(edge.source);
        if (target && source) {
          if (!pkgMap[target.label]) pkgMap[target.label] = new Set();
          pkgMap[target.label].add(source.id);
        }
      }
    }

    return Object.entries(pkgMap)
      .map(([name, projs]) => ({ name, projectCount: projs.size }))
      .sort((a, b) => b.projectCount - a.projectCount);
  }

  public detectTyposquats(packageName: string): string[] {
    const known = this.getAllKnownPackages().map(p => p.name);
    const target = packageName.toLowerCase();

    function levenshteinDistance(a: string, b: string): number {
      const matrix: number[][] = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }

    return known.filter(name => {
      const clean = name.toLowerCase();
      if (clean === target) return false;
      const dist = levenshteinDistance(target, clean);
      return dist > 0 && dist <= 2;
    });
  }

  public getDecisionLineage(decisionId: string): DecisionLineage | null {
    const rootNode = this.nodes.get(decisionId);
    if (!rootNode || rootNode.type !== 'DecisionNode') return null;

    const revisions: DecisionLineage['revisions'] = [];
    const visited = new Set<string>();
    const queue = [decisionId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      for (const edge of this.edges.values()) {
        if ((edge.type === 'OVERWROTE' || edge.type === 'REVISED_BY') && edge.target === currentId) {
          const sessionNode = this.nodes.get(edge.source);
          if (sessionNode) {
            revisions.push({
              sessionId: sessionNode.id,
              agent: sessionNode.properties.provider || 'AI Agent',
              newDescription: edge.properties?.reason || sessionNode.label,
              timestamp: edge.timestamp
            });
            queue.push(sessionNode.id);
          }
        }
      }
    }

    return {
      originalDecisionId: rootNode.id,
      originalDescription: rootNode.properties.description || rootNode.label,
      revisions
    };
  }

  public executeCypherTraversal(cypherQuery: string): {
    query: string;
    nodes: HydraNode[];
    edges: HydraEdge[];
    pathsCount: number;
  } {
    const qLower = cypherQuery.toLowerCase();
    let nodeTypes: HydraNodeType[] = [];
    let edgeTypes: HydraEdgeType[] = [];

    if (qLower.includes('project')) nodeTypes.push('Project');
    if (qLower.includes('topic')) nodeTypes.push('Topic');
    if (qLower.includes('session')) nodeTypes.push('Session');
    if (qLower.includes('decisionnode')) nodeTypes.push('DecisionNode');
    if (qLower.includes('package')) nodeTypes.push('Package');
    if (qLower.includes('symbol')) nodeTypes.push('Symbol');
    if (qLower.includes('constraint')) nodeTypes.push('Constraint');
    if (qLower.includes('endpoint')) nodeTypes.push('Endpoint');

    if (qLower.includes('contains')) edgeTypes.push('CONTAINS');
    if (qLower.includes('depends_on')) edgeTypes.push('DEPENDS_ON');
    if (qLower.includes('overwrote')) edgeTypes.push('OVERWROTE');
    if (qLower.includes('revised_by')) edgeTypes.push('REVISED_BY');
    if (qLower.includes('defines')) edgeTypes.push('DEFINES');
    if (qLower.includes('calls')) edgeTypes.push('CALLS');
    if (qLower.includes('exposes')) edgeTypes.push('EXPOSES');
    if (qLower.includes('consumes')) edgeTypes.push('CONSUMES');
    if (qLower.includes('violates')) edgeTypes.push('VIOLATES');

    const filteredNodes = Array.from(this.nodes.values()).filter(n => {
      if (nodeTypes.length > 0 && !nodeTypes.includes(n.type)) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = Array.from(this.edges.values()).filter(e => {
      if (edgeTypes.length > 0 && !edgeTypes.includes(e.type)) return false;
      return nodeIds.has(e.source) && nodeIds.has(e.target);
    });

    return {
      query: cypherQuery,
      nodes: filteredNodes.slice(0, 50),
      edges: filteredEdges.slice(0, 50),
      pathsCount: filteredEdges.length
    };
  }

  public queryGraph(params: {
    nodeType?: HydraNodeType;
    edgeType?: HydraEdgeType;
    searchTerm?: string;
  }): { nodes: HydraNode[]; edges: HydraEdge[] } {
    const matchedNodes = Array.from(this.nodes.values()).filter(n => {
      if (params.nodeType && n.type !== params.nodeType) return false;
      if (params.searchTerm) {
        const term = params.searchTerm.toLowerCase();
        return n.label.toLowerCase().includes(term) ||
               JSON.stringify(n.properties).toLowerCase().includes(term);
      }
      return true;
    });

    const matchedNodeIds = new Set(matchedNodes.map(n => n.id));
    const matchedEdges = Array.from(this.edges.values()).filter(e => {
      if (params.edgeType && e.type !== params.edgeType) return false;
      return matchedNodeIds.has(e.source) || matchedNodeIds.has(e.target);
    });

    return { nodes: matchedNodes, edges: matchedEdges };
  }

  // 2. Cross-project semantic connections (Underground Mycelium Network)
  public getMyceliumLinks(): MyceliumLink[] {
    const links: MyceliumLink[] = [];
    const projects = Array.from(this.nodes.values()).filter(n => n.type === 'Project');

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

  // 3. Detect and retrieve decision overrides
  getDecisionConflicts(): DecisionConflict[] {
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

  // 4. "Tend the Garden" Troubled Branch Detection
  public getTroubledBranches(): TroubledBranch[] {
    const troubled: TroubledBranch[] = [];
    const topics = Array.from(this.nodes.values()).filter(n => n.type === 'Topic');

    for (const topic of topics) {
      // Find all sessions connected to this topic
      const topicSessionIds = Array.from(this.edges.values())
        .filter(e => e.source === topic.id && e.type === 'CONTAINS')
        .map(e => e.target);

      const topicSessions = topicSessionIds
        .map(id => this.nodes.get(id))
        .filter((n): n is HydraNode => !!n && n.type === 'Session');

      if (topicSessions.length > 0) {
        const failedSessions = topicSessions.filter(s => s.properties.outcome === 'failed');
        const highChurnSessions = topicSessions.filter(s => (s.properties.toolCallCount || 0) > 20);

        if (failedSessions.length > 0 || highChurnSessions.length > 0) {
          const project = this.nodes.get(topic.properties.projectId);
          const failureRate = Math.round((failedSessions.length / topicSessions.length) * 100);
          
          troubled.push({
            topicId: topic.id,
            topicName: topic.label,
            projectId: topic.properties.projectId,
            projectName: project?.label || 'Project',
            failedCount: failedSessions.length,
            totalSessions: topicSessions.length,
            failureRate,
            reason: failedSessions.length > 0 
              ? `${failedSessions.length} failed agent runs detected.` 
              : `High tool churn detected (${highChurnSessions.length} heavy sessions).`
          });
        }
      }
    }

    return troubled;
  }

  public diagnoseAndHealBranch(topicId: string): { diagnosis: string; suggestedFix: string } {
    const topic = this.nodes.get(topicId);
    return {
      diagnosis: `Topic "${topic?.label || 'Branch'}" experienced friction during recent test executions and tool retries.`,
      suggestedFix: `Refactor module boundaries in ${topic?.label || 'module'} and decouple external side-effects into pure functions with mock assertions.`
    };
  }

  public getFullGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      myceliumLinks: this.getMyceliumLinks(),
      decisionConflicts: this.getDecisionConflicts(),
      troubledBranches: this.getTroubledBranches(),
      knownPackages: this.getAllKnownPackages()
    };
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

export const hydra = new HydraGraphEngine();
