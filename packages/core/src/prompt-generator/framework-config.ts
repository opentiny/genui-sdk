export interface IGenPromptFrameworkConfig {
  rules?: string[];
}

export type IGenPromptFramework = 'vue' | 'angular' | 'react' | string;

export const vueFrameworkConfig: IGenPromptFrameworkConfig = {
  rules: [
    '- 表单输入项（input/select/radio 等）必须设置双向绑定，如设置 `modelValue` 的  `type` 为 `JSExpression` 且 `model` 为 `true`，且 `value` 必须具有对应 `state` 状态字段',
  ],
};

export const angularFrameworkConfig: IGenPromptFrameworkConfig = {
  rules: [],
};

export const reactFrameworkConfig: IGenPromptFrameworkConfig = {
  rules: [
    '- React 表单组件必须通过受控属性（如 `value` 或 `checked`）读取 `state`，并显式提供 `onChange` 类型的 `JSFunction` 更新对应 `state`；`model: true` 不会自动生成变更事件',
  ],
};

const frameworkConfigMap: Record<IGenPromptFramework, IGenPromptFrameworkConfig> = {
  vue: vueFrameworkConfig,
  angular: angularFrameworkConfig,
  react: reactFrameworkConfig,
};

export function getFrameworkConfig(framework: string): IGenPromptFrameworkConfig {
  const key = framework.toLowerCase() as IGenPromptFramework;
  return frameworkConfigMap[key] ?? vueFrameworkConfig;
}
