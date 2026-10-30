#!/usr/bin/env node
import { createUsage } from './args';
import { runWebComponentBuildCli } from './index';

runWebComponentBuildCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`[genui web-component] 构建失败：${error instanceof Error ? error.message : error}`);
  if (process.env.GENUI_WC_DEBUG) {
    console.error(error);
  } else {
    console.error('如需完整堆栈，请设置 GENUI_WC_DEBUG=1 后重试。');
  }
  console.error(`\n${createUsage()}`);
  process.exit(1);
});
