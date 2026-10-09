/**
 * 用真实模型多轮对话录制 A2UI contextual 历史，写入 src/samples/contextual-a2ui.ts。
 *
 * 用法（packages/benchmarks）：
 *   pnpm exec tsx ./scripts/capture-a2ui-contextual.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { streamText } from 'ai';
import { buildA2uiSystemPrompt } from '../src/protocol/a2ui/prompt.ts';
import { validateA2uiOutput } from '../src/protocol/a2ui/validate.ts';
import { resolveAiSdkModelForBench } from '../src/utils/resolve-ai-sdk-model.ts';
import { resolveStreamTextUsage, benchStreamTextAbortSignal } from '../src/utils/stream-text-usage.ts';
import type { LlmBenchmarkMessage, LlmBenchmarkSampleCase } from '../src/framework/types.ts';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(pkgRoot, '.env') });

type TurnPlan = {
  id: string;
  /** 需要模型生成的中间轮（不含最后一轮 user） */
  historyUserPrompts: string[];
  /** 场景最后一条 user（留给基准作待答） */
  finalUser: string;
};

const PLANS: TurnPlan[] = [
  {
    id: 'context-login-form',
    historyUserPrompts: ['生成一个登录表单', '增加忘记密码'],
    // 历史仅有登录+忘记密码，勿写「删除注册」（与 genui 历史不同）
    finalUser: '增加去注册',
  },
  {
    id: 'context-user-table',
    historyUserPrompts: ['生成一个支持行内编辑的用户列表，支持编辑、保存、取消，并展示操作结果提示。'],
    // 与录制历史字段对齐（name/email/role），勿套用 genui 电商表头文案
    finalUser: '角色要支持筛选',
  },
];

async function callModel(
  modelId: string,
  system: string,
  messages: LlmBenchmarkMessage[],
): Promise<{ output: string; model: string }> {
  const modelInstance = await resolveAiSdkModelForBench(modelId);
  const abortSignal = benchStreamTextAbortSignal(600_000);
  const streamResult = streamText({
    model: modelInstance,
    temperature: 0,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    ...(abortSignal ? { abortSignal } : {}),
  });
  let output = '';
  for await (const chunk of streamResult.fullStream) {
    if (chunk.type === 'text-delta' && chunk.text) output += chunk.text;
    if (chunk.type === 'error') {
      throw new Error(chunk.error instanceof Error ? chunk.error.message : String(chunk.error));
    }
  }
  await resolveStreamTextUsage(streamResult);
  return { output, model: modelId };
}

async function generateUntilValid(
  modelId: string,
  system: string,
  messages: LlmBenchmarkMessage[],
  attempts = 3,
): Promise<string> {
  let lastErr = 'unknown';
  let working = [...messages];
  for (let i = 0; i < attempts; i++) {
    console.log(`[capture] generate attempt ${i + 1}/${attempts} (msgs=${working.length}) ...`);
    const { output } = await callModel(modelId, system, working);
    const v = validateA2uiOutput(output);
    if (v.isSchemaJsonValidAgainstProtocol) {
      console.log(`[capture] ok chars=${output.length}`);
      return output;
    }
    lastErr = v.schemaValidationError ?? 'protocol fail';
    console.warn(`[capture] invalid: ${lastErr}`);
    console.warn(`[capture] output preview: ${output.slice(0, 400).replace(/\s+/g, ' ')}…`);
    // 把校验错误喂回模型，要求自修正（仍作为同一轮待答，不写入最终历史）
    working = [
      ...messages,
      {
        role: 'user',
        content:
          `上一次输出未通过 A2UI schema 校验：${lastErr}\n` +
          `请重新输出完整回复：必须用 <a2ui-json>…</a2ui-json> 包裹；` +
          `JSON 为消息数组；每条须含 version 与 createSurface|updateComponents|updateDataModel|deleteSurface 之一；` +
          `若新建 UI，先 createSurface 再 updateComponents，且 components 中须有 id 为 root 的组件。`,
      },
    ];
  }
  throw new Error(`Failed to get valid A2UI after ${attempts} attempts: ${lastErr}`);
}

function toTsString(s: string): string {
  return JSON.stringify(s);
}

function emitFile(cases: LlmBenchmarkSampleCase[], modelId: string): string {
  const generatedAt = new Date().toISOString();
  const body = cases
    .map((c) => {
      const msgs = c.messages
        .map((m) => {
          return `    {\n      role: ${toTsString(m.role)},\n      content: ${toTsString(m.content)},\n    }`;
        })
        .join(',\n');
      return `  {\n    id: ${toTsString(c.id)},\n    messages: [\n${msgs},\n    ],\n  }`;
    })
    .join(',\n');

  return `/**
 * A2UI 上下文场景：assistant 历史来自真实多轮对话录制。
 *
 * 录制：\`pnpm exec tsx ./scripts/capture-a2ui-contextual.mts\`
 * 模型：${modelId}
 * 时间：${generatedAt}
 */
import type { LlmBenchmarkSampleCase } from '../framework/index';

export const contextualA2uiLlmBenchmarkSampleCases: LlmBenchmarkSampleCase[] = [
${body},
];
`;
}

async function main() {
  const modelId = process.env.BENCH_MODEL?.trim() || 'DeepSeek-V3.2';
  const system = buildA2uiSystemPrompt();
  const cases: LlmBenchmarkSampleCase[] = [];
  const outPath = path.join(pkgRoot, 'src/samples/contextual-a2ui.ts');

  for (const plan of PLANS) {
    console.log(`\n[capture] === ${plan.id} ===`);
    try {
      const messages: LlmBenchmarkMessage[] = [];
      for (const userText of plan.historyUserPrompts) {
        messages.push({ role: 'user', content: userText });
        const assistant = await generateUntilValid(modelId, system, messages);
        messages.push({ role: 'assistant', content: assistant });
      }
      messages.push({ role: 'user', content: plan.finalUser });
      cases.push({ id: plan.id, messages });
      // 每完成一个场景就落盘，避免后一个失败丢掉前面结果
      fs.writeFileSync(outPath, emitFile(cases, modelId), 'utf-8');
      console.log(`[capture] checkpoint wrote ${cases.length} case(s) → ${outPath}`);
    } catch (err) {
      console.error(`[capture] ${plan.id} failed:`, err instanceof Error ? err.message : err);
      if (cases.length > 0) {
        fs.writeFileSync(outPath, emitFile(cases, modelId), 'utf-8');
        console.log(`[capture] partial write kept ${cases.length} case(s)`);
      }
      throw err;
    }
  }

  console.log(`\n[capture] done → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
