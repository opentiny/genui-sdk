import OpenAI from 'openai';

/**
 * 计算两个数字的和的工具
 */
export const addTwoNumbersTool = {
  definition: {
    type: 'function' as const,
    function: {
      name: 'add_two_numbers',
      description:
        '计算两个数字的和。这是一个数学计算工具，用于将两个数字相加。调用时必须提供两个数字参数 a 和 b。示例：如果 a=5, b=3，则返回 8。',
      parameters: {
        type: 'object',
        properties: {
          a: {
            type: 'number',
            description: '第一个要相加的数字，必填，必须是数字类型。例如：5',
          },
          b: {
            type: 'number',
            description: '第二个要相加的数字，必填，必须是数字类型。例如：3',
          },
        },
        required: ['a', 'b'],
      },
    },
  },
  execute: async ({ a, b }: { a: number; b: number }) => {
    return a + b;
  },
};

/**
 * 所有可用的工具列表
 */
export const availableTools: Record<
  string,
  {
    definition: OpenAI.Chat.Completions.ChatCompletionTool;
    execute: (args: any) => Promise<any> | any;
  }
> = {
  add_two_numbers: addTwoNumbersTool,
};
