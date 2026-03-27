import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

process.loadEnvFile?.('.env');

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
    pass: Boolean(row.success ?? row.gradingResult?.pass),
    severity:
      row.metadata?.severity || row.testCase?.metadata?.severity || 'medium',
  })) || [];

if (rows.length === 0) {
  console.error(`Promptfoo returned no test rows for suite "${suiteName}".`);
  process.exit(1);
}

const passedCount = rows.filter((row) => row.pass).length;
const passRate = passedCount / rows.length;
const criticalFailures = rows.filter(
  (row) => row.severity === 'critical' && !row.pass,
).length;
const passThreshold = Number(passThresholdArg);
const maxCriticalFailures = Number(maxCriticalFailuresArg);

console.log(
  `[${suiteName}] passed ${passedCount}/${rows.length} tests (${(passRate * 100).toFixed(1)}%)`,
);
console.log(`[${suiteName}] critical failures: ${criticalFailures}`);

if (passRate < passThreshold) {
  console.error(
    `[${suiteName}] pass rate ${(passRate * 100).toFixed(1)}% is below the ${(passThreshold * 100).toFixed(1)}% gate.`,
  );
  process.exit(1);
}

if (criticalFailures > maxCriticalFailures) {
  console.error(
    `[${suiteName}] critical failures ${criticalFailures} exceed the allowed maximum of ${maxCriticalFailures}.`,
  );
  process.exit(1);
}
