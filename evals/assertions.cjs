function normalize(output) {
  return String(output || '').toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function containsAll(output, context) {
  const haystack = normalize(output);
  const terms = asArray(context.config?.terms);
  const missing = [];

  for (const term of terms) {
    const alternatives = asArray(term).map((value) => String(value).toLowerCase());
    const matched = alternatives.some((value) => haystack.includes(value));

    if (!matched) {
      missing.push(alternatives.join(' | '));
    }
  }

  return {
    pass: missing.length === 0,
    score: missing.length === 0 ? 1 : 0,
    reason:
      missing.length === 0
        ? 'All expected facts were present.'
        : `Missing expected facts: ${missing.join(', ')}`,
  };
}

function withinWordRange(output, context) {
  const words = String(output || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const min = Number(context.config?.min ?? 0);
  const max = Number(context.config?.max ?? Number.POSITIVE_INFINITY);
  const pass = words.length >= min && words.length <= max;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: `Expected ${min}-${max} words, received ${words.length}.`,
  };
}

function groundedRefusal(output, context) {
  const haystack = normalize(output);
  const refusalCues = [
    'not in the materials',
    'not in the course materials',
    'not mentioned in the materials',
    'not mentioned in the course materials',
    'based on the materials',
    'the materials do not',
    "i don't know",
    'i do not know',
    'not provided',
  ];
  const disallowedPatterns = asArray(context.config?.disallowedPatterns).map(
    (pattern) => new RegExp(pattern, 'i'),
  );
  const hasCue = refusalCues.some((cue) => haystack.includes(cue));
  const matchedDisallowed = disallowedPatterns.find((pattern) =>
    pattern.test(String(output || '')),
  );

  return {
    pass: hasCue && !matchedDisallowed,
    score: hasCue && !matchedDisallowed ? 1 : 0,
    reason: matchedDisallowed
      ? `Output matched a disallowed pattern: ${matchedDisallowed}`
      : hasCue
        ? 'Grounded refusal detected.'
        : 'No grounded-refusal cue was detected.',
  };
}

function omitsTerms(output, context) {
  const haystack = normalize(output);
  const terms = asArray(context.config?.terms).map((term) =>
    String(term).toLowerCase(),
  );
  const found = terms.filter((term) => haystack.includes(term));

  return {
    pass: found.length === 0,
    score: found.length === 0 ? 1 : 0,
    reason:
      found.length === 0
        ? 'Output omitted all forbidden terms.'
        : `Output included forbidden terms: ${found.join(', ')}`,
  };
}

module.exports = {
  containsAll,
  groundedRefusal,
  omitsTerms,
  withinWordRange,
};
