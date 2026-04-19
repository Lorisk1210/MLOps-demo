import { createSuiteConfig } from './config-utils.mjs';

export default createSuiteConfig(
  'prompt_injection',
  'Prompt injection and jailbreak suite: system-prompt leak, instruction override, roleplay, delimiter confusion, indirect injection.',
);
