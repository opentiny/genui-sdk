import type { InjectionKey, Ref } from 'vue';
import type { BubbleMessage } from '@opentiny/tiny-robot';

export interface TemplateChatContext {
  prevSchema: Ref<string>;
  errorMessagesMap: Ref<Map<string, string>>;
  allMessages: Ref<BubbleMessage[]>;
  onSchemaVersionToggle: (schema: Record<string, unknown>, cardId: string) => void;
}

export const TEMPLATE_CHAT_CONTEXT: InjectionKey<TemplateChatContext> = Symbol('TEMPLATE_CHAT_CONTEXT');
