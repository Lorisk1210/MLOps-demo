import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import YAML from 'yaml';

import { JUDGE_PROVIDER } from './judge.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveJudgePlaceholder(assertion) {
  if (assertion && typeof assertion === 'object' && assertion.provider === 'JUDGE') {
    return { ...assertion, provider: JUDGE_PROVIDER };
  }
  return assertion;
}

function toPromptfooTest(testCase) {
  return {
    description: `${testCase.id}: ${testCase.expected}`,
    vars: {
      input: testCase.input,
      ...(testCase.vars || {}),
    },
    metadata: {
      id: testCase.id,
      severity: testCase.severity,
      expected: testCase.expected,
      ...(testCase.pairId ? { pairId: testCase.pairId } : {}),
    },
    assert: (testCase.assertions || []).map(resolveJudgePlaceholder),
  };
}

export function loadSuite(suiteName) {
  const suitePath = path.join(__dirname, 'suites', `${suiteName}.yaml`);
  const parsed = YAML.parse(fs.readFileSync(suitePath, 'utf-8'));
  return parsed?.cases || [];
}

export function createSuiteConfig(suiteName, description) {
  return {
    description,
    prompts: ['{{input}}'],
    providers: ['file://./provider.mjs'],
    tests: loadSuite(suiteName).map(toPromptfooTest),
    evaluateOptions: {
      maxConcurrency: 1,
    },
  };
}
