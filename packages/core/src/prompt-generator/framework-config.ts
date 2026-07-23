export interface IGenPromptFrameworkConfig {
  rules?: string[];
}

export type IGenPromptFramework = 'vue' | 'angular' | 'react' | string;

export const vueFrameworkConfig: IGenPromptFrameworkConfig = {
  rules: [
    '- 表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互',
  ],
};

export const angularFrameworkConfig: IGenPromptFrameworkConfig = {
  rules: [],
};

export const reactFrameworkConfig: IGenPromptFrameworkConfig = {
  rules: [],
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
