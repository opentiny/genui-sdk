import fs from 'node:fs';
import path from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readReport(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
}

function comparableSnapshot(report) {
  return {
    protocol: report.config?.protocol,
    framework: report.config?.framework,
    materialsVariant: report.config?.materialsVariant,
    scenarios: [...(report.config?.scenarios ?? [])].sort(),
    promptVariants: [...(report.config?.promptVariants ?? [])].sort(),
    concurrency: report.config?.concurrency,
    promptHash: report.runMetadata?.hashes?.prompt,
    sampleSetHash: report.runMetadata?.hashes?.sampleSet,
    materialsMetaHash: report.runMetadata?.hashes?.materialsMeta,
  };
}

function comparisonKey(row, model) {
  return `${row.scenario}::${model}`;
}

function flatten(report) {
  const rows = new Map();
  for (const scenario of report.comparisonByScenario ?? []) {
    for (const [model, metrics] of Object.entries(scenario.byModel ?? {})) {
      rows.set(comparisonKey(scenario, model), { scenario: scenario.scenario, model, ...metrics });
    }
  }
  return rows;
}

function delta(current, baseline) {
  if (typeof current !== 'number' || typeof baseline !== 'number') return undefined;
  return {
    baseline,
    current,
    absolute: current - baseline,
    relative: baseline === 0 ? undefined : (current - baseline) / baseline,
  };
}

export function diffBenchmarkReports(baseline, current) {
  const baselineSnapshot = comparableSnapshot(baseline);
  const currentSnapshot = comparableSnapshot(current);
  const comparable = JSON.stringify(baselineSnapshot) === JSON.stringify(currentSnapshot);
  const baselineRows = flatten(baseline);
  const currentRows = flatten(current);
  const rows = [];

  for (const [key, currentRow] of currentRows) {
    const baselineRow = baselineRows.get(key);
    if (!baselineRow) continue;
    const protocolPassRate = delta(currentRow.schemaPassRate, baselineRow.schemaPassRate);
    const p95TotalMs = delta(
      currentRow.distributions?.totalMs?.p95,
      baselineRow.distributions?.totalMs?.p95,
    );
    const avgTotalTokens = delta(currentRow.avgTotalTokens, baselineRow.avgTotalTokens);
    rows.push({
      scenario: currentRow.scenario,
      model: currentRow.model,
      protocolPassRate,
      p95TotalMs,
      avgTotalTokens,
      regression:
        protocolPassRate?.absolute < 0 ||
        (p95TotalMs?.relative > 0.2 && p95TotalMs.absolute > 2_000) ||
        avgTotalTokens?.relative > 0.15,
    });
  }

  return {
    schemaVersion: 1,
    comparable,
    comparableReason: comparable ? 'fingerprint_match' : 'fingerprint_mismatch',
    baselineFingerprint: baselineSnapshot,
    currentFingerprint: currentSnapshot,
    health: {
      requestSuccessRate: delta(
        current.healthSummary?.requestSuccessRate,
        baseline.healthSummary?.requestSuccessRate,
      ),
      protocolPassRateOnSuccess: delta(
        current.healthSummary?.protocolPassRateOnSuccess,
        baseline.healthSummary?.protocolPassRateOnSuccess,
      ),
      endToEndSuccessRate: delta(
        current.healthSummary?.endToEndSuccessRate,
        baseline.healthSummary?.endToEndSuccessRate,
      ),
    },
    rows,
    regressions: comparable ? rows.filter((row) => row.regression) : [],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const baselinePath = readArg('--baseline');
  const currentPath = readArg('--current');
  const outputPath = readArg('--out');
  if (!baselinePath || !currentPath) {
    console.error('Usage: node scripts/diff-reports.mjs --baseline <report.json> --current <report.json> [--out <diff.json>]');
    process.exit(1);
  }
  const result = diffBenchmarkReports(readReport(baselinePath), readReport(currentPath));
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    fs.writeFileSync(path.resolve(outputPath), json, 'utf8');
    console.log(path.resolve(outputPath));
  } else {
    process.stdout.write(json);
  }
}
