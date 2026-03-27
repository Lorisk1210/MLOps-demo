import cors from 'cors';
import express from 'express';

import {
  buildSystemPrompt,
  chat,
  resolveModel,
  resolveTemperature,
} from './chat-service.js';

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function writeDone(res) {
  res.write('data: [DONE]\n\n');
}

export function createApp({
  env = process.env,
  fetchImpl = fetch,
  dataDir,
  systemPrompt = buildSystemPrompt({ dataDir }),
} = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body ?? {};
    const apiKey = env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'OPENROUTER_API_KEY not set in .env' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const event of chat(
        { message, history },
        {
          apiKey,
          fetchImpl,
          model: resolveModel(env),
          systemPrompt,
          temperature: resolveTemperature(env),
        },
      )) {
        if (event.type === 'content') {
          writeSse(res, { content: event.content });
        }

        if (event.type === 'done') {
          writeDone(res);
        }
      }
    } catch (error) {
      writeSse(res, { error: error.message });
    }

    res.end();
  });

  return app;
}
