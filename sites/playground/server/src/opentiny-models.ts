const DEFAULT_OPENTINY_MODELS_URL = 'https://chat.opentiny.design/api/v1/llm/models';

interface OpenTinyModel {
  id: string;
  provider: string;
  type: string;
  display_name: string;
  capabilities?: {
    vision?: boolean;
    fileUpload?: {
      supportDirectImage?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface OpenTinyModelsResponse {
  models: OpenTinyModel[];
  [key: string]: any;
}

/**
 * 将 OpenTiny 模型列表转换为 provider-models.json 使用的结构
 * 结构示例可参考 opentiny-models.json
 */
export function convertOpenTinyToProviderModelsData(
  resp: OpenTinyModelsResponse,
): Record<string, any> {
  const models = Array.isArray(resp?.models) ? resp.models : [];

  const convertedModels = models.map((m) => {
    const supportImage =
      m.type === 'vision' ||
      m.capabilities?.vision === true ||
      m.capabilities?.fileUpload?.supportDirectImage === true;

    const model: any = {
      name: m.display_name || m.id,
      id: m.id,
    };

    if (supportImage) {
      model.features = { supportImage: true };
    }

    return model;
  });

  // 为了与现有 opentiny-models.json 保持一致，统一放在 deepseek 提供商下
  return {
    deepseek: {
      name: 'deepseek',
      apiKeyEnvName: 'API_KEY',
      baseUrlEnvName: 'BASE_URL',
      models: convertedModels,
    },
  };
}

/**
 * 从 OpenTiny 接口拉取模型并转换为 provider-models.json 一致的数据结构
 */
export async function fetchOpenTinyProviderModelsData(): Promise<Record<string, any>> {
  const url = process.env.OPENTINY_MODELS_URL || DEFAULT_OPENTINY_MODELS_URL;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch OpenTiny models: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as OpenTinyModelsResponse;
    return convertOpenTinyToProviderModelsData(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenTiny models fetch failed (${url}): ${message}`);
  }
}

