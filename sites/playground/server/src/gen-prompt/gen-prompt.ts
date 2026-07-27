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

type IComponentLibKey = 'TinyVue' | 'Element';
type IVariantMap<T> = Partial<Record<IMaterialsMetaVariantKey, T>>;
type ILibMap<T> = Partial<Record<IComponentLibKey, IVariantMap<T>>>;

type IMetaMap = Partial<Record<IFrameworkKey, ILibMap<IMaterialsMeta>>>;
type IOptionsMap = Partial<Record<IFrameworkKey, IVariantMap<IGenPromptOptions>>>;

const metaMap: IMetaMap = {
  Vue: {
    TinyVue: {
      mini: miniMaterialsMeta,
      standard: materialsMeta,
    },
    Element: {
      mini: epMaterialsMeta,
      standard: epMaterialsMeta,
    },
  },
  Angular: {
    TinyVue: {
      mini: ngMaterialsMeta,
      standard: ngMaterialsMeta,
    },
  },
};

const optionsMap: IOptionsMap = {
  Vue: {
    mini: { includeJsonSchema: false, includeSnippets: false },
  }
};

export function genPlaygroundPrompt(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
  componentLib: IComponentLibKey = 'TinyVue',
) {
  const lib = framework === 'Angular' ? 'TinyVue' : componentLib;
  const variant = promptVariant || 'standard';

  return genPrompt(
    framework,
    metaMap[framework]?.[lib]?.[variant] ?? materialsMeta,
    tgCustomConfig,
    optionsMap[framework]?.[variant] ?? {},
  );
}
