import {
  createProviderModelMapperFromFile,
  createProviderModelMapperFromData,
  type ProviderModelMapper,
} from './provider-models-mapper.js';

/**
 * 共享的提供商模型映射器实例
 * 确保整个应用只有一个实例，避免重复创建和内存浪费
 */
let providerModelMapper: ProviderModelMapper | null = null;

/**
 * 统一的 ProviderModelMapper Hook
 * 支持初始化和获取同一个实例
 * @param filePath 可选的JSON文件路径，仅在首次调用时有效
 * @returns ProviderModelMapper 实例
 */
export async function useProviderModelMapper(filePath?: string): Promise<ProviderModelMapper> {
  if (!providerModelMapper) {
    if (!filePath) {
      throw new Error('Provider models file path is required for first initialization');
    }
    providerModelMapper = await createProviderModelMapperFromFile(filePath);
  }
  return providerModelMapper;
}

/**
 * 使用内存中的提供商模型数据初始化映射器（主要用于远程拉取 OpenTiny 模型）
 * @param providerModelsData 提供商模型数据对象
 */
export async function initProviderModelMapperFromData(
  providerModelsData: Record<string, any>,
): Promise<ProviderModelMapper> {
  providerModelMapper = createProviderModelMapperFromData(providerModelsData);
  return providerModelMapper;
}

export function useProviderModelMapperSync(): ProviderModelMapper {
  if (!providerModelMapper) {
    throw new Error('Provider model mapper has not been initialized. Call useProviderModelMapper() first.');
  }

  return providerModelMapper;
}

/**
 * 重置 ProviderModelMapper 实例（主要用于测试）
 */
export function useResetProviderModelMapper(): void {
  providerModelMapper = null;
}

