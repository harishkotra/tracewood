import { clearAllData, saveProject, saveTopic, saveSession, saveEvents } from './db.js';
import { Project, Topic, Session, Event, AgentProvider } from './types.js';
import crypto from 'crypto';

const PROJECTS_DATA = [
  { name: "Tracewood", path: "/Users/shk/experiments/tracewood" },
  { name: "DailyBuild", path: "/Users/shk/projects/dailybuild" },
  { name: "AgentKit", path: "/Users/shk/tools/agentkit" },
  { name: "Website", path: "/Users/shk/work/portfolio-site" },
  { name: "Research", path: "/Users/shk/experiments/llm-tests" },
  { name: "Experiments", path: "/Users/shk/experiments/canvas-doodle" }
];

const TOPICS_POOL = {
  "Tracewood": ["3D Visualizer", "Data Sync", "UI Customization", "Watcher Service"],
  "DailyBuild": ["Database Admin", "Scheduler Core", "Docker Deployment", "Auth Shield"],
  "AgentKit": ["Memory Retriever", "Context Parser", "Ollama Link", "CLI Tools"],
  "Website": ["Hero Section", "Analytics Page", "SEO Tuning", "Vite Builder"],
  "Research": ["Embedding Tests", "Prompt Optimization", "Clustering Heuristics"],
  "Experiments": ["WebGL Shaders", "Physics Engine", "Soundscapes"]
};

const INTENTS = ["feature", "bugfix", "refactor", "research", "configuration", "testing", "deployment", "other"] as const;
const OUTCOMES = ["success", "partial", "failed"] as const;
const PROVIDERS: AgentProvider[] = ["claude", "codex", "opencode", "pi"];

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export async function seedDatabase() {
  console.log("🌱 Clearing old database...");
  await clearAllData();

  console.log("🌲 Generating seed projects and topics...");
  
  for (const proj of PROJECTS_DATA) {
    const projectId = crypto.createHash('md5').update(proj.path).digest('hex').substring(0, 16);
    
    // Save Project
    await saveProject({
      id: projectId,
      name: proj.name,
      path: proj.path,
      summary: `AI agent visualization for project ${proj.name}`
    });

    // Save Topics
    const topics = TOPICS_POOL[proj.name as keyof typeof TOPICS_POOL] || ["General"];
    const topicInstances: Topic[] = [];
    for (const tName of topics) {
      const topic = await saveTopic(projectId, tName, `Development related to ${tName}`);
      topicInstances.push(topic);
    }

    // Generate sessions (10 - 25 per project)
    const numSessions = Math.floor(randomRange(10, 25));
    console.log(`  └─ Creating ${numSessions} sessions for ${proj.name}...`);

    for (let s = 0; s < numSessions; s++) {
      const sessionId = `seed_${proj.name.toLowerCase()}_sess_${s}`;
      const provider = randomChoice(PROVIDERS);
      const topic = randomChoice(topicInstances);

      // Distribute session dates: some today, some recent, some older
      const startedAtDate = new Date();
      if (s === 0 || s === 1) {
        // Today
        startedAtDate.setHours(startedAtDate.getHours() - Math.floor(randomRange(1, 10)));
      } else if (s < 5) {
        // Last 3 days
        startedAtDate.setDate(startedAtDate.getDate() - Math.floor(randomRange(1, 3)));
        startedAtDate.setHours(Math.floor(randomRange(0, 23)));
      } else {
        // Last 30 days
        startedAtDate.setDate(startedAtDate.getDate() - Math.floor(randomRange(4, 30)));
        startedAtDate.setHours(Math.floor(randomRange(0, 23)));
      }

      const durationMinutes = Math.floor(randomRange(5, 90));
      const endedAtDate = new Date(startedAtDate.getTime() + durationMinutes * 60000);

      const intent = randomChoice(INTENTS);
      const outcome = randomChoice(OUTCOMES);
      const toolCallCount = Math.floor(randomRange(5, 120));
      const importance = randomRange(0.1, 1.0);

      // Generate files changed
      const numFiles = Math.floor(randomRange(1, 8));
      const filesChanged: string[] = [];
      const extensions = ["ts", "tsx", "css", "json", "md", "html"];
      for (let f = 0; f < numFiles; f++) {
        filesChanged.push(`file_${f}.${randomChoice(extensions)}`);
      }

      const title = `Implement ${intent} in ${topic.name}`;
      const summary = `Seeded session where agent worked on ${topic.name} using ${provider} with intent: ${intent}.`;

      const session: Session = {
        id: sessionId,
        provider,
        projectId,
        topicId: topic.id,
        startedAt: startedAtDate.toISOString(),
        endedAt: endedAtDate.toISOString(),
        title,
        summary,
        intent,
        topics: [topic.name],
        filesChanged,
        toolCallCount,
        tokenCount: toolCallCount * Math.floor(randomRange(300, 1500)),
        estimatedCost: toolCallCount * randomRange(0.001, 0.02),
        outcome,
        importance
      };

      await saveSession(session);

      // Generate Events
      const events: Event[] = [];
      for (let e = 0; e < Math.min(toolCallCount, 15); e++) {
        const evtTime = new Date(startedAtDate.getTime() + (e / 15) * durationMinutes * 60000);
        events.push({
          id: `${sessionId}_evt_${e}`,
          sessionId,
          type: randomChoice(["message", "tool_call", "error"]),
          name: randomChoice(["view_file", "write_to_file", "run_command", "assistant_message"]),
          content: `Seeded event details for action step ${e}`,
          timestamp: evtTime.toISOString()
        });
      }
      await saveEvents(events);
    }
  }

  console.log("🌲 Database seeding complete!");
}

// Check if run directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
}
