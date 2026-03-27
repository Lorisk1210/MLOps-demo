const thresholds = {
  errorRate: Number(process.env.CANARY_ERROR_RATE_LIMIT ?? 0.02),
  latencyMs: Number(process.env.CANARY_P95_LATENCY_LIMIT_MS ?? 2500),
  refusalRate: Number(process.env.CANARY_REFUSAL_RATE_LIMIT ?? 0.35),
  hallucinationIncidents: Number(
    process.env.CANARY_HALLUCINATION_LIMIT ?? 0,
  ),
  estimatedCostUsd: Number(process.env.CANARY_COST_LIMIT_USD ?? 5),
};

const metrics = {
  errorRate: Number(process.env.CANARY_ERROR_RATE ?? 0.01),
  latencyMs: Number(process.env.CANARY_P95_LATENCY_MS ?? 1200),
  refusalRate: Number(process.env.CANARY_REFUSAL_RATE ?? 0.15),
  hallucinationIncidents: Number(process.env.CANARY_HALLUCINATION_INCIDENTS ?? 0),
  estimatedCostUsd: Number(process.env.CANARY_ESTIMATED_COST_USD ?? 0.5),
};

const failures = [];

if (metrics.errorRate > thresholds.errorRate) {
  failures.push(
    `error rate ${metrics.errorRate} exceeded ${thresholds.errorRate}`,
  );
}

if (metrics.latencyMs > thresholds.latencyMs) {
  failures.push(
    `p95 latency ${metrics.latencyMs}ms exceeded ${thresholds.latencyMs}ms`,
  );
}

if (metrics.refusalRate > thresholds.refusalRate) {
  failures.push(
    `refusal rate ${metrics.refusalRate} exceeded ${thresholds.refusalRate}`,
  );
}

if (
  metrics.hallucinationIncidents > thresholds.hallucinationIncidents
) {
  failures.push(
    `hallucination incidents ${metrics.hallucinationIncidents} exceeded ${thresholds.hallucinationIncidents}`,
  );
}

if (metrics.estimatedCostUsd > thresholds.estimatedCostUsd) {
  failures.push(
    `estimated cost $${metrics.estimatedCostUsd} exceeded $${thresholds.estimatedCostUsd}`,
  );
}

console.log('Canary metrics:', JSON.stringify(metrics, null, 2));

if (failures.length > 0) {
  console.error('Canary gate failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Canary gate passed.');
