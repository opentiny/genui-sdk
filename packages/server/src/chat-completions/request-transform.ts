import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import { type IGenPromptConfig, genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config';

const mergePrompt = (
  initialPrompt: string,
  additionalPrompt: string,
  strategy: IGenPromptConfig['strategy'] = 'append',
): string => {
  if (strategy === 'override') {
    return additionalPrompt;
  }
  if (strategy === 'prepend') {
    return additionalPrompt + '\n' + initialPrompt;
  }
  return initialPrompt + '\n' + additionalPrompt;
};

export function requestTransform(
  params: ChatCompletionCreateParamsBase & { metadata?: { tinygenui?: string } },
): ChatCompletionCreateParamsBase {
  const newParams = structuredClone(params);

  const { tinygenui: tgCustomConfigStr } = newParams.metadata || {};
  let tgCustomConfig: IGenPromptConfig;
  try {
    tgCustomConfig = JSON.parse(tgCustomConfigStr || '{}');
  } catch (error) {
    console.error('parse tgCustomConfig failed', error);
    throw error;
  }

  const { framework = 'Vue', strategy = 'append' } = tgCustomConfig || {};

  const renderConfigForFramework = framework === 'Angular' ? ngRendererConfig : rendererConfig;
  const systemMessages = newParams.messages?.find((message) => message.role === 'system');
  const genuiPrompt =  genPrompt(renderConfigForFramework, tgCustomConfig as any); //TODO: Argument of type 'IGenPromptConfig' is not assignable to parameter of type 'ITGCustomConfig'
  if (systemMessages) {
    systemMessages.content = mergePrompt(systemMessages.content as string, genuiPrompt, strategy);
  } else {
    newParams.messages?.unshift({ role: 'system', content: genuiPrompt });
  }

  delete newParams.metadata?.tinygenui;

  return newParams;
}
