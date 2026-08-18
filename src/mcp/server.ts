#!/usr/bin/env node
import readline from 'readline';
import { hydra } from '../database/hydra.js';
import { getProjects, getSessions, getDb } from '../database/db.js';

// Initialize HydraDB
await hydra.init();

interface JsonRpcRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: any;
}

const TOOLS = [
  {
    name: 'tracewood_query_memory',
    description: 'Query past AI coding agent sessions, solutions, architectural patterns, and decisions across all repositories from the HydraDB graph.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or concept (e.g. "authentication JWT pattern", "database migrations", "React 19 upgrades")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sessions to return (default: 5)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'tracewood_get_project_context',
    description: 'Retrieve rich history, completed topics, modified files, and summary for a specific repository or project name.',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'The repository or project name (e.g. "tracewood", "frontend", "api")'
        }
      },
      required: ['projectName']
    }
  },
  {
    name: 'tracewood_find_decision_history',
    description: 'Inspect when and why specific architectural decisions were made or overwritten by AI agents across sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Optional project name filter'
        }
      }
    }
  },
  {
    name: 'tracewood_get_ecosystem_graph',
    description: 'Retrieve cross-repository shared themes, dependencies, and HydraDB mycelium connections across the entire workspace.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'tracewood_get_dependency_blast_radius',
    description: 'Compute reverse dependency closure in HydraDB to determine which workspace repos are exposed to a package or vulnerability.',
    inputSchema: {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name to simulate blast radius for (e.g. "express", "react", "lodash")'
        }
      },
      required: ['packageName']
    }
  },
  {
    name: 'tracewood_detect_typosquats',
    description: 'Find nearby typosquatting package names in HydraDB ecosystem graph using Levenshtein distance.',
    inputSchema: {
      type: 'object',
      properties: {
        packageName: {
          type: 'string',
          description: 'Package name to check for typosquatting variants'
        }
      },
      required: ['packageName']
    }
  }
];

async function handleToolCall(name: string, args: any) {
  if (name === 'tracewood_query_memory') {
    const q = (args.query || '').toLowerCase();
    const limit = args.limit || 5;
    const allSessions = await getSessions();
    const matches = allSessions.filter(s => {
      const matchTitle = (s.title || '').toLowerCase().includes(q);
      const matchSummary = (s.summary || '').toLowerCase().includes(q);
      const matchTopics = (s.topics || []).some(t => t.toLowerCase().includes(q));
      const matchIntent = (s.intent || '').toLowerCase().includes(q);
      return matchTitle || matchSummary || matchTopics || matchIntent;
    }).slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: args.query,
            totalFound: matches.length,
            sessions: matches.map(s => ({
              id: s.id,
              title: s.title,
              provider: s.provider,
              intent: s.intent,
              outcome: s.outcome,
              topics: s.topics,
              summary: s.summary,
              startedAt: s.startedAt,
              filesChangedCount: s.filesChanged?.length || 0
            }))
          }, null, 2)
        }
      ]
    };
  }

  if (name === 'tracewood_get_project_context') {
    const nameFilter = (args.projectName || '').toLowerCase();
    const projects = await getProjects();
    const target = projects.find(p => p.name.toLowerCase().includes(nameFilter) || p.path.toLowerCase().includes(nameFilter));

    if (!target) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Project matching "${args.projectName}" was not found in Tracewood.` })
          }
        ]
      };
    }

    const allSessions = await getSessions();
    const projSessions = allSessions.filter(s => s.projectId === target.id);
    const db = await getDb();
    const topics = await db.all('SELECT * FROM topics WHERE projectId = ?', [target.id]);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            project: target,
            totalSessions: projSessions.length,
            topics: topics.map((t: any) => t.name),
            recentSessions: projSessions.slice(-5).map(s => ({
              title: s.title,
              provider: s.provider,
              intent: s.intent,
              summary: s.summary,
              startedAt: s.startedAt
            }))
          }, null, 2)
        }
      ]
    };
  }

  if (name === 'tracewood_find_decision_history') {
    const conflicts = hydra.getDecisionConflicts();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalOverrides: conflicts.length,
            decisionConflicts: conflicts
          }, null, 2)
        }
      ]
    };
  }

  if (name === 'tracewood_get_ecosystem_graph') {
    const myceliumLinks = hydra.getMyceliumLinks();
    const projects = await getProjects();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalProjects: projects.length,
            myceliumConnections: myceliumLinks
          }, null, 2)
        }
      ]
    };
  }

  if (name === 'tracewood_get_dependency_blast_radius') {
    const blast = hydra.getDependencyBlastRadius(args.packageName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(blast, null, 2)
        }
      ]
    };
  }

  if (name === 'tracewood_detect_typosquats') {
    const typosquats = hydra.detectTyposquats(args.packageName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            targetPackage: args.packageName,
            nearbyVariantsFound: typosquats.length,
            variants: typosquats
          }, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// JSON-RPC stdio loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(id: any, result: any) {
  process.stdout.write(JSON.stringify({
    jsonrpc: '2.0',
    id,
    result
  }) + '\n');
}

function sendError(id: any, code: number, message: string) {
  process.stdout.write(JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  }) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const req: JsonRpcRequest = JSON.parse(line);

    if (req.method === 'initialize') {
      sendResponse(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'tracewood-mcp-server',
          version: '1.0.0'
        }
      });
      return;
    }

    if (req.method === 'tools/list') {
      sendResponse(req.id, { tools: TOOLS });
      return;
    }

    if (req.method === 'tools/call') {
      const toolName = req.params?.name;
      const toolArgs = req.params?.arguments || {};
      try {
        const result = await handleToolCall(toolName, toolArgs);
        sendResponse(req.id, result);
      } catch (err: any) {
        sendError(req.id, -32603, err.message);
      }
      return;
    }

    if (req.method === 'notifications/initialized') {
      return; // No response needed
    }

    sendError(req.id, -32601, `Method not found: ${req.method}`);
  } catch (e: any) {
    sendError(null, -32700, `Parse error: ${e.message}`);
  }
});
