# mlops-demo

Course-style MLOps demo: a small frontend + backend (course-assistant chatbot) plus a CI/CD "LLM TestOps" pipeline that showcases unit tests and four LLM evaluation suites — regression, hallucination, prompt injection, and metamorphic bias — wired around the hard parts: non-determinism and the oracle problem.

See [`docs/TESTING.md`](docs/TESTING.md) for the design and what each suite actually tests.

## Requirements

- Bun
- Node.js (used in CI for some scripts)

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` and set:

- `OPENROUTER_API_KEY` — required for eval suites and CI
- `OPENROUTER_MODEL` — subject under test (default: `nvidia/nemotron-3-super-120b-a12b:free`)
- `OPENROUTER_MODEL2` — judge model (default: `google/gemma-4-26b-a4b-it:free`). Must differ from `OPENROUTER_MODEL`.

## Run locally

```bash
# backend (watch)
bun run dev:backend

# frontend (dev server)
bun run dev:frontend
```

## Tests

```bash
# deterministic unit tests (no API calls)
bun run test:unit

# LLM evaluation suites (need OPENROUTER_API_KEY)
bun run test:eval:regression
bun run test:eval:hallucination
bun run test:eval:prompt_injection
bun run test:eval:metamorphic_bias

# aggregate all suite JSONs + run metamorphic pair comparison
bun run summarize
```
