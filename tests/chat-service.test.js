import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildMessages,
  buildSystemPrompt,
  createSseEventParser,
  generateChatCompletion,
} from '../backend/chat-service.js';

function createStreamResponse(chunks) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    },
  );
}

describe('chat-service', () => {
  const tempDirs = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('buildSystemPrompt loads markdown files in a stable order', () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), 'course-data-'));
    tempDirs.push(dataDir);
    writeFileSync(path.join(dataDir, 'z-topic.md'), 'Z file');
    writeFileSync(path.join(dataDir, 'a-topic.md'), 'A file');

    const prompt = buildSystemPrompt({ dataDir });

    expect(prompt).toContain('--- COURSE MATERIALS ---');
    expect(prompt).toContain('A file\n\n---\n\nZ file');
  });

  it('buildMessages keeps the system prompt and only the latest 20 history items', () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message-${index}`,
    }));

    const messages = buildMessages(history, 'Latest question', {
      systemPrompt: 'system prompt',
    });

    expect(messages).toHaveLength(22);
    expect(messages[0]).toEqual({ role: 'system', content: 'system prompt' });
    expect(messages[1].content).toBe('message-5');
    expect(messages.at(-1)).toEqual({
      role: 'user',
      content: 'Latest question',
    });
  });

  it('parses SSE chunks into content and done events', () => {
    const parser = createSseEventParser();

    const firstEvents = parser.push(
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
    );
    const secondEvents = parser.push(
      '\ndata: {"choices":[{"delta":{"content":" world"}}]}\n\ndata: [DONE]\n\n',
    );

    expect([...firstEvents, ...secondEvents]).toEqual([
      { type: 'content', content: 'Hello' },
      { type: 'content', content: ' world' },
      { type: 'done' },
    ]);
  });

  it('throws a descriptive error when OpenRouter returns a non-200 response', async () => {
    const fetchImpl = async () =>
      new Response('upstream broke', { status: 502, statusText: 'Bad Gateway' });

    await expect(async () => {
      for await (const _event of generateChatCompletion([], {
        apiKey: 'test-key',
        model: 'test-model',
        fetchImpl,
      })) {
        // Exhaust the async generator.
      }
    }).rejects.toThrow('OpenRouter 502: upstream broke');
  });

  it('streams content from the OpenRouter response', async () => {
    const fetchImpl = async () =>
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]);

    const events = [];
    for await (const event of generateChatCompletion([], {
      apiKey: 'test-key',
      model: 'test-model',
      fetchImpl,
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'content', content: 'Hello' },
      { type: 'content', content: ' world' },
      { type: 'done' },
    ]);
  });
});
