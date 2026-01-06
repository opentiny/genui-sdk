import { createDeepSeek } from '@ai-sdk/deepseek';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * AI SDK Provider 创建器映射
 * 根据 providerName 选择对应的 provider 创建器
 */
export const providers = {
  deepseek: createDeepSeek,
  anthropic: createAnthropic,
  openai: createOpenAI,
  openrouter: createOpenRouter,
} as const;

/**
 * Provider 配置接口
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  [key: string]: any;
}

/**
 * 根据 providerName 创建对应的 provider 实例
 * @param providerName 提供商名称
 * @param config 提供商配置
 * @returns Provider 实例
 */
export function createProvider(providerName: string, config: ProviderConfig) {
  const providerCreator = providers[providerName as keyof typeof providers];

  if (!providerCreator) {
    throw new Error(`Unsupported provider: ${providerName}. Supported providers: ${Object.keys(providers).join(', ')}`);
  }

  if (providerName === 'openrouter') {
    return createOpenRouter(config).completion;
  }

  return providerCreator(config);
}

/**
 * 获取支持的 provider 列表
 * @returns 支持的 provider 名称数组
 */
export function getSupportedProviders(): string[] {
  return Object.keys(providers);
}

/**
 * 检查 provider 是否支持
 * @param providerName 提供商名称
 * @returns boolean
 */
export function isProviderSupported(providerName: string): boolean {
  return providerName in providers;
}
