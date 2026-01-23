import { useI18n } from './i18n';

export function useContinueChatAction(
  chat: (_: { llmFriendlyMessage: string; humanFriendlyMessage: string; context: Record<string, any> }) => void,
) {
  const { t } = useI18n();
  
  return { //TODO: Refactor, function calling compatible
    continueChatAction: {
      name: 'continueChat',
      description: t('continueChat.description'),
      execute: (params: any, context: Record<string, any>) => {
        chat({
          llmFriendlyMessage: `${params.message},${t('continueChat.messageParam')}${JSON.stringify(context.state || {})}`,
          humanFriendlyMessage: params.message,
          context,
        });
      },
      params: [
        {
          name: 'message',
          type: 'string',
          description: t('continueChat.paramDescription'),
        },
      ],
    },
  };
}
