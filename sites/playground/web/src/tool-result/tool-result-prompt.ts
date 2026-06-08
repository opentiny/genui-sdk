export const TOOL_RESULT_PROMPT = `
## 工具结果使用规范

工具调用完成后，会将工具调用结果缓存到运行时上下文，如果需要使用工具结果，可以通过 \`this.callAction('getToolResult', { toolName, id })\` 在运行时获取调用结果。

**必须遵守：**
- 如果工具调用返回的是长列表或者是大数据量，禁止在 \`schemaJson.state\` 中内联完整工具返回数据
- 工具调用如果可以配置返回类型，请配置成json格式
- 除了小数据量可以直接赋值给 \`this.state\`，其他情况必须通过 \`this.callAction('getToolResult', { toolName, id })\` 在运行时获取工具结果
- \`id\` 必须使用工具返回结果中的 \`id\` 字段原样复制，禁止编造
- 在 \`methods\`、生命周期或事件回调中取数后，再赋值给 \`this.state\`

示例用法：
\`\`\`json
{
  "methods": {
    "loadToolData": {
      "type": "JSFunction",
      "value": "function() { const data = this.callAction('getToolResult', { toolName: 'tool_call_name', id: 'call_id' }); if (data) { this.state.tableData = data; } }"
    }
  },
  "lifeCycles": {
    "onMounted": {
      "type": "JSFunction",
      "value": "function() { this.loadToolData(); }"
    }
  }
}
\`\`\`
`.trim();

/**
 * 判断当前 Playground 配置是否启用了外部工具（MCP / Agent / Skill）。
 *
 * @param config - Playground LLM 配置片段
 * @returns 是否需要注入工具结果引用提示词
 */
export const shouldInjectToolResultPrompt = (config: {
  mcpServers?: unknown[];
  agents?: Array<{ enabled?: boolean }>;
  skills?: Array<{ enabled?: boolean }>;
}): boolean => {
  const hasMcp = (config.mcpServers?.length ?? 0) > 0;
  const hasAgents = (config.agents ?? []).some((agent) => agent.enabled !== false);
  const hasSkills = (config.skills ?? []).some((skill) => skill.enabled !== false);

  return hasMcp || hasAgents || hasSkills;
};

/**
 * 在请求 promptList 末尾虚拟追加工具结果引用提示词（不修改用户持久化配置）。
 *
 * @param promptList - 用户配置的 prompt 列表
 * @param config - Playground LLM 配置片段
 * @returns 合并后的 prompt 列表
 */
export const appendToolResultPrompt = (
  promptList: string[] | undefined,
  config: {
    mcpServers?: unknown[];
    agents?: Array<{ enabled?: boolean }>;
    skills?: Array<{ enabled?: boolean }>;
  },
): string[] => {
  const basePromptList = [...(promptList || [])];

  if (!shouldInjectToolResultPrompt(config)) {
    return basePromptList;
  }

  if (basePromptList.includes(TOOL_RESULT_PROMPT)) {
    return basePromptList;
  }

  return [...basePromptList, TOOL_RESULT_PROMPT];
};
