import { Session } from '../../database/types.js';

export interface SessionAnalysis {
  summary: string;
  intent: "feature" | "bugfix" | "refactor" | "research" | "configuration" | "testing" | "deployment" | "other";
  topics: string[];
  importance: number;
  outcome: "success" | "partial" | "failed" | "unknown";
}

export type LLMProvider = "ollama" | "lmstudio" | "openai" | "anthropic" | "gemini" | "none";

export interface IntelligenceConfig {
  provider: LLMProvider;
  model: string;
  endpoint?: string;
  apiKey?: string;
}

// Deterministic fallback classification when LLM is unavailable
export function fallbackAnalysis(session: Session, eventTexts: string[]): SessionAnalysis {
  const textContent = (session.title + " " + session.summary + " " + eventTexts.join(" ")).toLowerCase();
  
  // 1. Determine Intent
  let intent: SessionAnalysis['intent'] = 'feature';
  if (textContent.includes('test') || textContent.includes('spec') || textContent.includes('assert')) {
    intent = 'testing';
  } else if (textContent.includes('fix') || textContent.includes('bug') || textContent.includes('issue') || textContent.includes('error')) {
    intent = 'bugfix';
  } else if (textContent.includes('refactor') || textContent.includes('clean') || textContent.includes('restructure') || textContent.includes('rename')) {
    intent = 'refactor';
  } else if (textContent.includes('deploy') || textContent.includes('ci') || textContent.includes('cd') || textContent.includes('workflow') || textContent.includes('docker')) {
    intent = 'deployment';
  } else if (textContent.includes('config') || textContent.includes('env') || textContent.includes('settings') || textContent.includes('package.json') || textContent.includes('tsconfig')) {
    intent = 'configuration';
  } else if (textContent.includes('research') || textContent.includes('explain') || textContent.includes('how to') || textContent.includes('what is') || textContent.includes('doc')) {
    intent = 'research';
  } else if (session.toolCallCount > 0) {
    intent = 'feature';
  } else {
    intent = 'other';
  }

  // 2. Extract Topics
  const topicsSet = new Set<string>();
  const topicKeywords: { [key: string]: string[] } = {
    authentication: ['auth', 'login', 'oauth', 'token', 'jwt', 'password', 'signup', 'user'],
    database: ['db', 'sql', 'query', 'postgres', 'sqlite', 'prisma', 'schema', 'table', 'migration'],
    ui: ['ui', 'css', 'style', 'color', 'layout', 'tailwind', 'component', 'button', 'page', 'theme', 'html'],
    api: ['api', 'route', 'endpoint', 'fetch', 'axios', 'graphql', 'rest', 'http', 'server'],
    payments: ['payment', 'stripe', 'billing', 'invoice', 'checkout', 'card', 'price'],
    performance: ['perf', 'optimize', 'cache', 'speed', 'memory', 'leak', 'slow', 'benchmark'],
    deployment: ['deploy', 'docker', 'aws', 'vercel', 'nginx', 'host', 'port', 'github actions', 'ci/cd']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => textContent.includes(kw))) {
      topicsSet.add(topic);
    }
  }
  
  if (topicsSet.size === 0) {
    topicsSet.add('General');
  }

  // 3. Estimate Outcome
  let outcome: SessionAnalysis['outcome'] = 'success';
  if (textContent.includes('fail') || textContent.includes('error') || textContent.includes('crash') || textContent.includes('exception')) {
    outcome = textContent.includes('success') || textContent.includes('fix') ? 'partial' : 'failed';
  }

  // 4. Estimate Importance
  let importance = 0.2;
  importance += Math.min(0.5, session.toolCallCount * 0.05); // More tools -> higher importance
  importance += Math.min(0.3, session.filesChanged.length * 0.1); // More files -> higher importance
  importance = Math.min(1.0, importance);

  // 5. Generate Summary
  let summary = `Session using ${session.provider}`;
  if (session.filesChanged.length > 0) {
    summary += ` modified ${session.filesChanged.length} files (${session.filesChanged.slice(0, 3).join(', ')}${session.filesChanged.length > 3 ? '...' : ''})`;
  } else {
    summary += ` with ${session.toolCallCount} actions.`;
  }

  return {
    summary,
    intent,
    topics: Array.from(topicsSet),
    importance,
    outcome
  };
}

export async function analyzeSession(
  session: Session,
  eventTexts: string[],
  config: IntelligenceConfig
): Promise<SessionAnalysis> {
  if (!config || config.provider === 'none') {
    return fallbackAnalysis(session, eventTexts);
  }

  const prompt = `Analyze this AI agent coding session and return a clean JSON object containing:
{
  "summary": "a single sentence summarizing what the agent accomplished",
  "intent": "feature" | "bugfix" | "refactor" | "research" | "configuration" | "testing" | "deployment" | "other",
  "topics": ["list", "of", "high-level", "topics", "like", "authentication", "database", "ui", "api", "payments", "performance", "deployment"],
  "importance": 0.0 to 1.0 based on complexity and impact,
  "outcome": "success" | "partial" | "failed" | "unknown"
}

Session context:
Provider: ${session.provider}
Files modified: ${session.filesChanged.join(', ')}
Tool count: ${session.toolCallCount}
Recent prompts/actions in session:
${eventTexts.slice(0, 10).join('\n')}

Response MUST contain ONLY the JSON block.`;

  try {
    if (config.provider === 'ollama') {
      const endpoint = config.endpoint || 'http://localhost:11434';
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || 'llama3',
          prompt,
          stream: false,
          format: 'json'
        })
      });

      if (!res.ok) throw new Error(`Ollama returned status ${res.status}`);
      const data = await res.json() as any;
      return JSON.parse(data.response);
    }

    if (config.provider === 'openai' || config.provider === 'lmstudio') {
      const endpoint = config.provider === 'openai' 
        ? 'https://api.openai.com/v1/chat/completions'
        : (config.endpoint || 'http://localhost:1234/v1/chat/completions');
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: config.model || (config.provider === 'openai' ? 'gpt-4o-mini' : 'model'),
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (!res.ok) throw new Error(`OpenAI-compatible endpoint returned status ${res.status}`);
      const data = await res.json() as any;
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    }

    if (config.provider === 'gemini') {
      const apiKey = config.apiKey;
      if (!apiKey) throw new Error("Gemini API key is required");
      
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`);
      const data = await res.json() as any;
      const content = data.candidates[0].content.parts[0].text;
      return JSON.parse(content);
    }
  } catch (err) {
    // LLM failed, fallback to rules
  }

  return fallbackAnalysis(session, eventTexts);
}
