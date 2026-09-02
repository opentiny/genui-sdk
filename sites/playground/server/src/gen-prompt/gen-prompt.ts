import {
  genPrompt,
  type IGenPromptCustomConfig,
  type IGenPromptOptions,
  type IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta, plusMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as epMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import { materialsMeta as reactMaterialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';
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
      plus: plusMaterialsMeta,
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
  React: {
    mini: reactMaterialsMeta,
    standard: reactMaterialsMeta,
  },
};

const optionsMap: IOptionsMap = {
  Vue: {
    mini: { includeJsonSchema: false, includeSnippets: false },
  }
};

export function genPlaygroundPrompt(
  framework: IFrameworkKey,
  materialConfig: IPlaygroundMaterialConfig,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  const { promptVariant, componentLib } = materialConfig;
  const variant = promptVariant || 'standard';
  const libKey = componentLib as IComponentLibKey;
  const meta = metaMap[framework]?.[libKey]?.[variant] ?? metaMap[framework]?.[libKey]?.standard;

  return genPrompt(
    framework,
    meta ?? materialsMeta,
    tgCustomConfig,
    {
      ...(optionsMap[framework]?.[variant] ?? {}),
      rules: [...(optionsMap[framework]?.[variant]?.rules ?? [])],
    },
  );
}
