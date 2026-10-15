import {
  createProviderModelMapperFromFile,
  loadProviderModelsDataFromFile,
  type ModelInfo,
} from '../../../../sites/playground/server/src/provider-models-mapper';
import { resolveMaasModelsJsonPath } from './maas-manifest-models';

type BenchProviderMapper = Awaited<ReturnType<typeof createProviderModelMapperFromFile>>;

/** 并行加载 mapper 与原始 JSON；任一步失败时清空缓存以便进程内重试，避免永久缓存 rejected promise。 */
let benchMapperInit: Promise<{ mapper: BenchProviderMapper; data: Record<string, any> | null }> | null = null;

async function getBenchMapperAndData() {
  if (!benchMapperInit) {
    const providerModelsPath = resolveMaasModelsJsonPath();
    benchMapperInit = Promise.all([
      loadProviderModelsDataFromFile(providerModelsPath),
      createProviderModelMapperFromFile(providerModelsPath),
    ])
      .then(([data, mapper]) => ({ data, mapper }))
      .catch((err) => {
        benchMapperInit = null;
        throw err;
      });
  }
  return benchMapperInit;
}

function resolveModelInfoById(providerModelsData: Record<string, any> | null, modelId: string): ModelInfo | undefined {
  if (!providerModelsData) return undefined;
  for (const providerData of Object.values(providerModelsData)) {
    const models = Array.isArray((providerData as any)?.models) ? (providerData as any).models : [];
    const matched = models.find((model: any) => model?.id === modelId);
    if (matched?.name) {
      const providerInfo = { ...(providerData as any) };
      delete providerInfo.models;
      return {
        model: { ...matched },
        provider: { ...providerInfo },
      };
    }
  }
  return undefined;
}

/**
 * 按模型清单解析 AI SDK 模型实例，供基准在线生成样本。
 * @param modelName 业务配置中的模型名称（例如 DeepSeek-V3.2）
 */
export async function resolveAiSdkModelForBench(modelName: string) {
  const { mapper, data: providerModelsData } = await getBenchMapperAndData();
  const modelInfoByName = mapper.getModelInfo(modelName);
  const modelInfo = modelInfoByName ?? resolveModelInfoById(providerModelsData, modelName);
  if (!modelInfo) {
    throw new Error(`Model not found in maas-models.json: ${modelName}`);
  }
  return mapper.getAiSDKModel(modelInfo);
}
