import {
  genPrompt,
  type IGenPromptCustomConfig,
  type IGenPromptOptions,
  type IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as elementPlusMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import type { IMaterialsMetaVariantKey, IFrameworkKey, IComponentLibKey } from '../types/playground-config.js';

type IVariantMap<T> = Partial<Record<IMaterialsMetaVariantKey, T>>;
type ILibMetaMap = Partial<Record<IComponentLibKey, IVariantMap<IMaterialsMeta>>>;
type IMetaMap = Partial<Record<IFrameworkKey, ILibMetaMap>>;
type IOptionsMap = Partial<Record<IFrameworkKey, IVariantMap<IGenPromptOptions>>>;

const DEFAULT_COMPONENT_LIB: Partial<Record<IFrameworkKey, IComponentLibKey>> = {
  Vue: 'TinyVue',
  Angular: 'TinyNG',
};

const metaMap: IMetaMap = {
  Vue: {
    TinyVue: {
      mini: miniMaterialsMeta,
      standard: materialsMeta,
    },
    ElementUI: {
      mini: elementPlusMaterialsMeta,
      standard: elementPlusMaterialsMeta,
    },
  },
  Angular: {
    TinyNG: {
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

function resolveMaterialsMeta(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey,
  componentLib?: IComponentLibKey,
) {
  const frameworkMeta = metaMap[framework];
  const defaultLib = DEFAULT_COMPONENT_LIB[framework] ?? 'TinyVue';
  return frameworkMeta?.[componentLib ?? defaultLib]?.[promptVariant] ?? materialsMeta;
}

export function genPlaygroundPrompt(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
  componentLib?: IComponentLibKey,
) {
  const variant = promptVariant ?? 'standard';
  return genPrompt(
    framework,
    resolveMaterialsMeta(framework, variant, componentLib),
    tgCustomConfig,
    optionsMap[framework]?.[variant] ?? {},
  );
}
