import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface HarnessDetectionResult {
  id: string;
  name: string;
  category: 'cli' | 'editor_extension' | 'standalone_app';
  detected: boolean;
  path: string;
  sessionCount?: number;
  lastActive?: string;
  description: string;
}

export async function detectAgentHarnesses(): Promise<HarnessDetectionResult[]> {
  const homeDir = os.homedir();

  const targets = [
    {
      id: 'claude',
      name: 'Claude Code CLI',
      category: 'cli' as const,
      dir: path.join(homeDir, '.claude'),
      description: 'Official Anthropic Claude CLI tool'
    },
    {
      id: 'codex',
      name: 'OpenAI Codex / CLI',
      category: 'cli' as const,
      dir: path.join(homeDir, '.codex'),
      description: 'OpenAI CLI agent session logs'
    },
    {
      id: 'gemini',
      name: 'Gemini CLI / Antigravity',
      category: 'cli' as const,
      dir: path.join(homeDir, '.gemini'),
      description: 'Google Gemini CLI and Antigravity logs'
    },
    {
      id: 'cursor',
      name: 'Cursor IDE',
      category: 'standalone_app' as const,
      dir: path.join(homeDir, 'Library', 'Application Support', 'Cursor'),
      description: 'AI-first code editor session history'
    },
    {
      id: 'copilot',
      name: 'GitHub Copilot',
      category: 'editor_extension' as const,
      dir: path.join(homeDir, '.copilot'),
      description: 'GitHub Copilot Chat telemetry'
    },
    {
      id: 'windsurf',
      name: 'Windsurf / Codeium',
      category: 'standalone_app' as const,
      dir: path.join(homeDir, '.codeium'),
      description: 'Windsurf Cascade AI agent logs'
    },
    {
      id: 'cline',
      name: 'Cline / Roo Code',
      category: 'editor_extension' as const,
      dir: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev'),
      description: 'Autonomous Coding Agent for VS Code'
    },
    {
      id: 'aider',
      name: 'Aider CLI',
      category: 'cli' as const,
      dir: path.join(homeDir, '.aider.chat.history.md'),
      description: 'Command-line AI pair programming tool'
    },
    {
      id: 'continue',
      name: 'Continue.dev',
      category: 'editor_extension' as const,
      dir: path.join(homeDir, '.continue'),
      description: 'Open-source AI code assistant'
    },
    {
      id: 'pi',
      name: 'Pi / CommandCode / Factory',
      category: 'cli' as const,
      dir: path.join(homeDir, '.pi'),
      description: 'Autonomous developer agent harnesses'
    }
  ];

  const results: HarnessDetectionResult[] = [];

  for (const t of targets) {
    try {
      const stat = await fs.stat(t.dir);
      let sessionCount = 0;
      let lastActive: string | undefined;

      if (stat.isDirectory()) {
        try {
          const files = await fs.readdir(t.dir, { recursive: true });
          sessionCount = files.filter(f => 
            typeof f === 'string' && (f.endsWith('.json') || f.endsWith('.jsonl') || f.endsWith('.md'))
          ).length;
        } catch {
          sessionCount = 1;
        }
        lastActive = stat.mtime.toISOString();
      } else {
        sessionCount = 1;
        lastActive = stat.mtime.toISOString();
      }

      results.push({
        id: t.id,
        name: t.name,
        category: t.category,
        detected: true,
        path: t.dir,
        sessionCount,
        lastActive,
        description: t.description
      });
    } catch {
      results.push({
        id: t.id,
        name: t.name,
        category: t.category,
        detected: false,
        path: t.dir,
        sessionCount: 0,
        description: t.description
      });
    }
  }

  return results;
}
