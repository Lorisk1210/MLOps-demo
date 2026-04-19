const SUBJECT_MODEL = process.env.OPENROUTER_MODEL;
const JUDGE_MODEL = process.env.OPENROUTER_MODEL2;

if (!JUDGE_MODEL) {
  throw new Error(
    'OPENROUTER_MODEL2 is required for LLM-as-judge assertions. Set it in .env (see .env.example).',
  );
}

if (SUBJECT_MODEL && JUDGE_MODEL === SUBJECT_MODEL) {
  throw new Error(
    `Judge model must differ from subject model. Both are set to "${JUDGE_MODEL}". ` +
      'Set OPENROUTER_MODEL (subject) and OPENROUTER_MODEL2 (judge) to different models in .env.',
  );
}

export { JUDGE_MODEL, SUBJECT_MODEL };

export const JUDGE_PROVIDER = `openrouter:${JUDGE_MODEL}`;

const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callJudgeOnce(question) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for the judge.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict binary classifier. Reply with a single token: either YES or NO. No explanation.',
        },
        { role: 'user', content: question },
      ],
    }),
  });

  return response;
}

export async function askJudgeYesNo(question) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await callJudgeOnce(question);
    if (response.ok) {
      const data = await response.json();
      const raw = String(data.choices?.[0]?.message?.content ?? '').trim();
      const first = raw.toUpperCase().match(/\b(YES|NO)\b/);
      return first ? { verdict: first[1], raw } : { verdict: null, raw };
    }
    const body = await response.text();
    lastError = new Error(`Judge call failed: ${response.status} ${body}`);
    // Retry on transient rate-limit / upstream errors with exponential backoff.
    if (response.status === 429 || response.status >= 500) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(1000 * Math.pow(2, attempt - 1));
        continue;
      }
    }
    throw lastError;
  }
  throw lastError;
}
