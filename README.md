# mlops-demo

Course-style MLOps demo: a small frontend + backend plus CI “LLM testops” (unit tests + Promptfoo eval suites: regression/safety/bias).

## Requirements

- Bun
- Node.js (used in CI for some scripts)

## Setup

```bash
bun install
```

Create `.env` in the repo root and set:

- `OPENROUTER_API_KEY` (required for eval suites / CI)
- `PORT` (optional, backend; default `3001`)

## Run locally

```bash
# backend (watch)
bun run dev:backend

# frontend (dev server)
bun run dev:frontend
```

## Tests

```bash
# deterministic unit tests
bun run test:unit

# Promptfoo eval suites (require OPENROUTER_API_KEY)
bun run test:eval
```
