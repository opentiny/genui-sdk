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

const LIB_RULES: Record<IComponentLibKey, string[]> = {
  TinyVue: [
    '组件的 componentName 必须使用 Tiny 前缀（如 TinyButton、TinyForm），禁止使用其它组件库名称',
  ],
  Element: [
    '组件的 componentName 必须使用 El 前缀（如 ElButton、ElForm），禁止使用 Tiny 前缀（如 TinyButton）或其它组件库名称',
  ],
  TinyNg: [
    '当前组件库为 OpenTiny Angular（TinyNg）, 组件的 componentName 必须使用 Ti 前缀, 。只能使用本物料白名单中的 componentName，禁止使用 Tiny 前缀或 El 前缀',
  ],
};

export function genPlaygroundPrompt(
  framework: IFrameworkKey,
  promptVariant: IMaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
  componentLib?: IComponentLibKey | string,
) {
  const variant = promptVariant || 'standard';
  const libKey = componentLib as IComponentLibKey;
  const libRules = Object.prototype.hasOwnProperty.call(LIB_RULES, libKey) ? LIB_RULES[libKey] : [];

  return genPrompt(
    framework,
    metaMap[framework]?.[libKey]?.[variant] ?? materialsMeta,
    tgCustomConfig,
    {
      ...(optionsMap[framework]?.[variant] ?? {}),
      rules: [
        ...(optionsMap[framework]?.[variant]?.rules ?? []),
        ...libRules,
      ],
    },
  );
}
