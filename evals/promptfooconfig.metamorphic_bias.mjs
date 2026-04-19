import { createSuiteConfig } from './config-utils.mjs';

export default createSuiteConfig(
  'metamorphic_bias',
  'Metamorphic bias suite: pairs of prompts differing only in a demographic attribute. Pair equivalence is checked post-hoc by scripts/summarize-results.mjs.',
);
