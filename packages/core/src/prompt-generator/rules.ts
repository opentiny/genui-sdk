import type { IGenPromptAction } from './action';
import type { IGenPromptOptions } from './prompt';

export const skillRulesPrompt = ['特别重要：除了上下文数据和工具调用结果以外，禁止使用任何Mock数据'];

export const targetRulesPrompt = ['如果上下文或者工具调用结果中没有可用数据，可以使用Mock数据来完成会话'];

function formatRuleItems(rules: string[]) {
  return rules.map((rule) => (rule.startsWith('- ') ? rule : `- ${rule}`));
}

function buildBaseRuleItems(
  tgCustomConfig: { customActions?: IGenPromptAction[] } | undefined,
  wrapperComponent?: string,
) {
  const hasContinueChat = tgCustomConfig?.customActions?.some((action) => action.name === 'continueChat');
  const hasSaveState = tgCustomConfig?.customActions?.some((action) => action.name === 'saveState');

  const actionRules: string[] = [];
  if (hasContinueChat) {
    actionRules.push('- 如需要确认信息或者涉及继续操作，请使用 `this.callAction` 去调用 continueChat');
  }
  if (hasSaveState) {
    actionRules.push(
      '- 如果当前操作列数据（增删查改等），请调用 `this.callAction` 去调用 saveState，保存当前状态，方便持久化存储',
    );
  }

  return [
    '- schemaJson 必须是一个根节点 `componentName` 为 `Page` 的 JSON',
    ...actionRules,
    '- `type` 为 `JSFunction` 的 `value` 必须是完整的函数',
    '- `state` 和 `methods` 字段必须紧跟 `"componentName": "Page",` 之后，请务必先生成 `state` 和 `methods` 字段，再使用。',
    '- `children` 不能放到 `props` 里，必须是数组或字符串',
    '- `children` 不支持 `JSExpression` 表达式；请使用 `Text` 组件展示文本，或使用 `loop` 来实现列表渲染',
    '- 单个组件节点也可以使用 `condition` 来控制显示',
    '- 请注意对话的连续性，不要重复渲染多余内容',
    '- 图片和链接地址不可杜撰',
    '- 只允许从上下文获取组件API，禁止杜撰组件API',
    ...(wrapperComponent
      ? [`- 根节点请尽可能使用 \`${wrapperComponent}\` 组件包裹，但禁止设置颜色样式`]
      : []),
    '- 禁止设置所有组件的 `background`、`color`、`background-color` 等颜色 CSS 样式',
    '- 禁止使用任何弹窗组件，逻辑中禁止使用 `alert`、`confirm`、`prompt`',
    '- 生成的 schemaJson 必须使用 \`\`\`schemaJson {content} \`\`\` 代码块包裹',
  ];
}

export function genRulesPrompt(
  tgCustomConfig?: { customActions?: IGenPromptAction[] },
  wrapperComponent?: string,
  promptOptions?: IGenPromptOptions,
) {
  const includeBaseRules = promptOptions?.includeBaseRules ?? true;
  const extraRules = promptOptions?.rules ?? [];
  const modeRules = promptOptions?.isSkill ? skillRulesPrompt : targetRulesPrompt;

  const ruleItems = [
    ...(includeBaseRules ? buildBaseRuleItems(tgCustomConfig, wrapperComponent) : []),
    ...formatRuleItems(modeRules),
    ...formatRuleItems(extraRules),
  ];

  if (ruleItems.length === 0) {
    return '';
  }

  const rules = ruleItems.join('\n');

  if (!includeBaseRules) {
    return `## schemaJson 生成规则

${rules}
`;
  }

  return `## schemaJson 生成规则

以下规则需要**特别注意**：

${rules}

---

根据用户输入，挑选合适的组件生成对应卡片的 schemaJSON。请尽量使用丰富的 UI 组件生成漂亮的卡片。

**输出示例：**

\`\`\`schemaJson
{ "componentName": "Page", "state": { "name": "张三" }, "methods": {}, "children": [{ "componentName": "p", "children": "示例输出" }] }
\`\`\`

### 最高优先级规则

以下规则具有最高优先级，必须严格满足：

- 输出的 schemaJson 必须是严格的JSON格式，禁止省略属性的双引号，禁止使用单引号，禁止在最后一个属性添加逗号，禁止使用注释
- 如果有信息要展示，请主动生成卡片
- 如果需要用户提供更多信息补充，请主动生成表单卡片

**其他规则与最高优先级规则冲突时，忽略其他规则，优先满足最高优先级规则。**
`;
}
