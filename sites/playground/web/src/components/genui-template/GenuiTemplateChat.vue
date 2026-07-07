<script setup lang="ts">
import { ref, watch, computed, h, inject, onMounted, onUnmounted, toRaw, provide, type Ref } from 'vue';
import '@opentiny/tiny-robot/dist/style.css';
import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { DeltaPatcher } from '@opentiny/genui-sdk-core';
import { TrBubbleList, TrSender, TrBubbleProvider, useTheme } from '@opentiny/tiny-robot';
import type { BubbleMessage } from '@opentiny/tiny-robot';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type { BubbleRoleConfig } from '@opentiny/tiny-robot';
import { requiredCompleteFieldSelectors, scrollEnd, throttle, GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
import copy from 'clipboard-copy';
import type { INotificationPayload, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';
import {
  textToJson,
  validateJsonPatch,
  PARSE_PARTIAL_JSON_STATE,
  formatJsonPatch,
  generateIdForComponents,
} from './template-chat-utils';
import { formatDate, generateId, stripSchemaFieldsWhileStreaming } from '../../utils';
import useTemplate from './useTemplate';
import TemplateAssistantFooter from './TemplateAssistantFooter.vue';
import { emitter } from './template-chat-event-emitter';
import useIcon from '../../use-icon';
import { t } from '../../i18n';
import { templateContentRendererMatches, templateContentResolver } from './contentRendererMatches';
import { TEMPLATE_CHAT_CONTEXT } from './templateChatContext';

const { addIcons } = useIcon();
addIcons(IconAi, IconUser, IconArrowDown);

defineProps<{
  messages?: unknown[];
}>();

const emit = defineEmits(['schema-version-toggle']);

const TinyGenuiConfig: any = inject(GENUI_CONFIG, null);
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
const errorMessagesMap = ref<Map<string, string>>(new Map());

const {
  messageManager,
  templateConversationState,
  currentSchema,
  currentPreviewSchema,
  currentCardId,
  setCurrentSchema,
  setCurrentPreviewSchema,
  updateTemplateTitle,
  setCurrentCardId,
  updateConversationLastSchema,
} = useTemplate();

watch(
  () => TinyGenuiConfig?.value?.theme,
  (theme) => {
    if (theme === 'dark') {
      setColorMode(theme);
    } else {
      setColorMode('light');
    }
  },
  { immediate: true },
);

const messages = computed(() => messageManager.value?.messages.value ?? []);
const isProcessing = computed(() => messageManager.value?.isProcessing.value ?? false);

provide(TEMPLATE_CHAT_CONTEXT, {
  prevSchema,
  errorMessagesMap,
  allMessages: messages,
  onSchemaVersionToggle: (schema: Record<string, unknown>, cardId: string) => {
    emit('schema-version-toggle', schema, cardId);
  },
});

const handleSchemaJsonChanged = (event: {
  type: 'schema-card' | 'json-patch';
  cardId: string;
  content: string;
  newMessage: boolean;
}) => {
  const { type, cardId, content, newMessage } = event;
  if (type === 'schema-card') {
    schemaCardRenderer({ content, cardId, newMessage });
  } else if (type === 'json-patch') {
    jsonPatchRenderer({ content, cardId, newMessage });
  }
};

onMounted(() => {
  emitter.on('schema-json-changed', handleSchemaJsonChanged);
});
onUnmounted(() => {
  emitter.off('schema-json-changed', handleSchemaJsonChanged);
});

const lastPreviewSchema = ref<any>(null);

const deltaPatcher = new DeltaPatcher({
  requiredCompleteFieldSelectors,
});

const schemaCardRenderer = async (props: { content: string; cardId: string; newMessage?: boolean }) => {
  try {
    const { content, cardId } = props;

    if (cardId !== currentCardId.value) {
      return;
    }

    let json = null;
    let isCompleted = true;
    const target = {};
    if (typeof content === 'string' && content) {
      const { value, state } = await textToJson(content);
      isCompleted = state === PARSE_PARTIAL_JSON_STATE.SUCCESSFUL_PARSE;
      if (!value) {
        return;
      }
      json = stripSchemaFieldsWhileStreaming(value as Record<string, unknown>, isCompleted);
    }
    deltaPatcher.patchWithDelta(target, json, isCompleted);
    const schemaWithId = generateIdForComponents(target);
    setCurrentPreviewSchema(schemaWithId);
  } catch (error: any) {
    console.error('schemaCardRenderer error ===>', error);
    errorMessagesMap.value.set(props.cardId, error.message);
  }
};

const isStreamOperation = (operation: any) =>
  (operation.op === 'add' || operation.op === 'replace') &&
  typeof operation.id === 'string' &&
  operation.id !== '' &&
  typeof operation.path === 'string' &&
  operation.path !== '' &&
  'value' in operation;

const jsonPatchRenderer = async (props: { content: string; cardId: string; newMessage: boolean }) => {
  try {
    const { content, cardId, newMessage } = props;

    if (cardId !== currentCardId.value) {
      return;
    }
    if (newMessage) {
      lastPreviewSchema.value = JSON.parse(JSON.stringify(currentPreviewSchema.value));
    }

    const { value, state } = await textToJson(content);
    if (state !== 'successful-parse' && state !== 'repaired-parse') {
      return;
    }
    const isComplete = state === 'successful-parse';
    let lastOperationComplete = true;

    const valid = validateJsonPatch(value as any);
    if (!valid) {
      return;
    }

    const operations = value as any[];
    if (!isComplete) {
      const lastOperation = operations[operations.length - 1];
      if (!isStreamOperation(lastOperation)) {
        operations.pop();
        lastOperationComplete = true;
      } else {
        lastOperationComplete = false;
      }
    }
    if (operations.length === 0) {
      return;
    }

    const newOperations = formatJsonPatch(toRaw(lastPreviewSchema.value), operations);
    if (newOperations.length === 0) {
      return;
    }

    const standardOperations: JsonPatchOp[] = newOperations.map((op) => {
      const { id, idToPath, relativePath, ...standardOp } = op as any;
      return standardOp as JsonPatchOp;
    });

    const patchBaseline = lastPreviewSchema.value ?? currentSchema.value;
    let targetSchema = JSON.parse(JSON.stringify(patchBaseline)) as Record<string, unknown>;
    targetSchema = stripSchemaFieldsWhileStreaming(targetSchema, isComplete);
    jsonPatchFormatter.patch(targetSchema, standardOperations);
    targetSchema = stripSchemaFieldsWhileStreaming(targetSchema, isComplete);
    setCurrentPreviewSchema(generateIdForComponents(targetSchema), isComplete || lastOperationComplete);
  } catch (error: any) {
    errorMessagesMap.value.set(props.cardId, error.message);
    console.error('jsonPatch error ===>', error);
  }
};

const getCardMessageByIndex = (index: number) =>
  (messages.value[index]?.messages as IMessageItem[] | undefined)?.find(
    (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  ) || ({} as IJsonPatchMessageItem | ISchemaCardMessageItem);

const handleRefresh = ({ index }: { index: number }) => {
  const manager = messageManager.value;
  if (!manager) {
    return;
  }

  const cardMessage = getCardMessageByIndex(index);
  prevSchema.value = cardMessage?.prevSchema ?? '';
  let parsedSchema = null;
  try {
    parsedSchema = JSON.parse(prevSchema.value);
  } catch {
    parsedSchema = null;
  }
  if (parsedSchema) {
    setCurrentSchema(parsedSchema);
    setCurrentPreviewSchema(parsedSchema);
  }
  manager.messages.value = manager.messages.value.slice(0, index);
  const lastMsg = manager.messages.value[manager.messages.value.length - 1] as ChatMessage & { messageId?: string };
  setCurrentCardId(lastMsg?.messageId ?? '');
  void manager.send();
};

const handleCopy = async ({ index }: { index: number }) => {
  try {
    await copy((messages.value[index]?.content as string) || '');
  } catch (error) {
    console.error('复制失败', error);
  }
};

const buildAssistantFooterProps = (slotProps: {
  messages: BubbleMessage[];
  messageIndexes: number[];
}) => {
  const index = slotProps.messageIndexes[slotProps.messageIndexes.length - 1];
  const chatMessage = messages.value[index];
  if (!chatMessage) {
    return null;
  }
  const isFinished = index !== messages.value.length - 1 || !isProcessing.value;
  return {
    index,
    bubbleProps: { role: 'assistant', ...chatMessage },
    isFinished,
    messageManager: messageManager.value!,
    chatMessage: chatMessage as any,
  };
};

const roleConfigs: Record<string, BubbleRoleConfig> = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
  },
  user: {
    placement: 'end',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
  },
};

const inputMessage = computed({
  get: () => messageManager.value?.inputMessage.value ?? '',
  set: (value: string) => {
    if (messageManager.value) {
      messageManager.value.inputMessage.value = value;
    }
  },
});

const showMessages = computed(() => {
  const list = messages.value;
  const lastMessage = list[list.length - 1] as (ChatMessage & { messages?: { type?: string }[] }) | undefined;

  if (isProcessing.value) {
    if (!lastMessage || lastMessage.role === 'user') {
      return [
        ...list,
        {
          role: 'assistant',
          content: t('loading.thinking'),
          loading: true,
        },
      ];
    }

    if (lastMessage.role === 'assistant') {
      const existingMessages = Array.isArray(lastMessage.messages) ? lastMessage.messages : [];
      const hasLoadingText = existingMessages.some((item) => item?.type === 'loading-text');

      if (!hasLoadingText) {
        return [
          ...list.slice(0, -1),
          {
            ...lastMessage,
            messages: [
              ...existingMessages,
              {
                type: 'loading-text',
                emitter,
                message: lastMessage,
                showThinkingResult: false,
              },
            ],
          },
        ];
      }
    }
  }

  return list;
});

const clearInputMessage = () => {
  inputMessage.value = '';
};

const handleSendMessage = async () => {
  const manager = messageManager.value;
  if (!manager || isProcessing.value) {
    return;
  }

  const messageContent = inputMessage.value?.trim();
  if (!messageContent) {
    return;
  }

  const cardId = generateId();
  setCurrentCardId(cardId);

  const userMessage: ChatMessage & { messageId: string } = {
    role: 'user',
    content: messageContent,
    messageId: cardId,
  };

  manager.messages.value.push(userMessage);

  if (manager.messages.value.length === 1) {
    const currentConversationId = templateConversationState.value?.currentId;
    if (currentConversationId) {
      updateTemplateTitle(currentConversationId, messageContent.substring(0, 20));
    }
  }

  prevSchema.value = JSON.stringify(currentSchema.value);
  await manager.send();
  clearInputMessage();
  scrollToBottom();
};

const handleNotification = (event: INotificationPayload) => {
  if (event.type === 'done') {
    setCurrentSchema(currentPreviewSchema.value);
    updateConversationLastSchema(currentSchema.value);

    const lastMessage = messages.value[messages.value.length - 1];
    const lastMessageCard = (lastMessage as ChatMessage & { messages?: IMessageItem[] })?.messages?.find(
      (msg) => msg.type === 'schema-card' || msg.type === 'json-patch',
    );

    if (lastMessageCard) {
      lastMessageCard.schema = JSON.stringify(currentSchema.value);
      lastMessageCard.prevSchema = prevSchema.value || '';
      lastMessageCard.generatedTime = formatDate(new Date());
    }
  }
};

const messagesContainer: Ref<HTMLElement | undefined> = ref();
const { scrollToBottom, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

watch(() => messages.value, throttledScrollToBottom, { deep: true });

onMounted(() => {
  emitter.on('notification', handleNotification);
});

onUnmounted(() => {
  emitter.off('notification', handleNotification);
});
</script>

<template>
  <div class="tg-chat-container" :class="{ dark: TinyGenuiConfig?.theme === 'dark' }">
    <div class="messages-container" ref="messagesContainer">
      <tr-bubble-provider v-if="showMessages.length" :content-renderer-matches="templateContentRendererMatches">
        <tr-bubble-list
          :messages="showMessages"
          :role-configs="roleConfigs"
          :content-resolver="templateContentResolver"
          content-render-mode="split"
          auto-scroll
        >
          <template #after="slotProps">
            <TemplateAssistantFooter
              v-if="slotProps.role === 'assistant' && buildAssistantFooterProps(slotProps)"
              v-bind="buildAssistantFooterProps(slotProps)!"
              @refresh="handleRefresh"
              @copy="handleCopy"
            />
          </template>
        </tr-bubble-list>
      </tr-bubble-provider>
    </div>
    <div class="sender-container">
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': isProcessing }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <tr-sender
        v-model="inputMessage"
        :placeholder="isProcessing ? t('loading.thinking') : t('placeholder.input')"
        :clearable="true"
        :loading="isProcessing"
        :show-word-limit="true"
        :max-length="5000"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="messageManager?.abortRequest()"
      />
      <div class="footer-text">{{ t('footer.aiGenerated') }}</div>
    </div>
  </div>
</template>

<style scoped lang="less">
.tg-chat-container {
  --ti-gen-chat-container-bg-color: #f0f0f0;
  --thinking-display: initial;
  --sender-bg: url('../../assets/images/sender-light.svg') no-repeat center;
  --sender-border-color: #e5e5e5;
  --generating-bg-before: linear-gradient(90deg, #fff, #a2c7f4);
  --generating-bg-after: #fff;
  box-sizing: border-box;
  height: 100%;
  color: var(--tr-text-primary);
  background-color: var(--ti-gen-chat-container-bg-color);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: auto;

  &.dark {
    --ti-gen-chat-container-bg-color: #191919;
    --sender-bg: url('../../assets/images/sender-dark.svg') no-repeat center;
    --sender-border-color: #333;
    --generating-bg-before: linear-gradient(90deg, #262626, #808080);
    --generating-bg-after: #191919;
  }
}

.messages-container {
  flex: 1;
  overflow: auto;
}

:deep(.tr-bubble__loading) {
  margin-top: 8px;
}

:deep(.tr-bubble.placement-start) {
  .tr-bubble__box {
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }
}

:deep(.tr-bubble[data-role='assistant'] [data-type='markdown']),
:deep(.tr-bubble[data-role='assistant'] [data-type='reasoning']) {
  display: var(--thinking-display, initial);
}

:deep(.tr-bubble.placement-end) {
  width: 100%;
}

:deep(.tr-bubble__body) {
  @avatar-and-gap-width: 56px;
  max-width: calc(100% - var(--ti-gen-chat-avatar-and-gap-width, @avatar-and-gap-width) * 2);
}

.sender-container {
  position: relative;
  flex-shrink: 0;
  padding: 16px 0;
  background: var(--sender-bg);
}

.scroll-to-bottom-button {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -35px;
  width: 40px;
  height: 40px;
  background-color: var(--generating-bg-after);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--sender-border-color);
  z-index: 1000;

  & > svg {
    width: 20px;
    height: 20px;
  }

  &.is-generating {
    border: none;
    background-color: transparent;

    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      background: var(--generating-bg-before);
      z-index: 0;
      animation: rotate-border 2s linear infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background-color: var(--generating-bg-after);
      z-index: 1;
    }

    & > svg {
      z-index: 2;
    }
  }
}

.footer-text {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 16px;
}

.tiny-sender {
  width: 80%;
  margin: 0 auto;
}

@keyframes rotate-border {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
