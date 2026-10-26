import GenuiChatWithMaterials from './GenuiChatWithMaterials.vue';

/** @deprecated 请改用 `GenuiChat`，并通过 `GenuiConfigProvider` 提供物料。 */
export const GenuiLegacyChat = GenuiChatWithMaterials;
export * from '../chat/chat.types.js';
export * from '../config-provider/injection-tokens.js';
export * from '../chat/i18n/index.js';
export * from '../chat/conversation-storage.js';
export * from '../chat/bubble-protocol.js';
export * from '../chat/event-emitter.js';
export * from '../chat/chat-utils.js';
export * from '../chat/think-tag-wrap-pattern.js';
// useMessage / useConversation are exported from the main package via `./chat` only,
// to avoid duplicate named exports when aggregating entry points.
