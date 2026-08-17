import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { RawParsedSession } from '../normalize/index.js';

export async function scanPiHistory(customPath?: string): Promise<RawParsedSession[]> {
  const homeDir = os.homedir();
  const searchPath = customPath || path.join(homeDir, '.pi');
  const sessions: RawParsedSession[] = [];
  try {
    const files = await fs.readdir(searchPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(searchPath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        sessions.push({
          id: `pi_${data.id || path.basename(file, '.json')}`,
          provider: 'pi',
          projectPath: data.projectPath || 'pi_project',
          projectName: data.projectName || 'PiProject',
          startedAt: data.startedAt || new Date().toISOString(),
          endedAt: data.endedAt,
          topics: data.topics || [],
          filesChanged: data.filesChanged || [],
          toolCallCount: data.toolCallCount || 0,
          events: data.events || []
        });
      } catch (e) {
        // Safe skip
      }
    }
  } catch (e) {
    // Silent skip
  }
  return sessions;
}
