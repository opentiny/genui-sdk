import { tool } from 'ai';
import { z } from 'zod';

/**
 * 计算两个数字的和的工具
 */
export const addTwoNums = tool({
  description:
    '计算两个数字的和。这是一个数学计算工具，用于将两个数字相加。调用时必须提供两个数字参数 a 和 b。示例：如果 a=5, b=3，则返回 8。',
  inputSchema: z.object({
    a: z.number().describe('第一个要相加的数字，必填，必须是数字类型。例如：5'),
    b: z.number().describe('第二个要相加的数字，必填，必须是数字类型。例如：3'),
  }),
  execute: async ({ a, b }: { a: number; b: number }) => {
    return a + b;
  },
});

/**
 * 所有可用的工具列表
 */
export const availableTools = {
  add_two_numbers: addTwoNums,
};
