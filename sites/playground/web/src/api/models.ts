import { type ModelInfo,type ImageFeatures, type ModelCapability, DEFAULT_IMAGE_FEATURES } from '@opentiny/genui-sdk-vue';

/**
 * 获取模型列表
 * @param url 获取模型列表的 URL，如果不传则从环境变量获取
 * @returns Promise<string[]> 模型名称数组
 */
export async function getModels(url?: string): Promise<ModelInfo[]> {
  const getModelsUrl = url || import.meta.env.VITE_GET_MODELS_URL;
  const response = await fetch(getModelsUrl);
  if (!response.ok) {
    throw new Error(`获取模型列表失败: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

/**
 * 获取模型能力配置
 * @param modelName 模型名称
 * @param url 获取模型能力的 URL，如果不传则从环境变量获取
 * @returns Promise<ModelCapability> 模型能力配置
 */
export async function getModelFeatures(modelName: string, url?: string): Promise<ModelCapability> {
  const models = await getModels(url);
  const model = models.find((item) => item.name === modelName);
  if (!model) {
    throw new Error(`模型 ${modelName} 不存在`);
  }

  const rawSupportImage = model?.features?.supportImage;
  let supportImage: ImageFeatures | null;
  
  if (typeof rawSupportImage === 'boolean') {
    supportImage = rawSupportImage ? DEFAULT_IMAGE_FEATURES : null;
  } else if (typeof rawSupportImage === 'object' && rawSupportImage !== null) {
    if (rawSupportImage.enabled !== false) {
      supportImage = {
        ...DEFAULT_IMAGE_FEATURES,
        ...rawSupportImage,
      } as ImageFeatures;
    } else {
      supportImage = null;
    }
  } else {
    supportImage = null;
  }

  return {
    ...model.features,
    supportImage,
  };
}

/**
 * 获取模型列表并转换为选项格式
 * @param url 获取模型列表的 URL，如果不传则从环境变量获取
 * @returns Promise<Array<{text: string, value: string}>> 模型选项数组
 */
export async function getModelOptions(url?: string): Promise<Array<{ text: string; value: string }>> {
  const models = await getModels(url);
  return models.map((item) => ({ text: item.name, value: item.name }));
}
