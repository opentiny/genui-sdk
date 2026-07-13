import {
  genPrompt,
  type IGenPromptCustomConfig,
  type IGenPromptOptions,
  type IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import { materialsMeta as reactMaterialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';
import type { MaterialsMetaVariantKey } from '../types/index.js';

const vueMaterialsMetaByVariant = {
  mini: miniMaterialsMeta,
  standard: materialsMeta,
} as const;

export function getGenPromptOptions(promptVariant?: MaterialsMetaVariantKey): IGenPromptOptions | undefined {
  if (promptVariant === 'mini') {
    return { includeJsonSchema: false, includeSnippets: false };
  }
}

export function getMaterialsMetaForFramework(
  framework: string,
  promptVariant?: MaterialsMetaVariantKey,
): IMaterialsMeta {
  if (framework === 'Angular') {
    return ngMaterialsMeta;
  }
  if (framework === 'React') {
    return reactMaterialsMeta;
  }
  if (promptVariant) {
    return vueMaterialsMetaByVariant[promptVariant];
  }
  return materialsMeta;
}

export function genPlaygroundPrompt(
  framework: string,
  promptVariant: MaterialsMetaVariantKey | undefined,
  tgCustomConfig?: IGenPromptCustomConfig,
) {
  return genPrompt(
    framework,
    getMaterialsMetaForFramework(framework, promptVariant),
    tgCustomConfig,
    getGenPromptOptions(promptVariant),
  );
}
