import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
export const DEFAULT_REFERER = 'http://localhost:5173';
export const HISTORY_LIMIT = 20;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.filter(
    (entry) =>
      entry &&
      typeof entry.role === 'string' &&
      typeof entry.content === 'string',
  );
}

export function loadCourseContext({ dataDir = DEFAULT_DATA_DIR } = {}) {
  const files = fs
    .readdirSync(dataDir)
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right));

  return files
    .map((file) => fs.readFileSync(path.join(dataDir, file), 'utf-8'))
    .join('\n\n---\n\n');
}

export function buildSystemPrompt({
  dataDir = DEFAULT_DATA_DIR,
  courseContext,
} = {}) {
  const context = courseContext ?? loadCourseContext({ dataDir });

  return `You are a helpful teaching assistant for the MLOps course (CS-42.101) at Northlake University, taught by Prof. Leon Richter and Prof. Clara Winters.

Answer student questions based ONLY on the course materials provided below. Be concise, accurate, and friendly. If the answer is not in the materials, say so honestly.

--- COURSE MATERIALS ---
${context}
--- END MATERIALS ---`;
}

export function buildMessages(
  history = [],
  message,
  { systemPrompt, historyLimit = HISTORY_LIMIT } = {},
) {
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  if (!trimmedMessage) {
    throw new Error('Message is required');
  }

  return [
    { role: 'system', content: systemPrompt },
    ...normalizeHistory(history).slice(-historyLimit),
    { role: 'user', content: trimmedMessage },
  ];
}

export function resolveModel(env = process.env) {
  return env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

export function resolveTemperature(env = process.env) {
  const rawValue = env.OPENROUTER_TEMPERATURE;
  if (rawValue == null || rawValue === '') {
    return undefined;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export function createSseEventParser() {
  let buffer = '';

  return {
    push(chunk) {
      buffer += chunk;
      const events = [];
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue;
        }

        const payload = line.slice(6).trim();
        if (!payload) {
          continue;
        }

        if (payload === '[DONE]') {
          events.push({ type: 'done' });
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            events.push({ type: 'content', content: token });
          }
        } catch {
          // Ignore malformed partial chunks from upstream and wait for the next one.
        }
      }

      return events;
    },
  };
}

export async function* streamOpenRouterEvents(upstream) {
  if (!upstream.body) {
    throw new Error('OpenRouter response body missing');
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseEventParser();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    for (const event of parser.push(chunk)) {
      yield event;
    }
  }
}

export async function* generateChatCompletion(
  messages,
  {
    apiKey,
    model,
    temperature,
    fetchImpl = fetch,
    referer = DEFAULT_REFERER,
  } = {},
) {
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set in .env');
  }

  const body = {
    model,
    messages,
    stream: true,
  };

  if (typeof temperature === 'number') {
    body.temperature = temperature;
  }

  const upstream = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const errorBody = await upstream.text();
    throw new Error(`OpenRouter ${upstream.status}: ${errorBody}`);
  }

  yield* streamOpenRouterEvents(upstream);
}

export async function* chat(
  { message, history = [] },
  {
    systemPrompt = buildSystemPrompt(),
    apiKey = process.env.OPENROUTER_API_KEY,
    model = resolveModel(),
    temperature = resolveTemperature(),
    fetchImpl = fetch,
  } = {},
) {
  const messages = buildMessages(history, message, { systemPrompt });

  yield* generateChatCompletion(messages, {
    apiKey,
    model,
    temperature,
    fetchImpl,
  });
}

export async function collectChatResponse(request, options = {}) {
  let output = '';

  for await (const event of chat(request, options)) {
    if (event.type === 'content') {
      output += event.content;
    }
  }

  return output;
}
