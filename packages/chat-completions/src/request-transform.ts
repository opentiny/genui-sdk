import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
import { materialsMeta as ngMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
import { IChatCompletionCreateParams, ChatCompletionCreateParamsBase, type IGenPromptConfig } from './types';

function mergePrompt( 
  initialPrompt: string,
  additionalPrompt: string,
  strategy: IGenPromptConfig['strategy'] = 'append'
): string {
  if (strategy === 'override') {
    return additionalPrompt;
  }
  if (strategy === 'prepend') {
    return additionalPrompt + '\n' + initialPrompt;
  }
  return initialPrompt + '\n' + additionalPrompt;
}

export function requestTransform(
  params: IChatCompletionCreateParams
): ChatCompletionCreateParamsBase {
  const newParams = structuredClone(params);

  const { tinygenui: customConfigString = '{}' as JsonSerialized<IGenPromptConfig> } = newParams.metadata || {};
  let tgCustomConfig: IGenPromptConfig;
  try {
    tgCustomConfig = JSON.parse<IGenPromptConfig>(customConfigString);
  } catch (error) {
    console.error('parse tgCustomConfig failed', error);
    throw error;
  }
  delete newParams.metadata?.tinygenui;

  const { framework = 'Vue', strategy = 'append', ...promptConfig } = tgCustomConfig;

  const renderConfigForFramework = framework === 'Angular' ? ngMaterialsMeta : materialsMeta;
  const systemMessages = newParams.messages?.find((message) => message.role === 'system');
  const prompt = genPrompt(framework, renderConfigForFramework, promptConfig);
  if (systemMessages) {
    systemMessages.content = mergePrompt(systemMessages.content as string, prompt, strategy);
  } else {
    newParams.messages?.unshift({ role: 'system', content: prompt });
  }

  return newParams;
}
