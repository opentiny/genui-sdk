/**
 * 【临时】用于在 playground 网页里手动验证工具调用链路的示例工具。
 *
 * 不走任何 UI 配置（不需要 MCP / OpenAPI / Skill），注册后直接可用，便于对照非流式路径。
 * 验证完直接删掉本文件、以及 chat-genui.ts 里的 import 和 spread 即可。
 */
import { tool } from 'ai';
import { z } from 'zod';

export function createDevTools() {
  return {
    get_current_time: tool({
      description: '获取当前时间。当用户询问「现在几点」「今天几号」时调用。',
      inputSchema: z.object({
        timezone: z.string().optional().describe('IANA 时区名，例如 Asia/Shanghai；缺省用服务器本地时区'),
      }),
      execute: async ({ timezone }) => {
        const now = new Date();
        return {
          timezone: timezone || 'local',
          iso: now.toISOString(),
          formatted: new Intl.DateTimeFormat('zh-CN', {
            dateStyle: 'full',
            timeStyle: 'medium',
            timeZone: timezone || undefined,
          }).format(now),
        };
      },
    }),

    get_mock_weather: tool({
      description: '查询某个城市的天气。当用户询问某地天气时调用。返回的是模拟数据。',
      inputSchema: z.object({
        city: z.string().describe('城市名，例如 北京'),
      }),
      execute: async ({ city }) => ({
        city,
        temperature: 18 + (city.length % 12),
        condition: '晴',
        note: '模拟数据，仅用于联调工具调用',
      }),
    }),
  };
}
