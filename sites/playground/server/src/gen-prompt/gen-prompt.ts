import {
  genPrompt,
  type IGenPromptCustomConfig,
  type IGenPromptOptions,
  type IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import type { IMaterialsMetaVariantKey, IFrameworkKey } from '../types/playground-config.js';

type IVariantMap<T> = Partial<Record<IMaterialsMetaVariantKey, T>>;

type IMetaMap = Partial<Record<IFrameworkKey, IVariantMap<IMaterialsMeta>>>;
type IOptionsMap = Partial<Record<IFrameworkKey, IVariantMap<IGenPromptOptions>>>;

const metaMap: IMetaMap = {
  Vue: {
    mini: miniMaterialsMeta,
    standard: materialsMeta,
  },
  Angular: {
    mini: ngMaterialsMeta,
    standard: ngMaterialsMeta,
  },
};

const optionsMap: IOptionsMap = {
  Vue: {
    mini: { includeJsonSchema: false, includeSnippets: false },
  },
};

function getPlaygroundMaterialsMeta(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey | undefined,
) {
  return metaMap[framework]?.[promptVariant] ?? materialsMeta;
}

export function getPlaygroundComponentWhiteList(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  const meta = getPlaygroundMaterialsMeta(framework, promptVariant);
  const customComponents = tgCustomConfig?.customComponents || [];
  const customWhiteList = customComponents.map((component) => component.component);
  return [...new Set([...meta.whiteList, ...customWhiteList])];
}

export function genPlaygroundPrompt(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  return genPrompt(
    framework,
    getPlaygroundMaterialsMeta(framework, promptVariant),
    tgCustomConfig,
    optionsMap[framework]?.[promptVariant] ?? {},
  );
}
