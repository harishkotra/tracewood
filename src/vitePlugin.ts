import type { Plugin, ViteDevServer } from 'vite';
import { getDb, getProjects, getSessions } from './database/db.js';
import { hydra } from './database/hydra.js';
import { runScan, saveIntelligenceConfig } from './ingestion/index.js';
import { IntelligenceConfig } from './intelligence/provider/index.js';
import fs from 'fs/promises';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'config.json');

export function tracewoodBackendPlugin(): Plugin {
  return {
    name: 'tracewood-backend-plugin',
    async configureServer(server: ViteDevServer) {
      // Initialize HydraDB
      await hydra.init();

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (url.startsWith('/api/forest')) {
          try {
            const projects = await getProjects();
            const allSessions = await getSessions();
            const db = await getDb();
            const allTopics = await db.all('SELECT * FROM topics');

            const topicsMap: Record<string, any[]> = {};
            const sessionsMap: Record<string, any[]> = {};

            for (const p of projects) {
              topicsMap[p.id] = allTopics.filter((t: any) => t.projectId === p.id);
              sessionsMap[p.id] = allSessions.filter(s => s.projectId === p.id);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              projects,
              topics: topicsMap,
              sessions: sessionsMap,
              myceliumLinks: hydra.getMyceliumLinks(),
              decisionConflicts: hydra.getDecisionConflicts()
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (url.startsWith('/api/projects')) {
          try {
            const projects = await getProjects();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(projects));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (url.startsWith('/api/scan') && req.method === 'POST') {
          try {
            const result = await runScan();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (url.startsWith('/api/settings')) {
          if (req.method === 'GET') {
            try {
              const data = await fs.readFile(configPath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } catch (e) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ provider: 'none', model: 'llama3', endpoint: 'http://localhost:11434' }));
            }
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
              try {
                const config: IntelligenceConfig = JSON.parse(body);
                await saveIntelligenceConfig(config);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }

        if (url.startsWith('/api/recap') && req.method === 'POST') {
          try {
            const sessions = await getSessions();
            const today = new Date().toISOString().split('T')[0];
            const todaySessions = sessions.filter(s => s.startedAt.startsWith(today));

            if (todaySessions.length === 0) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ recap: "No growth observed today. Start coding to plant new seeds!" }));
              return;
            }

            const uniqueProjects = Array.from(new Set(todaySessions.map(s => s.projectId))).length;
            const recapText = `Today your forest grew mostly around:
${Array.from(new Set(todaySessions.flatMap(s => s.topics))).join(', ')}

${todaySessions.length} sessions completed across ${uniqueProjects} projects.`;

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ recap: recapText }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}
