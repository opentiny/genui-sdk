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
  const { framework, promptVariant, componentLib } = materialConfig;
  const variant = promptVariant || 'standard';
  const libKey = componentLib as IComponentLibKey;
  const antiContaminationRule = [
    `本次对话当前使用的组件库是 ${libKey}，历史消息中可能包含基于其他组件库生成的 schema，请以当前提供的可用组件列表为准，不要参考历史消息中的 componentName`,
  ]; 

  return genPrompt(
    framework,
    metaMap[framework]?.[libKey]?.[variant] ?? materialsMeta,
    tgCustomConfig,
    {
      ...(optionsMap[framework]?.[variant] ?? {}),
      rules: [
        ...(optionsMap[framework]?.[variant]?.rules ?? []),
        ...antiContaminationRule
      ],
    },
  );
}
