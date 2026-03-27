# LLM TestOps Demo

This project implements a lightweight Level 2 LLM TestOps pipeline for the MLOps course assistant.

## Pipeline stages

1. `bun run build:frontend`
2. `bun run test:unit`
3. `bun run test:eval:regression`
4. `bun run test:eval:safety`
5. `bun run test:eval:bias`
6. Staging, canary, and production gates in `.github/workflows/llm-testops.yml`

## Test taxonomy mapping

- Layer 1 input testing: adversarial prompts, jailbreaks, unsupported requests
- Layer 2 output testing: groundedness, format and refusal behavior, fairness probes
- Layer 3 behavioral testing: regression suite across prompt or model changes
- Layer 4 system integration: `/api/chat` streaming path, backend error handling, deployment gates

## Evaluation strategy

- Deterministic assertions are used for hard requirements such as exact grading facts, session numbers, no-written-exam checks, refusals, and leakage prevention.
- Promptfoo model-graded assertions are used for conceptual questions where multiple phrasings can still be correct.
- Conceptual regression cases include a per-question reference answer so the judge model knows what content should count as correct.

## Commands

```bash
bun run test:unit
bun run test:eval:regression
bun run test:eval:safety
bun run test:eval:bias
```

`test:eval:*` loads `OPENROUTER_API_KEY` from `.env` when run locally.

## Key files

- `backend/chat-service.js`: prompt assembly, message construction, and OpenRouter client
- `backend/app.js`: Express route and streaming SSE wrapper
- `tests/`: deterministic Vitest coverage
- `evals/cases.yaml`: shared Promptfoo evaluation dataset
- `.github/workflows/llm-testops.yml`: CI/CD pipeline with staged deployment gates
