import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const casesPath = path.join(__dirname, 'cases.yaml');
const allCases = YAML.parse(fs.readFileSync(casesPath, 'utf-8'));

function toPromptfooTest(testCase) {
  return {
    description: `${testCase.id}: ${testCase.expected}`,
    vars: {
      input: testCase.input,
      ...(testCase.vars || {}),
    },
    metadata: {
      id: testCase.id,
      layer: testCase.layer,
      severity: testCase.severity,
      expected: testCase.expected,
    },
    assert: testCase.assertions,
  };
}

export function createSuiteConfig(suiteName, description) {
  return {
    description,
    prompts: ['{{input}}'],
    providers: ['file://./provider.mjs'],
    tests: (allCases[suiteName] || []).map(toPromptfooTest),
    evaluateOptions: {
      maxConcurrency: 1,
    },
  };
}
