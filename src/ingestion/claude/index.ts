import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { RawParsedSession } from '../normalize/index.js';

export async function scanClaudeHistory(customPath?: string): Promise<RawParsedSession[]> {
  const homeDir = os.homedir();
  const claudeDir = customPath || path.join(homeDir, '.claude');
  const projectsDir = path.join(claudeDir, 'projects');
  const historyFile = path.join(claudeDir, 'history.jsonl');

  const sessions: RawParsedSession[] = [];
  const processedSessionIds = new Set<string>();

  // 1. Scan projects directory (~/.claude/projects/)
  try {
    const projectDirs = await fs.readdir(projectsDir);
    
    for (const pDir of projectDirs) {
      const projectFullPath = path.join(projectsDir, pDir);
      const stat = await fs.stat(projectFullPath);
      if (!stat.isDirectory()) continue;

      // Decode project real name/path from directory name (e.g. -Users-shk-experiments-vitosha-frontend)
      let resolvedPath = pDir.startsWith('-') ? pDir.replace(/^-/, '/').replace(/-/g, '/') : pDir;
      let projectName = resolvedPath.split('/').filter(Boolean).pop() || pDir;

      try {
        const files = await fs.readdir(projectFullPath);
        for (const file of files) {
          if (!file.endsWith('.jsonl')) continue;

          const filePath = path.join(projectFullPath, file);
          const sessionId = path.basename(file, '.jsonl');
          if (processedSessionIds.has(sessionId)) continue;

          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim().length > 0);
          if (lines.length === 0) continue;

          let startedAt = '';
          let endedAt = '';
          const filesChanged = new Set<string>();
          let toolCallCount = 0;
          const events: RawParsedSession['events'] = [];
          let firstPrompt = '';

          for (let i = 0; i < lines.length; i++) {
            try {
              const data = JSON.parse(lines[i]);
              const timestamp = data.timestamp || data.time || (data.message && data.message.timestamp);
              
              if (timestamp) {
                if (!startedAt) startedAt = timestamp;
                endedAt = timestamp;
              }

              // Extract actual working directory if present
              if (data.cwd) {
                resolvedPath = data.cwd;
                projectName = path.basename(data.cwd) || projectName;
              }

              // Extract User Messages
              if (data.type === 'user' || (data.message && data.message.role === 'user')) {
                let userText = '';
                const msgContent = data.message ? data.message.content : data.text || data.content;
                
                if (typeof msgContent === 'string') {
                  userText = msgContent;
                } else if (Array.isArray(msgContent)) {
                  userText = msgContent
                    .filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text)
                    .join(' ');
                }

                if (userText && !userText.includes('<local-command-caveat>')) {
                  if (!firstPrompt) firstPrompt = userText.substring(0, 100);
                  events.push({
                    type: 'message',
                    name: 'user_prompt',
                    content: userText.substring(0, 200),
                    timestamp: timestamp || new Date().toISOString()
                  });
                }
              }

              // Extract Tool Calls (tool_use, attachments, commands)
              if (data.type === 'tool_use' || data.toolName) {
                toolCallCount++;
                const toolName = data.toolName || 'tool_use';
                events.push({
                  type: 'tool_call',
                  name: toolName,
                  content: JSON.stringify(data.toolInput || data.input || {}).substring(0, 150),
                  timestamp: timestamp || new Date().toISOString()
                });
              } else if (data.message && Array.isArray(data.message.content)) {
                for (const part of data.message.content) {
                  if (part.type === 'tool_use') {
                    toolCallCount++;
                    const name = part.name || 'tool_use';
                    const inputPath = part.input?.path || part.input?.filePath || part.input?.file || '';
                    if (inputPath) filesChanged.add(path.basename(inputPath));
                    
                    events.push({
                      type: 'tool_call',
                      name,
                      content: JSON.stringify(part.input || {}).substring(0, 150),
                      timestamp: timestamp || new Date().toISOString()
                    });
                  }
                }
              } else if (data.attachment && data.attachment.command) {
                toolCallCount++;
                events.push({
                  type: 'tool_call',
                  name: 'run_command',
                  content: data.attachment.command.substring(0, 100),
                  timestamp: timestamp || new Date().toISOString()
                });
              }
            } catch (e) {}
          }

          if (!startedAt) startedAt = new Date().toISOString();
          if (!endedAt) endedAt = startedAt;

          sessions.push({
            id: `claude_${sessionId}`,
            provider: 'claude',
            projectPath: resolvedPath,
            projectName,
            startedAt,
            endedAt,
            title: firstPrompt ? firstPrompt.replace(/[\n\r]+/g, ' ').substring(0, 50) : `Claude Session ${sessionId.substring(0, 6)}`,
            topics: [],
            filesChanged: Array.from(filesChanged),
            toolCallCount: Math.max(toolCallCount, 1),
            events
          });

          processedSessionIds.add(sessionId);
        }
      } catch (err) {}
    }
  } catch (err) {}

  // 2. Also Scan ~/.claude/history.jsonl if available
  try {
    const histContent = await fs.readFile(historyFile, 'utf-8');
    const lines = histContent.split('\n').filter(l => l.trim().length > 0);
    
    // Group history entries by project and day
    const projectDayGroups: Record<string, { project: string; entries: any[] }> = {};

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        const proj = item.project || 'Claude General';
        const dateStr = item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : 'undated';
        const key = `${proj}_${dateStr}`;

        if (!projectDayGroups[key]) {
          projectDayGroups[key] = { project: proj, entries: [] };
        }
        projectDayGroups[key].entries.push(item);
      } catch (e) {}
    }

    for (const [key, group] of Object.entries(projectDayGroups)) {
      const projPath = group.project;
      const projName = path.basename(projPath) || 'ClaudeProject';
      const first = group.entries[0];
      const last = group.entries[group.entries.length - 1];
      const startedAt = first.timestamp ? new Date(first.timestamp).toISOString() : new Date().toISOString();
      const endedAt = last.timestamp ? new Date(last.timestamp).toISOString() : startedAt;
      const sessionId = `claude_hist_${Buffer.from(key).toString('hex').substring(0, 16)}`;

      if (processedSessionIds.has(sessionId)) continue;

      const title = first.display 
        ? first.display.replace(/[\n\r]+/g, ' ').substring(0, 60) 
        : `Activity in ${projName}`;

      sessions.push({
        id: sessionId,
        provider: 'claude',
        projectPath: projPath,
        projectName: projName,
        startedAt,
        endedAt,
        title,
        topics: [],
        filesChanged: [],
        toolCallCount: group.entries.length * 2,
        events: group.entries.slice(0, 10).map((e, idx) => ({
          type: 'message',
          name: 'prompt',
          content: (e.display || '').substring(0, 150),
          timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : startedAt
        }))
      });
    }
  } catch (err) {}

  return sessions;
}
