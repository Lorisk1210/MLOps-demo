import fs from 'fs';
import path from 'path';

if (fs.existsSync('.env')) {
  process.loadEnvFile?.('.env');
}

const RESULTS_DIR = path.resolve('promptfoo-results');
const SUITES = ['regression', 'hallucination', 'prompt_injection', 'metamorphic_bias'];

function readJsonIfExists(filepath) {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (err) {
    console.warn(`Could not parse ${filepath}: ${err.message}`);
    return null;
  }
}

function loadSuiteSummaries() {
  const out = {};
  for (const suite of SUITES) {
    out[suite] = readJsonIfExists(path.join(RESULTS_DIR, `${suite}.summary.json`));
  }
  return out;
}

function extractRowsFromFullResults(fullJson) {
  const rows = fullJson?.results?.results || [];
  return rows.map((row) => ({
    id: row.metadata?.id || row.testCase?.metadata?.id,
    pairId: row.metadata?.pairId || row.testCase?.metadata?.pairId || null,
    input: row.vars?.input ?? row.testCase?.vars?.input,
    output: row.response?.output ?? '',
    success: Boolean(row.success),
  }));
}

async function compareMetamorphicPairs() {
  const full = readJsonIfExists(path.join(RESULTS_DIR, 'metamorphic_bias.json'));
  if (!full) return { pairs: [], skipped: true };

  const rows = extractRowsFromFullResults(full).filter((r) => r.pairId);
  const byPair = new Map();
  for (const row of rows) {
    if (!byPair.has(row.pairId)) byPair.set(row.pairId, []);
    byPair.get(row.pairId).push(row);
  }

  const assertions = await import('../evals/assertions.cjs');
  const { semanticEquivalence } = assertions.default || assertions;

  const pairs = [];
  for (const [pairId, members] of byPair.entries()) {
    if (members.length !== 2) {
      pairs.push({
        pairId,
        error: `expected 2 rows, got ${members.length}`,
        equivalent: null,
      });
      continue;
    }
    const [a, b] = members;
    try {
      const result = await semanticEquivalence(a.output, b.output, { config: {} });
      pairs.push({
        pairId,
        rowA: a.id,
        rowB: b.id,
        equivalent: result.pass,
        verdict: result.verdict,
        reason: result.reason,
      });
    } catch (err) {
      pairs.push({ pairId, error: err.message, equivalent: null });
    }
  }
  return { pairs, skipped: false };
}

function fmtPct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function renderMarkdown({ summaries, metamorphic }) {
  const lines = [];
  lines.push('# LLM TestOps — Run Summary');
  lines.push('');
  lines.push(`Subject model: \`${process.env.OPENROUTER_MODEL || 'unset'}\``);
  lines.push(`Judge model:   \`${process.env.OPENROUTER_MODEL2 || 'unset'}\``);
  lines.push('');
  lines.push('| Suite | Hard gate | Pass rate | Critical failures | Advisory |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const suite of SUITES) {
    const s = summaries[suite];
    if (!s) {
      lines.push(`| ${suite} | — | — | — | — |`);
      continue;
    }
    const gate = s.gate.passed ? 'PASS' : 'FAIL';
    const advisory = s.advisory.total
      ? `${s.advisory.passed}/${s.advisory.total}${s.advisory.failed.length ? ` (failed: ${s.advisory.failed.join(', ')})` : ''}`
      : '—';
    lines.push(
      `| ${suite} | **${gate}** | ${s.hard.passed}/${s.hard.total} (${fmtPct(s.hard.passRate)}) | ${s.hard.criticalFailures} | ${advisory} |`,
    );
  }
  lines.push('');

  for (const suite of SUITES) {
    const s = summaries[suite];
    if (!s) continue;
    const failed = (s.rows || []).filter((r) => !r.pass && r.severity !== 'advisory');
    if (failed.length) {
      lines.push(`### Failures in \`${suite}\``);
      for (const row of failed) {
        lines.push(`- \`${row.id}\` (severity: ${row.severity})`);
      }
      lines.push('');
    }
  }

  lines.push('## Metamorphic bias pair comparison');
  lines.push('');
  if (metamorphic.skipped) {
    lines.push('_No metamorphic_bias.json found; skipping pair comparison._');
  } else if (metamorphic.pairs.length === 0) {
    lines.push('_No pairs found in the metamorphic suite._');
  } else {
    lines.push('| Pair | Rows | Equivalent? | Judge verdict |');
    lines.push('| --- | --- | --- | --- |');
    for (const p of metamorphic.pairs) {
      if (p.error) {
        lines.push(`| ${p.pairId} | — | ERROR | ${p.error} |`);
        continue;
      }
      const verdict = p.equivalent ? 'YES' : 'NO';
      lines.push(`| ${p.pairId} | ${p.rowA} ↔ ${p.rowB} | ${verdict} | ${p.verdict ?? 'n/a'} |`);
    }
    const diverged = metamorphic.pairs.filter((p) => p.equivalent === false);
    if (diverged.length) {
      lines.push('');
      lines.push(
        `**Bias finding:** ${diverged.length} pair(s) diverged semantically — ${diverged.map((p) => p.pairId).join(', ')}.`,
      );
    }
  }
  lines.push('');
  lines.push(
    '_Note: this demo uses a single free judge. A single judge can be wrong; deterministic floors (keyword/regex) run alongside each semantic check so one judge hallucination cannot flip a hard gate by itself._',
  );
  return lines.join('\n');
}

function computeOverallGate({ summaries, metamorphic }) {
  const suiteFails = SUITES.filter((s) => summaries[s] && !summaries[s].gate.passed);
  const pairFails = (metamorphic.pairs || []).filter((p) => p.equivalent === false);
  return {
    passed: suiteFails.length === 0 && pairFails.length === 0,
    suiteFails,
    pairFails,
  };
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const summaries = loadSuiteSummaries();
  const metamorphic = process.env.OPENROUTER_API_KEY
    ? await compareMetamorphicPairs()
    : { pairs: [], skipped: true };

  const markdown = renderMarkdown({ summaries, metamorphic });
  const summaryMdPath = path.join(RESULTS_DIR, 'summary.md');
  fs.writeFileSync(summaryMdPath, markdown);

  const overallJson = {
    suites: summaries,
    metamorphic,
    overall: computeOverallGate({ summaries, metamorphic }),
  };
  fs.writeFileSync(
    path.join(RESULTS_DIR, 'summary.json'),
    JSON.stringify(overallJson, null, 2),
  );

  console.log(markdown);

  if (!overallJson.overall.passed) {
    console.error('Overall gate: FAIL');
    process.exit(1);
  }
  console.log('Overall gate: PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
