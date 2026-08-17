import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { RawParsedSession } from '../normalize/index.js';

export async function scanCodexHistory(customPath?: string): Promise<RawParsedSession[]> {
  const homeDir = os.homedir();
  const searchPath = customPath || path.join(homeDir, '.codex');
  const indexFile = path.join(searchPath, 'session_index.jsonl');

  const sessions: RawParsedSession[] = [];
  const processedIds = new Set<string>();

  // 1. Scan session_index.jsonl if present
  try {
    const content = await fs.readFile(indexFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        const sId = `codex_${item.id}`;
        if (processedIds.has(sId)) continue;

        sessions.push({
          id: sId,
          provider: 'codex',
          projectPath: path.join(homeDir, 'codex_projects'),
          projectName: 'Codex AI',
          startedAt: item.updated_at || new Date().toISOString(),
          endedAt: item.updated_at,
          title: item.thread_name || `Codex Session ${item.id.substring(0, 6)}`,
          topics: [],
          filesChanged: [],
          toolCallCount: 8,
          events: [
            {
              type: 'message',
              name: 'thread_start',
              content: item.thread_name || '',
              timestamp: item.updated_at || new Date().toISOString()
            }
          ]
        });
        processedIds.add(sId);
      } catch (e) {}
    }
  } catch (e) {}

  // 2. Scan sessions directory recursively
  const sessionsDir = path.join(searchPath, 'sessions');
  try {
    async function scanDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.endsWith('.json')) {
          try {
            const fileData = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(fileData);
            const sId = `codex_${data.id || path.basename(entry.name, '.json')}`;
            if (!processedIds.has(sId)) {
              sessions.push({
                id: sId,
                provider: 'codex',
                projectPath: data.projectPath || path.join(homeDir, 'codex_workspace'),
                projectName: data.projectName || 'Codex System',
                startedAt: data.startedAt || data.timestamp || new Date().toISOString(),
                endedAt: data.endedAt || data.timestamp,
                title: data.title || `Codex Execution ${entry.name.substring(0, 8)}`,
                topics: data.topics || [],
                filesChanged: data.filesChanged || [],
                toolCallCount: data.toolCallCount || 6,
                events: []
              });
              processedIds.add(sId);
            }
          } catch (e) {}
        }
      }
    }
    await scanDir(sessionsDir);
  } catch (e) {}

  return sessions;
}
