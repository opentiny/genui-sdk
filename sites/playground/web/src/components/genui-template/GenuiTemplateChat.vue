<script setup lang="ts">
import '@opentiny/tiny-robot/dist/style.css';
import {
  TrBubbleList,
  TrSender,
  TrBubbleProvider,
  useTheme,
  BubbleMarkdownContentRenderer,
} from '@opentiny/tiny-robot';
import { GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type { BubbleRoleConfig } from '@opentiny/tiny-robot';
import { ref, watch, computed, h, inject, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import type { IMessage } from './chat.types';
import {
  scrollEnd,
  throttle,
  textToJson,
  validateJsonPatch,
  PARSE_PARTIAL_JSON_STATE,
  formatJsonPatch,
  formatDateTime,
  generateIdForComponents,
  generateId,
} from './utils';
import { jsonPatchDeduplicator } from './json-patch-deduplicator';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { DeltaPatcher } from '@opentiny/genui-sdk-core';
import { requiredCompleteFieldSelectors } from '@opentiny/genui-sdk-vue';
import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { emitter } from './event-emitter';
import type { INotificationPayload, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';
import useTemplate from './useTemplate';
import AssistantFooter from './TemplateAssistantFooter.vue';

const props = defineProps<{
  messages?: IMessage[];
}>();

const emit = defineEmits(['schema-version-toggle']);

const TinyGenuiConfig: any = inject('TinyGenuiConfig');
const { setColorMode } = useTheme();
const prevSchema = ref<string>('');
// 当前消息的 id，用于记录消息的 id，避免重复执行 patch 操作
const currentMessageId = ref<string>('');
const errorMessagesMap = ref<Map<string, string>>(new Map());

const { conversation, templateConversationState, currentSchema, setCurrentSchema, updateTemplateTitle } = useTemplate();

watch(
  () => TinyGenuiConfig?.value?.theme,
  (theme) => {
    if (theme === 'dark') {
      setColorMode(theme);
    } else {
      setColorMode('light');
    }
  },
  {
    immediate: true,
  },
);

const roles: Record<string, BubbleRoleConfig> = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
    maxWidth: '100%',
    customContentField: 'messages',
    slots: {
      trailer: (slotProps: { bubbleProps: any; index?: number }) => {
        const isFinished =
          slotProps.bubbleProps.role !== 'assistant' ||
          (slotProps.index !== undefined && slotProps.index !== messages.value.length - 1) ||
          !generating.value;
        return h(AssistantFooter, {
          bubbleProps: slotProps.bubbleProps,
          index: slotProps.index,
          isFinished,
          messageManager: messageManager.value,
          onRefresh: handleRefresh,
        });
      },
    },
  },
  user: {
    placement: 'end',
    maxWidth: '90%',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
    customContentField: 'messages',
  },
};

const { messageManager } = conversation;

// 当前会话的 messages 代理
const messages = computed(() => messageManager.value.messages.value);

const generating = computed(() => GeneratingStatus.includes(conversation.messageManager.value.messageState.status));

const deltaPatcher = new DeltaPatcher({
  requiredCompleteFieldSelectors,
});

const schemaCardRenderer = async (props: any) => {
  try {
    const { content, cardId } = props;

    if (cardId !== currentMessageId.value) {
      return;
    }

    let json = null;
    let isCompleted = true;
    let target = {};
    if (typeof content === 'string' && content) {
      const { value, state } = await textToJson(content);
      isCompleted = state === PARSE_PARTIAL_JSON_STATE.SUCCESSFUL_PARSE;
      if (!value) {
        return;
      }
      json = value;
    }
    deltaPatcher.patchWithDelta(target, json, isCompleted);
    // 给每个组件添加 id
    const schemaWithId = generateIdForComponents(target);
    setCurrentSchema(schemaWithId);
  } catch (error) {
    console.error('schemaCardRenderer error ===>', error);
    errorMessagesMap.value.set(props.cardId, error.message);
  }
};

const jsonPatchRenderer = async (props: any) => {
  try {
    const { content, cardId } = props;

    if (cardId !== currentMessageId.value) {
      return;
    }

    const valid = validateJsonPatch(content);

    if (!valid) return;

    const { value } = await textToJson(content);

    if (!value || !Array.isArray(value)) return;

    const formattedValue = formatJsonPatch(currentSchema.value, value);
    // 如果没有 cardId，使用默认的 key 来记录（避免重复执行）
    const operationKey = cardId || '__default__';
    // 过滤掉已执行的操作
    const newOperations = jsonPatchDeduplicator.filterExecutedOperations(operationKey, formattedValue);

    if (newOperations.length === 0) {
      return;
    }

    const standardOperations: JsonPatchOp[] = newOperations.map((op) => {
      const { id, idToPath, relativePath, ...standardOp } = op as any;
      return standardOp as JsonPatchOp;
    });

    const targetSchema = JSON.parse(JSON.stringify(currentSchema.value));
    jsonPatchFormatter.patch(targetSchema, standardOperations);
    setCurrentSchema(targetSchema);
    // 标记所有操作（包括已过滤的）为已执行，避免重复执行
    jsonPatchDeduplicator.markAllOperationsExecuted(operationKey, formattedValue);
  } catch (error) {
    errorMessagesMap.value.set(props.cardId, error.message);
    console.error('jsonPatch error ===>', error);
  }
};

const handleSchemaVersionCardClick = (cardId: string) => {
  // 从 messages 中找到对应的卡片。
  let targetStr = '';

  messages.value.some((msg) => {
    const card = (msg.messages as IMessageItem[])?.find(
      (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
        (message.type === 'schema-card' || message.type === 'json-patch') && message.cardId === cardId,
    );

    if (card) {
      targetStr = card.schema;

      return true;
    }

    return false;
  });

  if (!targetStr) {
    return;
  }

  try {
    const targetSchema = JSON.parse(targetStr);
    // 当切换 schema 版本时，清理该卡片已执行的 patch 操作记录
    // 因为新的 schema 版本可能需要重新执行操作
    jsonPatchDeduplicator.clearCardOperations(cardId);
    emit('schema-version-toggle', targetSchema);
  } catch (error) {}
};

const handleRefresh = ({ index }: { index: number }) => {
  const { messages, send } = messageManager.value;
  const cardMessage = (messages.value[index].messages as IMessageItem[])?.find(
    (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  );

  prevSchema.value = cardMessage?.prevSchema;
  setCurrentSchema(JSON.parse(prevSchema.value));
  messages.value = messages.value.slice(0, index);
  currentMessageId.value = messages.value[messages.value.length - 1].messageId as string;
  send();
};

const markdownRenderer = new BubbleMarkdownContentRenderer({
  defaultAttrs: { class: 'markdown-content' },
  mdConfig: { html: true },
});

const messageRenderers = {
  markdown: markdownRenderer,
  'json-patch': (props) => {
    console.log('json-patch props ===>', props);
    jsonPatchRenderer(props);
    return h(SchemaVersionCard, {
      key: props.cardId,
      prevSchema: prevSchema.value,
      errorMessagesMap: errorMessagesMap.value,
      ...props,
      type: 'json-patch',
      onClick: handleSchemaVersionCardClick,
    });
  },
  'schema-card': (props) => {
    console.log('schema-card props ===>', props);
    schemaCardRenderer(props);
    return h(SchemaVersionCard, {
      key: props.cardId,
      prevSchema: prevSchema.value,
      errorMessagesMap: errorMessagesMap.value,
      ...props,
      type: 'schema-card',
      onClick: handleSchemaVersionCardClick,
    });
  },
};

// 当前会话的 inputMessage 代理，给 v-model 使用
const inputMessage = computed({
  get: () => messageManager.value.inputMessage.value,
  set: (v: string) => {
    messageManager.value.inputMessage.value = v;
  },
});

if (props.messages?.length) {
  messages.value.splice(0, messages.value.length, ...(props.messages as any));
}

const showMessages = computed(() => {
  let showMessages = messages.value;

  if (messageManager.value.messageState.status === STATUS.PROCESSING) {
    return [
      ...showMessages,
      {
        role: 'assistant',
        content: '正在思考中...',
        loading: true,
      },
    ];
  }

  const lastMessage = messages.value[messages.value.length - 1];

  // 在流式返回过程中，为最后一条助手消息添加 loading-text 组件
  if (generating.value && lastMessage?.role === 'assistant') {
    const existingMessages = Array.isArray((lastMessage as any)?.messages) ? (lastMessage as any).messages : [];
    // 检查是否已经存在 loading-text，避免重复添加
    const hasLoadingText = existingMessages.some((msg: any) => msg.type === 'loading-text');

    if (!hasLoadingText) {
      return [
        ...showMessages.slice(0, -1),
        {
          ...lastMessage,
          messages: [
            ...existingMessages,
            {
              type: 'loading-text',
              emitter: emitter,
              message: lastMessage,
              showThinkingResult: false,
            },
          ],
        },
      ];
    }
  }

  return showMessages;
});

const clearInputMessage = () => {
  inputMessage.value = '';
};

// 发送消息
const handleSendMessage = async () => {
  const messageContent = inputMessage.value;
  currentMessageId.value = generateId();

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
    messageId: currentMessageId.value,
  };
  messages.value.push(userMessage);

  // 如果是第一条 user 消息，更新当前 title
  if (messages.value.length === 1 && messages.value[0].role === 'user') {
    updateTemplateTitle(templateConversationState.currentId, messageContent.substring(0, 20));
  }

  prevSchema.value = JSON.stringify(currentSchema.value);
  messageManager.value.send();
  clearInputMessage();
  scrollToBottom();
};

const handleNotification = (event: INotificationPayload) => {
  if (event.type === 'done') {
    // 将 schema 缓存到卡片中
    const lastMessage = messages.value[messages.value.length - 1];
    const lastMessageCard = (lastMessage as any).messages.find(
      (msg: any) => msg.type === 'schema-card' || msg.type === 'json-patch',
    );

    if (lastMessageCard) {
      lastMessageCard.schema = JSON.stringify(currentSchema.value);
      lastMessageCard.prevSchema = prevSchema.value || '';
      lastMessageCard.generatedTime = formatDateTime(new Date());
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
  <div class="tg-chat-container" :class="{ 'dark': TinyGenuiConfig?.theme === 'dark' }">
    <div class="messages-container" ref="messagesContainer">
      <tr-bubble-provider :content-renderers="messageRenderers">
        <tr-bubble-list v-if="showMessages.length" :items="showMessages" :roles="roles" auto-scroll> </tr-bubble-list>
      </tr-bubble-provider>
    </div>
    <div class="sender-container">
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': generating }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <tr-sender
        v-model="inputMessage"
        :placeholder="
          GeneratingStatus.includes(messageManager.messageState.status) ? '正在思考中...' : '请输入您的问题～'
        "
        :clearable="true"
        :loading="GeneratingStatus.includes(messageManager.messageState.status)"
        :showWordLimit="true"
        :maxLength="1000"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="messageManager.abortRequest"
      >
      </tr-sender>
    </div>
  </div>
</template>

<style scoped lang="less">
.tg-chat-container {
  --ti-gen-chat-container-bg-color: #f0f0f0;
  --thinking-display: initial;
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
  }
}

.is-loading-in-top {
  margin-top: -48px;
}
.messages-container {
  flex: 1;
  overflow: auto;
  &::-webkit-scrollbar {
    width: 10px;
  }
}
:deep(.tr-bubble__content.border-corner) {
  max-width: 80%;
}

:deep(.tr-bubble__loading) {
  margin-top: 8px;
}

:deep(.tr-bubble.placement-start) {
  .tr-bubble__content {
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }
}
:deep(.tr-bubble[data-role='assistant'] .tr-bubble__content-items) {
  > div {
    display: var(--thinking-display, initial);

    &.schema-render-container[type='schema-card'],
    &.loading-container[type='loading-text'] {
      display: initial;
    }

    &.loading-container[type='loading-text'] {
      margin: 10px 0;
      background: linear-gradient(90deg, #666 0%, #666 45%, #999 50%, #999 55%, #666 60%, #666 100%);
      background-size: 200% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: text-shimmer 6s linear infinite;
    }
  }
}
:deep(.tr-bubble__step-tool) {
  & + .tr-bubble__step-tool {
    margin-top: 16px;
  }
  min-width: 500px;
}
:deep(.tr-bubble__content-wrapper) {
  width: 100%;
}
:deep(.tr-bubble.placement-end) {
  width: 100%;
}
.sender-container {
  position: relative;
  flex-shrink: 0;
  padding: 16px 0;
  .attachments-container {
    padding: 0 20px;
  }
}
.scroll-to-bottom-button {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -35px;
  width: 40px;
  height: 40px;
  background-color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid #e5e5e5;
  z-index: 1000;
  & > svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    box-shadow:
      0px 10px 20px 0px #0000001a,
      0px 0px 1px 0px #00000026;
  }

  &.is-generating {
    border: none;
    background-color: transparent;

    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      width: calc(100% + 4px);
      height: calc(100% + 4px);
      border-radius: 50%;
      background: conic-gradient(from 0deg, #f5f7ff, #d9e0f5, #bfc8e0, #d9e0f5, #f5f7ff);
      z-index: 0;
      animation: rotate-border 2s linear infinite;
    }

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #fff;
      z-index: 1;
    }

    & > svg {
      z-index: 2;
    }
  }
}

@keyframes rotate-border {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes text-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.tiny-sender {
  width: 80%;
  margin: 0 auto;
}
</style>
