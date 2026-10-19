import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LlmBenchmarkRunOptions, LlmBenchmarkSample, LlmBenchmarkSampleCase } from '../framework/types';

const benchmarksPackageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.resolve(benchmarksPackageDir, '../..');

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`)
    .join(',')}}`;
}

export function sha256Hex(value: unknown): string {
  const input = typeof value === 'string' ? value : stableJson(value);
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function tryGit(args: string[]) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

function readPackageVersion(packageJsonPath: string) {
  try {
    const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version?: string };
    return json.version;
  } catch {
    return undefined;
  }
}

export function buildSampleManifest(cases: LlmBenchmarkSampleCase[]) {
  return cases.map((sampleCase) => ({
    id: sampleCase.id,
    messagesHash: sha256Hex(sampleCase.messages),
    messageCount: sampleCase.messages.length,
  }));
}

export function buildSampleManifestFromSamples(samples: LlmBenchmarkSample[]) {
  return samples.map((sample) => ({
    id: sample.scenario,
    model: sample.model,
    promptVariant: sample.promptVariant ?? 'full',
    runIndex: sample.runIndex ?? 1,
    protocol: sample.protocol,
    framework: sample.framework,
    materialsVariant: sample.materialsVariant,
    messagesHash: sha256Hex(sample.messages),
    outputHash: sha256Hex(sample.output),
    generatedAt: sample.generatedAt,
  }));
}

export function buildBenchmarkRunMetadata(
  options: LlmBenchmarkRunOptions,
  params: {
    systemPrompt?: string;
    sampleCases?: LlmBenchmarkSampleCase[];
    materialsMeta?: unknown;
  } = {},
) {
  const gitStatus = tryGit(['status', '--porcelain']);
  const sampleManifest = params.sampleCases ? buildSampleManifest(params.sampleCases) : undefined;
  return {
    git: {
      commit: tryGit(['rev-parse', 'HEAD']),
      branch: tryGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      dirty: gitStatus == null ? undefined : gitStatus.length > 0,
    },
    node: process.version,
    packageVersions: {
      benchmarks: readPackageVersion(path.join(benchmarksPackageDir, 'package.json')),
      core: readPackageVersion(path.join(repoRoot, 'packages/core/package.json')),
    },
    configSnapshot: {
      model: options.model,
      models: options.models,
      suite: options.suite,
      protocol: options.protocol,
      framework: options.framework,
      materialsVariant: options.materialsVariant,
      scenarios: options.scenarios,
      scenario: options.scenario,
      repeat: options.repeat,
      concurrency: options.concurrency,
      modelRateLimit: options.modelRateLimit,
      retry: options.retry,
      streamTimeoutMs: options.streamTimeoutMs,
      compareEmptySystem: options.compareEmptySystem,
      compareEmptySystemPlainOnly: options.compareEmptySystemPlainOnly,
      failOnProtocol: options.failOnProtocol,
    },
    hashes: {
      options: sha256Hex({
        protocol: options.protocol,
        framework: options.framework,
        materialsVariant: options.materialsVariant,
        scenarios: options.scenarios,
        scenario: options.scenario,
        repeat: options.repeat,
        compareEmptySystem: options.compareEmptySystem,
        compareEmptySystemPlainOnly: options.compareEmptySystemPlainOnly,
      }),
      ...(params.systemPrompt != null ? { prompt: sha256Hex(params.systemPrompt) } : {}),
      ...(sampleManifest ? { sampleSet: sha256Hex(sampleManifest) } : {}),
      ...(params.materialsMeta != null ? { materialsMeta: sha256Hex(params.materialsMeta) } : {}),
    },
    ...(sampleManifest ? { sampleManifest } : {}),
  };
}

export function buildBenchmarkReportMetadata(options: LlmBenchmarkRunOptions, samples: LlmBenchmarkSample[]) {
  const sampleManifest = buildSampleManifestFromSamples(samples);
  const gitStatus = tryGit(['status', '--porcelain']);
  return {
    git: {
      commit: tryGit(['rev-parse', 'HEAD']),
      branch: tryGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      dirty: gitStatus == null ? undefined : gitStatus.length > 0,
    },
    node: process.version,
    packageVersions: {
      benchmarks: readPackageVersion(path.join(benchmarksPackageDir, 'package.json')),
      core: readPackageVersion(path.join(repoRoot, 'packages/core/package.json')),
    },
    configSnapshot: {
      model: options.model,
      models: options.models,
      protocol: options.protocol,
      framework: options.framework,
      materialsVariant: options.materialsVariant,
      scenarios: options.scenarios,
      scenario: options.scenario,
    },
    hashes: {
      reportOptions: sha256Hex({
        protocol: options.protocol,
        framework: options.framework,
        materialsVariant: options.materialsVariant,
        scenarios: options.scenarios,
        scenario: options.scenario,
        models: options.models,
      }),
      sampleSet: sha256Hex(sampleManifest),
    },
    sampleManifest,
  };
}
