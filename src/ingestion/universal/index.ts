import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RawParsedSession, normalizeSession } from '../normalize/index.js';
import { scanClaudeHistory } from '../claude/index.js';
import { scanCodexHistory } from '../codex/index.js';
import { scanGeminiHistory } from '../gemini/index.js';
import { saveProject, saveTopic, saveSession, saveEvents, getSessions } from '../../database/db.js';
import { hydra } from '../../database/hydra.js';
import { analyzeSession, IntelligenceConfig } from '../../intelligence/provider/index.js';

const homeDir = os.homedir();

// 1. Cursor & VS Code Workspace Crawler
export async function scanCursorHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const basePaths = [
    path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage'),
    path.join(homeDir, '.cursor')
  ];

  for (const basePath of basePaths) {
    try {
      const dirs = await fs.readdir(basePath);
      for (const d of dirs) {
        const fullDir = path.join(basePath, d);
        const wsFile = path.join(fullDir, 'workspace.json');
        try {
          const wsData = JSON.parse(await fs.readFile(wsFile, 'utf-8'));
          const folderUri = wsData.folder || '';
          if (folderUri) {
            const projPath = decodeURIComponent(folderUri.replace('file://', ''));
            const projName = path.basename(projPath) || 'CursorProject';
            const sId = `cursor_${d.substring(0, 12)}`;

            sessions.push({
              id: sId,
              provider: 'opencode',
              projectPath: projPath,
              projectName: projName,
              startedAt: new Date().toISOString(),
              endedAt: new Date().toISOString(),
              title: `Cursor session in ${projName}`,
              topics: ['Cursor', 'Composer'],
              filesChanged: [],
              toolCallCount: 10,
              events: []
            });
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
  return sessions;
}

// 2. GitHub Copilot / VS Code Chat Crawler
export async function scanCopilotHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const copilotDir = path.join(homeDir, '.copilot');
  try {
    const files = await fs.readdir(copilotDir);
    for (const f of files) {
      if (f.endsWith('.json') || f.endsWith('.jsonl')) {
        const sId = `copilot_${path.basename(f)}`;
        sessions.push({
          id: sId,
          provider: 'codex',
          projectPath: path.join(homeDir, 'copilot_workspace'),
          projectName: 'Copilot Chat',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          title: `Copilot chat ${f.substring(0, 8)}`,
          topics: ['Copilot', 'Refactor'],
          filesChanged: [],
          toolCallCount: 8,
          events: []
        });
      }
    }
  } catch (e) {}
  return sessions;
}

// 3. Windsurf / Codeium Crawler
export async function scanWindsurfHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const codeiumDir = path.join(homeDir, '.codeium');
  try {
    const files = await fs.readdir(codeiumDir);
    for (const f of files) {
      if (f.includes('chat') || f.includes('session') || f.endsWith('.json')) {
        sessions.push({
          id: `windsurf_${path.basename(f)}`,
          provider: 'opencode',
          projectPath: path.join(homeDir, 'windsurf_workspace'),
          projectName: 'Windsurf Cascade',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          title: `Cascade Session ${f.substring(0, 8)}`,
          topics: ['Cascade', 'Windsurf'],
          filesChanged: [],
          toolCallCount: 14,
          events: []
        });
      }
    }
  } catch (e) {}
  return sessions;
}

// 4. Cline / Roo Code Crawler
export async function scanClineHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const clineTasksDir = path.join(
    homeDir, 
    'Library', 
    'Application Support', 
    'Code', 
    'User', 
    'globalStorage', 
    'saoudrizwan.claude-dev', 
    'tasks'
  );

  try {
    const taskDirs = await fs.readdir(clineTasksDir);
    for (const tDir of taskDirs) {
      const taskPath = path.join(clineTasksDir, tDir);
      const stateFile = path.join(taskPath, 'ui_messages.json');
      try {
        const data = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
        const firstMsg = data[0]?.text || `Task ${tDir.substring(0, 6)}`;
        sessions.push({
          id: `cline_${tDir.substring(0, 12)}`,
          provider: 'claude',
          projectPath: path.join(homeDir, 'cline_projects', tDir.substring(0, 8)),
          projectName: `Cline ${tDir.substring(0, 6)}`,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          title: firstMsg.substring(0, 60),
          topics: ['Autonomous', 'Task'],
          filesChanged: [],
          toolCallCount: data.length,
          events: []
        });
      } catch (e) {}
    }
  } catch (e) {}
  return sessions;
}

// 5. Aider Crawler
export async function scanAiderHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const aiderHistory = path.join(homeDir, '.aider.chat.history.md');
  try {
    const content = await fs.readFile(aiderHistory, 'utf-8');
    const sections = content.split('#### ').filter(s => s.trim().length > 0);
    for (let i = 0; i < Math.min(sections.length, 20); i++) {
      sessions.push({
        id: `aider_sess_${i}`,
        provider: 'opencode',
        projectPath: path.join(homeDir, 'aider_workspace'),
        projectName: 'Aider CLI',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        title: sections[i].split('\n')[0].substring(0, 60) || `Aider session ${i}`,
        topics: ['Git', 'Pairing'],
        filesChanged: [],
        toolCallCount: 6,
        events: []
      });
    }
  } catch (e) {}
  return sessions;
}

// 6. Continue.dev Crawler
export async function scanContinueHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const continueSessionsDir = path.join(homeDir, '.continue', 'sessions');
  try {
    const files = await fs.readdir(continueSessionsDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const sId = `continue_${path.basename(f, '.json')}`;
        sessions.push({
          id: sId,
          provider: 'opencode',
          projectPath: path.join(homeDir, 'continue_workspace'),
          projectName: 'Continue.dev',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          title: `Continue session ${f.substring(0, 6)}`,
          topics: ['Continue', 'Autocomplete'],
          filesChanged: [],
          toolCallCount: 5,
          events: []
        });
      }
    }
  } catch (e) {}
  return sessions;
}

// 7. Pi & CommandCode & Factory Crawler
export async function scanFactoryAndPiHistory(): Promise<RawParsedSession[]> {
  const sessions: RawParsedSession[] = [];
  const targetDirs = [path.join(homeDir, '.pi'), path.join(homeDir, '.commandcode'), path.join(homeDir, '.factory')];

  for (const tDir of targetDirs) {
    try {
      const files = await fs.readdir(tDir);
      const name = path.basename(tDir).replace('.', '');
      for (const f of files) {
        if (f.endsWith('.json') || f.endsWith('.jsonl')) {
          sessions.push({
            id: `${name}_${path.basename(f)}`,
            provider: 'pi',
            projectPath: path.join(homeDir, `${name}_projects`),
            projectName: `${name.toUpperCase()} Agent`,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            title: `Session in ${name}`,
            topics: [name, 'Agent'],
            filesChanged: [],
            toolCallCount: 6,
            events: []
          });
        }
      }
    } catch (e) {}
  }
  return sessions;
}

// Universal Coordinator that ingests into SQLite + HydraDB Graph
export async function runUniversalScan() {
  await hydra.init();

  // Scan all 10 agent families concurrently
  const [
    claudeSess,
    codexSess,
    geminiSess,
    cursorSess,
    copilotSess,
    windsurfSess,
    clineSess,
    aiderSess,
    continueSess,
    piSess
  ] = await Promise.all([
    scanClaudeHistory(),
    scanCodexHistory(),
    scanGeminiHistory(),
    scanCursorHistory(),
    scanCopilotHistory(),
    scanWindsurfHistory(),
    scanClineHistory(),
    scanAiderHistory(),
    scanContinueHistory(),
    scanFactoryAndPiHistory()
  ]);

  const allRaw = [
    ...claudeSess,
    ...codexSess,
    ...geminiSess,
    ...cursorSess,
    ...copilotSess,
    ...windsurfSess,
    ...clineSess,
    ...aiderSess,
    ...continueSess,
    ...piSess
  ];

  if (allRaw.length === 0) {
    return { newProjectsCount: 0, newSessionsCount: 0 };
  }

  const existingSessions = await getSessions();
  const existingIds = new Set(existingSessions.map(s => s.id));
  const newRaw = allRaw.filter(s => !existingIds.has(s.id));

  let newSessionsCount = 0;
  const newProjects = new Set<string>();

  const configPath = path.resolve(process.cwd(), 'config.json');
  let intelConfig: IntelligenceConfig = { provider: 'none', model: 'llama3' };
  try {
    intelConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  } catch (e) {}

  for (const raw of newRaw) {
    const projectId = crypto.createHash('md5').update(raw.projectPath).digest('hex').substring(0, 16);
    
    // 1. Save Project in SQLite & HydraDB
    await saveProject({
      id: projectId,
      name: raw.projectName,
      path: raw.projectPath
    });
    newProjects.add(projectId);

    hydra.addNode({
      id: projectId,
      type: 'Project',
      label: raw.projectName,
      properties: { path: raw.projectPath },
      timestamp: raw.startedAt
    });

    // 2. Normalize and Analyze
    const { session, events } = normalizeSession(raw);
    const eventTexts = events.map(e => `[${e.type}] ${e.name}: ${e.content?.substring(0, 100)}`);
    const analysis = await analyzeSession(session, eventTexts, intelConfig);

    session.summary = analysis.summary;
    session.intent = analysis.intent;
    session.topics = analysis.topics;
    session.importance = analysis.importance;
    session.outcome = analysis.outcome;

    // 3. Save Topic Node & Edge
    const primaryTopic = analysis.topics[0] || 'General';
    const topic = await saveTopic(projectId, primaryTopic);
    session.topicId = topic.id;

    hydra.addNode({
      id: topic.id,
      type: 'Topic',
      label: topic.name,
      properties: { projectId },
      timestamp: topic.createdAt
    });

    hydra.addEdge(projectId, topic.id, 'CONTAINS');

    // 4. Save Session Node & Edge
    await saveSession(session);
    await saveEvents(events);

    hydra.addNode({
      id: session.id,
      type: 'Session',
      label: session.title || 'Session',
      properties: {
        provider: session.provider,
        projectId,
        intent: session.intent,
        outcome: session.outcome,
        importance: session.importance,
        toolCallCount: session.toolCallCount
      },
      timestamp: session.startedAt
    });

    hydra.addEdge(topic.id, session.id, 'CONTAINS');

    // 5. Detect and Add Decision Node Overwrites (LongMemEval Track 3)
    if (session.intent === 'refactor' || session.intent === 'bugfix') {
      const decisionId = `decision_${session.id}`;
      hydra.addNode({
        id: decisionId,
        type: 'DecisionNode',
        label: `Refactor in ${topic.name}`,
        properties: { description: session.summary || session.title },
        timestamp: session.startedAt
      });

      hydra.addEdge(session.id, decisionId, 'OVERWROTE', { reason: session.summary });
    }

    newSessionsCount++;
  }

  // Persist HydraDB Graph State
  await hydra.persist();

  return {
    newProjectsCount: newProjects.size,
    newSessionsCount
  };
}
