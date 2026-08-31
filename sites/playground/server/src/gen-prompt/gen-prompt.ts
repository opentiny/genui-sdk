import {
  genPrompt,
  type IGenPromptCustomConfig,
  type IGenPromptOptions,
  type IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as epMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import type { IMaterialsMetaVariantKey, IFrameworkKey } from '../types/playground-config.js';

type IComponentLibKey = 'TinyVue' | 'ElementPlus' | 'TinyNg';
type IVariantMap<T> = Partial<Record<IMaterialsMetaVariantKey, T>>;
type ILibMap<T> = Partial<Record<IComponentLibKey, IVariantMap<T>>>;

type IMetaMap = Partial<Record<IFrameworkKey, ILibMap<IMaterialsMeta>>>;
type IOptionsMap = Partial<Record<IFrameworkKey, IVariantMap<IGenPromptOptions>>>;

interface IPlaygroundMaterialConfig {
  promptVariant: IMaterialsMetaVariantKey | undefined;
  componentLib?: IComponentLibKey | string;
}

const metaMap: IMetaMap = {
  Vue: {
    TinyVue: {
      mini: miniMaterialsMeta,
      standard: materialsMeta,
    },
    ElementPlus: {
      mini: epMaterialsMeta,
      standard: epMaterialsMeta,
    },
  },
  Angular: {
    TinyNg: {
      mini: ngMaterialsMeta,
      standard: ngMaterialsMeta,
    },
  },
};

const optionsMap: IOptionsMap = {
  Vue: {
    mini: { includeJsonSchema: false, includeSnippets: false },
  },
};

function getPlaygroundMaterialsMeta(
  framework: IFrameworkKey,
  materialConfig: IPlaygroundMaterialConfig,
) {
  const variant = materialConfig.promptVariant || 'standard';
  const componentLib = materialConfig.componentLib as IComponentLibKey;
  return metaMap[framework]?.[componentLib]?.[variant] ?? materialsMeta;
}

export function getPlaygroundComponentWhiteList(
  framework: IFrameworkKey,
  materialConfig: IPlaygroundMaterialConfig,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  const meta = getPlaygroundMaterialsMeta(framework, materialConfig);
  const customComponents = tgCustomConfig?.customComponents || [];
  const customWhiteList = customComponents.map((component) => component.component);
  return [...new Set([...meta.whiteList, ...customWhiteList])];
}

export function genPlaygroundPrompt(
  framework: IFrameworkKey,
  materialConfig: IPlaygroundMaterialConfig,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  const variant = materialConfig.promptVariant || 'standard';

  return genPrompt(
    framework,
    getPlaygroundMaterialsMeta(framework, materialConfig),
    tgCustomConfig,
    {
      ...(optionsMap[framework]?.[variant] ?? {}),
      rules: [...(optionsMap[framework]?.[variant]?.rules ?? [])],
    },
  );
}
