import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProvider } from './ai-sdk-providers.js';

/**
 * 模型信息接口
 */
export interface ModelInfo {
  model: {
    name: string;
    id: string;
    [key: string]: any;
  };
  provider: {
    name: string;
    baseUrl?: string;
    apiKeyEnvName?: string;
    baseUrlEnvName?: string;
    [key: string]: any;
  };
}

/**
 * 提供商模型映射器
 * 根据 provider-models.json 格式构建模型名称到完整模型信息的映射
 */
export class ProviderModelMapper {
  private readonly map: Map<string, ModelInfo>;

  /**
   * 创建映射器实例
   * @param providerModelsData 提供商模型数据对象
   */
  constructor(private readonly providerModelsData: Record<string, any>) {
    if (!providerModelsData || typeof providerModelsData !== 'object') {
      throw new Error('Provider models data must be a valid object');
    }

    this.map = this.buildMap();
  }

  /**
   * 根据模型名称获取完整模型信息
   * @param modelName 模型名称，自定义的模型别名如 "模型一"
   * @returns 模型信息对象，未找到返回 undefined
   */
  getModelInfo(modelName: string): ModelInfo | undefined {
    return this.map.get(modelName);
  }

  /**
   * 根据模型名称获取提供商名称
   * @param modelName 模型名称，自定义的模型别名如 "模型一"
   * @returns 提供商名称，未找到返回 undefined
   */
  getProvider(modelName: string): string | undefined {
    const modelInfo = this.getModelInfo(modelName);
    if (!modelInfo) {
      return undefined;
    }
    return modelInfo.provider.name;
  }

  /**
   * 检查是否包含某个模型
   * @param modelName 模型名称
   */
  hasModel(modelName: string): boolean {
    return this.map.has(modelName);
  }
  /**
   * 获取所有模型的详细信息数组（仅 model 字段，不包含 provider 信息）
   */
  getAllModelInfos(): any[] {
    return Array.from(this.map.values()).map((info) => ({ name: info.model.name, features: info.model.features }));
  }

  /**
   * 获取所有提供商名称
   */
  getAllProviders(): string[] {
    const providers = new Set<string>();
    for (const modelInfo of this.map.values()) {
      providers.add(modelInfo.provider.name);
    }
    return Array.from(providers);
  }

  /**
   * 根据提供商获取所有模型名称
   * @param providerName 提供商名称
   */
  getModelsByProvider(providerName: string): string[] {
    return Array.from(this.map.entries())
      .filter(([, modelInfo]) => modelInfo.provider.name === providerName)
      .map(([modelName]) => modelName);
  }

  /**
   * 根据提供商获取所有模型信息
   * @param providerName 提供商名称
   */
  getModelInfosByProvider(providerName: string): ModelInfo[] {
    return Array.from(this.map.values()).filter((modelInfo) => modelInfo.provider.name === providerName);
  }

  private buildMap(): Map<string, ModelInfo> {
    const result = new Map<string, ModelInfo>();

    for (const [providerKey, providerData] of Object.entries(this.providerModelsData)) {
      if (providerData && typeof providerData === 'object' && providerData.name) {
        // 构建提供商信息（排除models字段）
        const providerInfo = { ...providerData };
        delete providerInfo.models;

        if (Array.isArray(providerData.models)) {
          providerData.models.forEach((model: any) => {
            if (model && model.name) {
              const modelKey = model.name;
              result.set(modelKey, {
                model: { ...model },
                provider: { ...providerInfo },
              });
            }
          });
        }
      }
    }

    return result;
  }

  /**
   * 根据模型名称获取 ai-sdk 模型实例
   * @param modelInfo 模型信息
   * @returns ai-sdk 模型实例
   */
  getAiSDKModel(modelInfo: ModelInfo) {
    const { provider, model } = modelInfo;
    const { name: providerName, baseUrl, apiKeyEnvName, baseUrlEnvName } = provider;
    const apiKey = process.env[apiKeyEnvName];
    const envUrl = process.env[baseUrlEnvName];
    const { id: modelId } = model;
    const providerInstance = createProvider(providerName, {
      baseURL: envUrl || baseUrl,
      apiKey: apiKey,
    });

    return providerInstance(modelId);
  }
}

/**
 * 从JSON文件创建提供商模型映射器
 * @param filePath JSON文件路径
 */
export async function createProviderModelMapperFromFile(filePath: string): Promise<ProviderModelMapper> {
  try {
    // 在 ES 模块中获取当前文件的目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const providerPath = path.resolve(__dirname, filePath);
    const fileContent = await fs.readFile(providerPath, 'utf-8');
    const providerModelsData = JSON.parse(fileContent);
    return new ProviderModelMapper(providerModelsData);
  } catch (error) {
    throw new Error(`Failed to load provider models from ${filePath}: ${error}`);
  }
}
