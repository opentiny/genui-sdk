import type { UserItem } from '@opentiny/tiny-robot';

export interface ConversationComposerDraft<T> {
  templateData: UserItem[];
  selectedNodes: Array<[string, T]>;
}

export function createConversationComposerDrafts<T>() {
  const drafts = new Map<string, ConversationComposerDraft<T>>();
  const textData = (text: string): UserItem[] => text ? [{ type: 'text', content: text }] : [];

  return {
    save(conversationId: string, templateData: UserItem[], selectedNodes: Map<string, T>, fallbackText = '') {
      const data = templateData.length ? templateData : textData(fallbackText);
      drafts.set(conversationId, {
        templateData: data.map((item) => ({ ...item })),
        selectedNodes: [...selectedNodes],
      });
    },
    load(conversationId: string, fallbackText: string): ConversationComposerDraft<T> {
      const draft = drafts.get(conversationId);
      return draft
        ? {
            templateData: draft.templateData.map((item) => ({ ...item })),
            selectedNodes: [...draft.selectedNodes],
          }
        : {
            templateData: textData(fallbackText),
            selectedNodes: [],
          };
    },
  };
}
