import { useI18n } from './i18n';

export function useChatAction({
    chat,
    saveState,
}: {
  chat: (_: { llmFriendlyMessage: string; humanFriendlyMessage: string; context: Record<string, any> }) => void,
  saveState: (context: Record<string | symbol, any>) => void,
}) {
  const { t } = useI18n();
  
  return {
    continueChatAction: {
      name: 'continueChat',
      description: t('continueChat.description'),
      execute: (params: { message: string }, context: Record<string, any>) => {
        chat({
          llmFriendlyMessage: `${params.message},${t('continueChat.messageParam')}${JSON.stringify(context.state || {})}`,
          humanFriendlyMessage: params.message,
          context,
        });
      },
      parameters: {
        type: 'object' as const,
        properties: {
          message: {
            type: 'string',
            description: t('continueChat.paramDescription'),
          },
        },
      },
    },
    saveStateAction: {
      name: 'saveState',
      description: '保存状态， 用于保存组件状态',
      execute: (params: any, context: Record<string | symbol, any>) => {
        saveState(context);
      },
      parameters: { type: 'null' as const},
    },
  };
}
