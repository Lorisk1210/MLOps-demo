import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../backend/app.js';

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

describe('/api/chat', () => {
  it('returns a 500 error when the OpenRouter API key is missing', async () => {
    const app = createApp({ env: {} });

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello there' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'OPENROUTER_API_KEY not set in .env',
    });
  });

  it('streams a backend error event when the upstream model call fails', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response('upstream broke', { status: 502 }),
    );
    const app = createApp({
      env: { OPENROUTER_API_KEY: 'test-key' },
      fetchImpl,
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello there' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.text).toContain('OpenRouter 502: upstream broke');
  });

  it('streams assistant tokens and forwards the done marker', async () => {
    const fetchImpl = vi.fn(async () =>
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const app = createApp({
      env: { OPENROUTER_API_KEY: 'test-key' },
      fetchImpl,
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello there' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('"content":"Hello"');
    expect(response.text).toContain('"content":" world"');
    expect(response.text).toContain('data: [DONE]');
  });
});
