import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeSession } from '../ingestion/normalize/index.js';
import { fallbackAnalysis } from '../intelligence/provider/index.js';
import { saveProject, getProjects, getDb, saveSession, getSessions } from '../database/db.js';
import crypto from 'crypto';

describe('Tracewood Unit Tests', () => {

  beforeAll(async () => {
    // Ensure DB is initialized
    await getDb();
  });

  it('Normalizes raw agent logs correctly', () => {
    const raw = {
      id: 'test_session_123',
      provider: 'claude' as const,
      projectPath: '/Users/shk/work/my-app',
      projectName: 'my-app',
      startedAt: '2026-08-16T12:00:00Z',
      endedAt: '2026-08-16T12:30:00Z',
      topics: [],
      filesChanged: ['index.ts', 'App.tsx'],
      toolCallCount: 15,
      events: []
    };

    const { session, events } = normalizeSession(raw);
    
    expect(session.id).toBe('test_session_123');
    expect(session.provider).toBe('claude');
    expect(session.filesChanged).toContain('index.ts');
    expect(session.toolCallCount).toBe(15);
    expect(events.length).toBe(0);
  });

  it('Runs deterministic fallback LLM classification', () => {
    const session = {
      id: 'test_sess',
      provider: 'claude' as const,
      projectId: 'proj_hash',
      startedAt: '2026-08-16T12:00:00Z',
      topics: [],
      filesChanged: ['auth.ts'],
      toolCallCount: 5,
    };
    
    // Testing text containing auth prompts
    const eventTexts = ['User: help me fix oauth callbacks', 'Assistant: calling edit_file on auth.ts'];
    const analysis = fallbackAnalysis(session, eventTexts);

    expect(analysis.intent).toBe('bugfix'); // due to 'fix' in text
    expect(analysis.topics).toContain('authentication'); // due to 'oauth' & 'auth' in text
    expect(analysis.outcome).toBe('success');
  });

  it('Database saves and retrieves projects & sessions', async () => {
    const projId = 'test_proj_' + Math.random().toString(36).substring(7);
    const proj = {
      id: projId,
      name: 'Temp Project',
      path: '/Users/shk/temp-' + projId
    };

    const savedProj = await saveProject(proj);
    expect(savedProj.id).toBe(projId);

    const projects = await getProjects();
    const found = projects.find(p => p.id === projId);
    expect(found).toBeDefined();

    const session = {
      id: 'sess_' + projId,
      provider: 'claude' as const,
      projectId: projId,
      startedAt: new Date().toISOString(),
      topics: ['General'],
      filesChanged: [],
      toolCallCount: 1
    };

    await saveSession(session);
    const sessions = await getSessions(projId);
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('sess_' + projId);
  });

  it('Validates deterministic seeds for visual tree stability', () => {
    const idA = 'my_stable_project';
    const idB = 'my_stable_project';
    const idC = 'different_project';

    const hashA = crypto.createHash('md5').update(idA).digest('hex');
    const hashB = crypto.createHash('md5').update(idB).digest('hex');
    const hashC = crypto.createHash('md5').update(idC).digest('hex');

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

});
