import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

import { generateSamples } from './src/generate-samples';
import { runReport } from './src/run-report';
import { resolveRunOptions } from './src/resolve-run-options';
import { envBool } from './src/utils';
import { startBenchUi } from './src/ui/server';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(packageDir, '.env') });

function wantsCli(): boolean {
  const argv = process.argv.slice(2);
  if (argv.includes('--cli') || argv.includes('--no-ui')) return true;
  // BENCH_UI=false / 0 → headless；未设置时默认打开配置页
  if (process.env.BENCH_UI !== undefined && process.env.BENCH_UI.trim() !== '') {
    return !envBool('BENCH_UI', true);
  }
  return false;
}

/**
 * 无 UI：固定串行执行 generate + report。
 */
async function runCli() {
  const benchmarkStartedAtMs = Date.now();
  const options = resolveRunOptions();
  const gen = await generateSamples(options);
  await runReport({
    ...options,
    benchmarkStartedAtMs,
    samplesDir: gen.samplesDir,
  });
}

async function main() {
  if (wantsCli()) {
    await runCli();
    return;
  }
  await startBenchUi();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
