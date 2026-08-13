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

type IComponentLibKey = 'TinyVue' | 'Element' | 'TinyNg';
type IVariantMap<T> = Partial<Record<IMaterialsMetaVariantKey, T>>;
type ILibMap<T> = Partial<Record<IComponentLibKey, IVariantMap<T>>>;

type IMetaMap = Partial<Record<IFrameworkKey, ILibMap<IMaterialsMeta>>>;
type IOptionsMap = Partial<Record<IFrameworkKey, IVariantMap<IGenPromptOptions>>>;

interface IPlaygroundMaterialConfig {
  framework: IFrameworkKey;
  promptVariant: IMaterialsMetaVariantKey | undefined;
  componentLib?: IComponentLibKey | string;
  antiContaminationRule?: string;
}

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
    TinyNg: {
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
  materialConfig: IPlaygroundMaterialConfig,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  const { framework, promptVariant, componentLib, antiContaminationRule } = materialConfig;
  const variant = promptVariant || 'standard';
  const libKey = componentLib as IComponentLibKey;

  return genPrompt(
    framework,
    metaMap[framework]?.[libKey]?.[variant] ?? materialsMeta,
    tgCustomConfig,
    {
      ...(optionsMap[framework]?.[variant] ?? {}),
      rules: [
        ...(optionsMap[framework]?.[variant]?.rules ?? []),
        ...(antiContaminationRule ? [antiContaminationRule] : []),
      ],
    },
  );
}
