import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

if (fs.existsSync('.env')) {
  process.loadEnvFile?.('.env');
}

const [suiteName, configPath, passThresholdArg, maxCriticalFailuresArg] =
  process.argv.slice(2);

if (!suiteName || !configPath || !passThresholdArg || !maxCriticalFailuresArg) {
  console.error(
    'Usage: node scripts/run-promptfoo-suite.mjs <suite> <config> <passThreshold> <maxCriticalFailures>',
  );
  process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY is required to run Promptfoo evaluations.');
  process.exit(1);
}

const outputDir = path.resolve('promptfoo-results');
const outputPath = path.join(outputDir, `${suiteName}.json`);
const summaryPath = path.join(outputDir, `${suiteName}.summary.json`);
const promptfooBin = path.resolve(
  process.platform === 'win32'
    ? 'node_modules/.bin/promptfoo.cmd'
    : 'node_modules/.bin/promptfoo',
);

fs.mkdirSync(outputDir, { recursive: true });

const runResult = spawnSync(
  promptfooBin,
  ['eval', '-c', path.resolve(configPath), '-o', outputPath],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

if (runResult.status !== 0) {
  if (!fs.existsSync(outputPath)) {
    process.exit(runResult.status ?? 1);
  }
}

const evaluation = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

const rows =
  evaluation?.results?.results?.map((row) => ({
    id: row.metadata?.id || row.testCase?.metadata?.id || row.id,
    pairId: row.metadata?.pairId || row.testCase?.metadata?.pairId || null,
    pass: Boolean(row.success ?? row.gradingResult?.pass),
    severity:
      row.metadata?.severity || row.testCase?.metadata?.severity || 'medium',
  })) || [];

if (rows.length === 0) {
  console.error(`Promptfoo returned no test rows for suite "${suiteName}".`);
  process.exit(1);
}

// Advisory rows are observed but do not count toward the hard gate.
const hardRows = rows.filter((row) => row.severity !== 'advisory');
const advisoryRows = rows.filter((row) => row.severity === 'advisory');

const passedHard = hardRows.filter((row) => row.pass).length;
const passRate = hardRows.length === 0 ? 1 : passedHard / hardRows.length;
const criticalFailures = hardRows.filter(
  (row) => row.severity === 'critical' && !row.pass,
).length;
const passThreshold = Number(passThresholdArg);
const maxCriticalFailures = Number(maxCriticalFailuresArg);

const summary = {
  suite: suiteName,
  total: rows.length,
  hard: { total: hardRows.length, passed: passedHard, passRate, criticalFailures },
  advisory: {
    total: advisoryRows.length,
    passed: advisoryRows.filter((row) => row.pass).length,
    failed: advisoryRows.filter((row) => !row.pass).map((row) => row.id),
  },
  rows,
  gate: {
    passThreshold,
    maxCriticalFailures,
    passed: passRate >= passThreshold && criticalFailures <= maxCriticalFailures,
  },
};

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(
  `[${suiteName}] hard gates: ${passedHard}/${hardRows.length} passed (${(passRate * 100).toFixed(1)}%), critical failures: ${criticalFailures}`,
);
if (advisoryRows.length > 0) {
  const failedAdvisory = summary.advisory.failed;
  console.log(
    `[${suiteName}] advisory: ${summary.advisory.passed}/${advisoryRows.length} passed${failedAdvisory.length ? ` (failed: ${failedAdvisory.join(', ')})` : ''}`,
  );
}

if (passRate < passThreshold) {
  console.error(
    `[${suiteName}] hard-gate pass rate ${(passRate * 100).toFixed(1)}% is below the ${(passThreshold * 100).toFixed(1)}% threshold.`,
  );
  process.exit(1);
}

if (criticalFailures > maxCriticalFailures) {
  console.error(
    `[${suiteName}] critical failures ${criticalFailures} exceed the allowed maximum of ${maxCriticalFailures}.`,
  );
  process.exit(1);
}
