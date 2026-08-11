import type { InjectionKey, Ref } from 'vue';

export interface TemplateChatContext {
  prevSchema: Ref<string>;
}

export const TEMPLATE_CHAT_CONTEXT: InjectionKey<TemplateChatContext> = Symbol('TEMPLATE_CHAT_CONTEXT');
