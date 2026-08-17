import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Project, Topic, Session, Event } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path in workspace root (or app config)
const dbPath = path.resolve(__dirname, '../../tracewood.db');

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(projectId, name)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      projectId TEXT NOT NULL,
      topicId TEXT,
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      title TEXT,
      summary TEXT,
      intent TEXT,
      topics TEXT NOT NULL, -- JSON string array
      filesChanged TEXT NOT NULL, -- JSON string array
      toolCallCount INTEGER NOT NULL,
      tokenCount INTEGER,
      estimatedCost REAL,
      outcome TEXT,
      importance REAL,
      embedding TEXT, -- JSON number array
      FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(topicId) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  return dbInstance;
}

// Database Helpers
export async function saveProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.run(
    `INSERT INTO projects (id, name, path, createdAt, updatedAt, summary)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET
       name = excluded.name,
       updatedAt = ?,
       summary = COALESCE(excluded.summary, projects.summary)`,
    [project.id, project.name, project.path, now, now, project.summary || null, now]
  );

  const saved = await db.get<Project>('SELECT * FROM projects WHERE path = ?', [project.path]);
  return saved!;
}

export async function getProjects(): Promise<Project[]> {
  const db = await getDb();
  return db.all<Project[]>('SELECT * FROM projects ORDER BY updatedAt DESC');
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get<Project>('SELECT * FROM projects WHERE id = ?', [id]);
}

export async function saveTopic(projectId: string, name: string, description?: string): Promise<Topic> {
  const db = await getDb();
  const id = `topic_${Math.random().toString(36).substring(2, 11)}`;
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO topics (id, projectId, name, description, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(projectId, name) DO UPDATE SET
       description = COALESCE(excluded.description, topics.description)`,
    [id, projectId, name, description || null, now]
  );

  const saved = await db.get<Topic>('SELECT * FROM topics WHERE projectId = ? AND name = ?', [projectId, name]);
  return saved!;
}

export async function getTopics(projectId: string): Promise<Topic[]> {
  const db = await getDb();
  return db.all<Topic[]>('SELECT * FROM topics WHERE projectId = ?', [projectId]);
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb();
  
  await db.run(
    `INSERT INTO sessions (
      id, provider, projectId, topicId, startedAt, endedAt, title, summary,
      intent, topics, filesChanged, toolCallCount, tokenCount, estimatedCost,
      outcome, importance, embedding
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       topicId = COALESCE(excluded.topicId, sessions.topicId),
       endedAt = COALESCE(excluded.endedAt, sessions.endedAt),
       title = COALESCE(excluded.title, sessions.title),
       summary = COALESCE(excluded.summary, sessions.summary),
       intent = COALESCE(excluded.intent, sessions.intent),
       topics = excluded.topics,
       filesChanged = excluded.filesChanged,
       toolCallCount = excluded.toolCallCount,
       tokenCount = COALESCE(excluded.tokenCount, sessions.tokenCount),
       estimatedCost = COALESCE(excluded.estimatedCost, sessions.estimatedCost),
       outcome = COALESCE(excluded.outcome, sessions.outcome),
       importance = COALESCE(excluded.importance, sessions.importance),
       embedding = COALESCE(excluded.embedding, sessions.embedding)`,
    [
      session.id,
      session.provider,
      session.projectId,
      session.topicId || null,
      session.startedAt,
      session.endedAt || null,
      session.title || null,
      session.summary || null,
      session.intent || null,
      JSON.stringify(session.topics),
      JSON.stringify(session.filesChanged),
      session.toolCallCount,
      session.tokenCount || null,
      session.estimatedCost || null,
      session.outcome || null,
      session.importance || null,
      session.embedding ? JSON.stringify(session.embedding) : null
    ]
  );
}

export async function getSessions(projectId?: string): Promise<Session[]> {
  const db = await getDb();
  let query = 'SELECT * FROM sessions';
  let params: any[] = [];
  
  if (projectId) {
    query += ' WHERE projectId = ?';
    params.push(projectId);
  }
  
  query += ' ORDER BY startedAt DESC';
  
  const rows = await db.all<any[]>(query, params);
  return rows.map(row => ({
    ...row,
    topics: JSON.parse(row.topics || '[]'),
    filesChanged: JSON.parse(row.filesChanged || '[]'),
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined
  }));
}

export async function saveEvents(events: Event[]): Promise<void> {
  if (events.length === 0) return;
  const db = await getDb();
  
  const stmt = await db.prepare(
    `INSERT INTO events (id, sessionId, type, name, content, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  );

  for (const e of events) {
    await stmt.run([e.id, e.sessionId, e.type, e.name, e.content || null, e.timestamp]);
  }

  await stmt.finalize();
}

export async function getEvents(sessionId: string): Promise<Event[]> {
  const db = await getDb();
  return db.all<Event[]>('SELECT * FROM events WHERE sessionId = ? ORDER BY timestamp ASC', [sessionId]);
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM events');
  await db.run('DELETE FROM sessions');
  await db.run('DELETE FROM topics');
  await db.run('DELETE FROM projects');
}
