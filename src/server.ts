import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import os from 'os';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { 
  getDb,
  getProjects, 
  getProject, 
  getTopics, 
  getSessions, 
  getEvents, 
  clearAllData 
} from './database/db.js';
import { runScan, saveIntelligenceConfig } from './ingestion/index.js';
import { detectAgentHarnesses } from './ingestion/detector.js';
import { hydra } from './database/hydra.js';
import { analyzeSession, fallbackAnalysis, IntelligenceConfig } from './intelligence/provider/index.js';
import { normalizeSession } from './ingestion/normalize/index.js';
import { saveProject, saveSession, saveEvents, saveTopic } from './database/db.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../config.json');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// WebSocket connection handling
const clients = new Set<WebSocket>();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

function broadcast(msg: any) {
  const payload = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ---------------- API ENDPOINTS ----------------

// Unified forest loader to hydrate the entire 3D scene at once
app.get('/api/forest', async (_req, res) => {
  try {
    const projects = await getProjects();
    const allSessions = await getSessions();
    const db = await getDb();
    const allTopics = await db.all('SELECT * FROM topics');

    const topicsMap: Record<string, any[]> = {};
    const sessionsMap: Record<string, any[]> = {};

    for (const p of projects) {
      topicsMap[p.id] = allTopics.filter(t => t.projectId === p.id);
      sessionsMap[p.id] = allSessions.filter(s => s.projectId === p.id);
    }

    res.json({
      projects,
      topics: topicsMap,
      sessions: sessionsMap
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/topics', async (req, res) => {
  try {
    const topics = await getTopics(req.params.id);
    res.json(topics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/sessions', async (req, res) => {
  try {
    const sessions = await getSessions(req.params.id);
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id/events', async (req, res) => {
  try {
    const events = await getEvents(req.params.id);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', async (_req, res) => {
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (e) {
    res.json({ provider: 'none', model: 'llama3', endpoint: 'http://localhost:11434' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const config: IntelligenceConfig = req.body;
    await saveIntelligenceConfig(config);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scan', async (_req, res) => {
  try {
    const result = await runScan();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/harnesses', async (_req, res) => {
  try {
    const harnesses = await detectAgentHarnesses();
    res.json(harnesses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blast-radius', async (req, res) => {
  try {
    const { packageName } = req.body;
    const result = hydra.getDependencyBlastRadius(packageName || '');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/heal-branch', async (req, res) => {
  try {
    const { topicId } = req.body;
    const result = hydra.diagnoseAndHealBranch(topicId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/graph/query', async (req, res) => {
  try {
    const { nodeType, edgeType, q } = req.query;
    const result = hydra.queryGraph({
      nodeType: nodeType as any,
      edgeType: edgeType as any,
      searchTerm: q as string
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recap', async (_req, res) => {
  try {
    const sessions = await getSessions();
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.startedAt.startsWith(today));

    if (todaySessions.length === 0) {
      return res.json({
        recap: "No growth observed in your forest today. Start coding to plant new seeds!"
      });
    }

    let intelConfig: IntelligenceConfig;
    try {
      intelConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    } catch {
      intelConfig = { provider: 'none', model: 'llama3' };
    }

    if (intelConfig.provider === 'none') {
      const uniqueProjects = Array.from(new Set(todaySessions.map(s => s.projectId))).length;
      const intents = todaySessions.map(s => s.intent || 'other');
      const uniqueIntents = Array.from(new Set(intents));
      const fileCount = todaySessions.reduce((acc, s) => acc + s.filesChanged.length, 0);

      const recapText = `Today your forest grew mostly around:
${Array.from(new Set(todaySessions.flatMap(s => s.topics))).join(', ')}

You spent the most time on ${uniqueIntents[0] || 'feature development'}.
${todaySessions.length} sessions completed across ${uniqueProjects} projects.
Modified ${fileCount} files.`;

      return res.json({ recap: recapText });
    }

    const prompt = `Synthesize today's coding activity into a short, poetic daily summary.
Activity logs:
${todaySessions.map(s => `- Session "${s.title}": Intent: ${s.intent}, Topics: ${s.topics.join(', ')}, Files changed: ${s.filesChanged.length}`).join('\n')}

Format as 3-4 short lines. Highlight key focus topics. Do NOT use markdown bold/italic tags.`;

    try {
      const analysis = await analyzeSession({} as any, [prompt], intelConfig);
      res.json({ recap: analysis.summary });
    } catch {
      res.json({
        recap: `Today's growth centered on: ${Array.from(new Set(todaySessions.flatMap(s => s.topics))).join(', ')}.`
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- FILE WATCHER ----------------

const homeDir = os.homedir();
const claudeWatchPath = path.join(homeDir, '.claude', 'projects');

const watcher = chokidar.watch(claudeWatchPath, {
  persistent: true,
  ignoreInitial: true,
  depth: 3
});

watcher.on('add', handleWatchedFile);
watcher.on('change', handleWatchedFile);

async function handleWatchedFile(filePath: string) {
  if (!filePath.endsWith('.jsonl')) return;
  await new Promise(r => setTimeout(r, 1000));

  try {
    const parentDir = path.basename(path.dirname(filePath));
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return;

    let startedAt = new Date().toISOString();
    let endedAt = startedAt;
    const filesChanged = new Set<string>();
    let toolCallCount = 0;
    const events: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const data = JSON.parse(lines[i]);
      const timestamp = data.timestamp || data.time || new Date().toISOString();
      if (i === 0) startedAt = timestamp;
      endedAt = timestamp;

      if (data.type === 'tool_use' || data.type === 'tool_call' || data.toolName) {
        toolCallCount++;
        const toolName = data.toolName || (data.tool && data.tool.name) || 'unknown_tool';
        if (['write_file', 'edit_file', 'patch_file', 'replace_file'].includes(toolName)) {
          const fileParam = data.toolInput?.path || data.toolInput?.filePath || data.args?.path || '';
          if (fileParam) filesChanged.add(path.basename(fileParam));
        }
        events.push({
          type: 'tool_call',
          name: toolName,
          content: JSON.stringify(data.toolInput || data.args || {}),
          timestamp
        });
      } else if (data.type === 'user' || data.role === 'user') {
        events.push({
          type: 'message',
          name: 'user_prompt',
          content: data.text || data.content || '',
          timestamp
        });
      }
    }

    const sessionId = `claude_${path.basename(filePath, '.jsonl')}`;
    const projectId = crypto.createHash('md5').update(parentDir).digest('hex').substring(0, 16);
    
    const project = await saveProject({
      id: projectId,
      name: parentDir.split('_').pop() || parentDir,
      path: parentDir
    });

    const sessionData = {
      id: sessionId,
      provider: 'claude' as const,
      projectId,
      startedAt,
      endedAt,
      title: `Active session in ${project.name}`,
      topics: [],
      filesChanged: Array.from(filesChanged),
      toolCallCount,
      events
    };

    let intelConfig: IntelligenceConfig = { provider: 'none', model: 'llama3' };
    try {
      intelConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    } catch {}

    const analysis = await analyzeSession(sessionData as any, [], intelConfig);
    const topic = await saveTopic(projectId, analysis.topics[0] || 'General');

    const session = {
      ...sessionData,
      topicId: topic.id,
      summary: analysis.summary,
      intent: analysis.intent,
      topics: analysis.topics,
      importance: analysis.importance,
      outcome: analysis.outcome
    };

    await saveSession(session);
    await saveEvents(events.map((e, idx) => ({
      id: `${sessionId}_evt_${idx}`,
      sessionId,
      ...e
    })));

    broadcast({
      type: 'growth',
      session: {
        id: session.id,
        projectId: session.projectId,
        topicId: session.topicId,
        topicName: topic.name,
        intent: session.intent,
        outcome: session.outcome,
        importance: session.importance
      }
    });

  } catch (err) {}
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🌲 Tracewood Backend Server running on http://localhost:${PORT}`);
});
