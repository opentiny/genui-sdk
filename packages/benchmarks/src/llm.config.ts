import type { IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';

/**
 * 生成样本时 system prompt 的配置（与 chat-genui 一致：genPrompt + specificPrompt + userAppendPrompt）。
 * 修改本文件即可调整基准测试所用的提示词上下文，无需改 generate-samples 逻辑。
 */
export type GenerateSamplesPromptConfig = {
  /** 对应 chat-genui 的 tgCustomConfig（metadata.tinygenui 解析结果形态） */
  tgCustomConfig: IGenPromptCustomConfig;
  /** 对应 chat-genui 的 modelInfo.model.specificPrompt 等附加 system 片段 */
  specificPrompt: string;
  /** 对应 chat-genui 的 playground 用户追加 prompt */
  userAppendPrompt: string;
};

export const generateSamplesPromptConfig: GenerateSamplesPromptConfig = {
  tgCustomConfig: {},
  specificPrompt: 'schemaJson必须使用```schemaJson```包裹。',
  userAppendPrompt: '',
};
