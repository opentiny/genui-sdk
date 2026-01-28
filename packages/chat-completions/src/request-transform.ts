import { type IGenPromptConfig, genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config';
import { IChatCompletionCreateParams, ChatCompletionCreateParamsBase } from './types';

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

  const renderConfigForFramework = framework === 'Angular' ? ngRendererConfig : rendererConfig;
  const systemMessages = newParams.messages?.find((message) => message.role === 'system');
  const prompt =  genPrompt(renderConfigForFramework, promptConfig);
  if (systemMessages) {
    systemMessages.content = mergePrompt(systemMessages.content as string, prompt, strategy);
  } else {
    newParams.messages?.unshift({ role: 'system', content: prompt });
  }

  return newParams;
}
