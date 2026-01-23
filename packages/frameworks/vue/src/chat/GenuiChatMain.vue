<script setup lang="ts">
import '@opentiny/tiny-robot/dist/style.css';
import {
  TrBubbleList,
  TrSender,
  TrBubbleProvider,
  useTheme,
  BubbleMarkdownContentRenderer,
} from '@opentiny/tiny-robot';
import { AIClient, GeneratingStatus, STATUS, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { IconAi, IconUser, IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type {
  BubbleRoleConfig,
  BubbleCommonProps,
  BubbleContentItem,
  UserItem,
  UserTextItem,
} from '@opentiny/tiny-robot';
import { ref, watch, computed, h, inject, provide } from 'vue';
import type { Ref, Component } from 'vue';
import { CustomModelProvider } from './CustomModelProvider';
import { scrollEnd, throttle, toSlotFunction } from './chat-utils';
import { useFileUpload } from './useFileUpload';
import AttachmentsRenderer from './renderer/AttachmentsRenderer.vue';
import TemplateDataRenderer from './renderer/TemplateDataRenderer.vue';
import ToolRenderer from './renderer/ToolRenderer.vue';
import { type FileMeta, MIME_TYPE_MAP } from './file-upload/file-utils';
import { cardIdSymbol } from './useChat';
import { emitter } from './event-emitter';
import type { IChatProps, IRolesConfig } from './chat.types';
import GeneratingComponent from './GeneratingComponent.vue';
import { useContinueChatAction } from './continue-chat-action';
import type { IMessageItem } from '@opentiny/genui-sdk-core';
import type { IRendererProps } from '../renderer';
import { GenuiRenderer } from '../renderer';
import ErrorText from './ErrorText.vue';
import { useResize } from './composable/use-resize';
import { useConversation } from './tiny-robot-patch/useConversation';
import { useI18n } from './i18n';
import { GENUI_CONFIG, CUSTOM_CONTEXT } from './injection-tokens';

const props = defineProps<IChatProps>();

const genuiConfig: any = inject(GENUI_CONFIG, null);
const { t } = useI18n();

const { setColorMode } = useTheme();
const isAllowFiles = computed(() => {
  const supportImage = props.features?.supportImage;

  if(supportImage && supportImage?.enabled !== false) {
    return true;
  }
  return false;
});
const buttonGroup = computed(() => {
  const fileTypes = props.features?.supportImage?.supportedFileTypes;
  const accept = fileTypes?.map((type: string) => MIME_TYPE_MAP[type.toLowerCase()]).join(',');
  return {
    file: {
      disabled: false,
      accept,
    },
  };
});

watch(
  () => genuiConfig?.value?.theme,
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

// 定义角色图标以及样式
const defaultRoles: { user: BubbleRoleConfig; assistant: BubbleRoleConfig } = {
  assistant: {
    placement: 'start',
    avatar: h(IconAi, { style: { fontSize: '32px' } }),
    maxWidth: '100%',
    customContentField: 'messages',
  },
  user: {
    placement: 'end',
    maxWidth: '90%',
    avatar: h(IconUser, { style: { fontSize: '32px' } }),
    customContentField: 'messages',
  },
};

const wrapSlots = (slots: any) => {
  if (!slots) {
    return;
  }
  const newSlots: Record<string, any> = {};
  Object.keys(slots).forEach((key) => {
    newSlots[key] = (props: any) => {
      const isFinished = computed(() => {
        if (props.bubbleProps.role !== 'assistant') {
          return true;
        }
        return props.index !== messageManager.value.messages.value.length - 1 || !generating.value;
      });
      const slotFn = toSlotFunction(slots[key]);
      if (slotFn) {
        return slotFn({ ...props, isFinished: isFinished.value, messageManager: messageManager.value });
      }
      return null;
    };
  });
  return newSlots;
};

const roles = computed(() => {
  const mergedRoles = { ...defaultRoles };
  for (const keyAny in props.roles) {
    const key = keyAny as keyof IRolesConfig;
    mergedRoles[key] = {
      ...defaultRoles[key],
      ...props.roles[key],
      slots: wrapSlots(props.roles[key]?.slots),
    };
  }

  return mergedRoles;
});

const flatAllMessages = (messages: ChatMessage[]) => 
   messages
    .filter(item => item.role === 'assistant')
    .reduce((acc: IMessageItem[], chatItem) => {
      const itemMessages = (chatItem as { messages?: IMessageItem[] }).messages;
      if (Array.isArray(itemMessages)) {
        return acc.concat(...itemMessages);
      }
      return acc;
    }, []);


const getCardMessage = (cardId: string) => {
  const flatMessages = flatAllMessages(messages.value)
  return flatMessages.find((message: IMessageItem) => 'id' in message && message.id === cardId);
}

const saveState = (context: Record<string | symbol, any>) => {
  const cardId = context[cardIdSymbol];
  const cardMessage = getCardMessage(cardId);
  if (cardMessage) {
    (cardMessage as any).state = Object.assign({}, context.state || {});
  }
  saveConversations();
}

const onAction = ({ llmFriendlyMessage, humanFriendlyMessage, context }: any) => {
  saveState(context);
  messageManager.value.addMessage({
    role: 'user',
    content: llmFriendlyMessage,
    messages: [{ type: 'text', content: humanFriendlyMessage }],
  });
  messageManager.value.send();
};

const customContext = computed(() => {
  return {
    onAction: onAction,
    generating: generating.value,
  };
});

provide(CUSTOM_CONTEXT, customContext);

const { continueChatAction } = useContinueChatAction(onAction); //TODO: Refactor
const saveStateAction = {
  name: 'saveState',
  description: '保存状态， 用于保存组件状态',
  execute: (params: any, context: Record<string | symbol, any>) => {
    saveState(context);
  },
  params: {}
}

const generating = computed(() => GeneratingStatus.includes(messageManager.value.messageState.status));

const markdownRenderer = new BubbleMarkdownContentRenderer({
  defaultAttrs: { class: 'markdown-content' },
  mdConfig: { html: true },
});

const lastSchemaCardId = computed(() => {
  const lastChatMessage = messages.value[messages.value.length - 1];
  if (lastChatMessage?.role !== 'assistant') {
    return null;
  }
  const items = lastChatMessage?.messages;
  if (!Array.isArray(items) || !items?.length) {
    return null;
  }
  return items[items.length - 1].id;
});

const messageRenderers = {
  'custom-text': (props: BubbleCommonProps & { content: string }) =>
    h('span', { class: 'tr-bubble__body-text' }, props.content),
  'schema-card': (schemaCardProps: IRendererProps) => {

    const customComponentsMap: Record<string, Component> = {};
    if (props.customComponents) {
      props.customComponents.forEach((item) => {
        if (item.ref && item.component) {
          customComponentsMap[item.component] = item.ref;
        }
      });
    }
    
    // 将 customActions 数组转换为对象格式
    const customActionsMap: Record<string, any> = {};
    if (props.customActions) {
      props.customActions.forEach((action) => {
        if (action.name) {
          customActionsMap[action.name] = action;
        }
      });
    }
    
    return h('div', {}, 
    h(
      GenuiRenderer,
      {
        
        ...schemaCardProps,
        requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
        onAction,
        generating: lastSchemaCardId.value === schemaCardProps.id ? generating.value : false,
        customComponents: customComponentsMap,
        customActions: {
          ...customActionsMap,
          continueChat: continueChatAction,
          saveState: saveStateAction,
        },
        key: schemaCardProps.id,
      },
      {
        header: toSlotFunction(props.rendererSlots?.header),
        footer: toSlotFunction(props.rendererSlots?.footer),
      },
    ))
  },
  tool: ToolRenderer,
  markdown: markdownRenderer,
  templateData: TemplateDataRenderer,
  'loading-text': props.thinkComponent || GeneratingComponent,
  'error-text': ErrorText,
};
// 配置AI对话提供商
const customModelProvider = new CustomModelProvider({
  url: props.url,
  model: props.model || '',
  temperature: props.temperature ?? 0.3,
  chatConfig: props.chatConfig || { addToolCallContext: false, showThinkingResult: false },
  customComponents: props.customComponents || [],
  customSnippets: props.customSnippets || [],
  customExamples: props.customExamples || [],
  customActions: [...(props.customActions || []), continueChatAction],
  customFetch: props.customFetch,
});

const client = new AIClient({
  provider: 'custom',
  providerImplementation: customModelProvider,
});

let conversation = useConversation({
  client,
  autoSave: false,
  events: {
    onReceiveData(data, messages, preventDefault) {
      messages.value.push(data as any);
      preventDefault();
    },
    onLoaded(conversations) {
      // 如果历史会话为空，则创建一个默认会话
      if (!conversations.length) {
        createConversation();
        saveConversations();
      }

      // 如果通过 props.messages 传入了初始消息，则在会话加载完成后覆盖当前会话的消息
      if (props.messages?.length) {
        const currentMessages = messageManager.value.messages.value;
        currentMessages.splice(0, currentMessages.length, ...(props.messages as any));
      }
    },
    onFinish(data: any, context) {
      if (data?.type === 'error') {
        context.messages.value.push({
          role: 'assistant',
          content: '',
          messages: [{ type: 'error-text', content: data.error.message }],
        });
      }
      saveConversations();
    },
  },
});
const { messageManager, createConversation, updateTitle, state: conversationState, saveConversations } = conversation;

// 当前会话的 messages 代理
const messages = computed(() => messageManager.value.messages.value);

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

const { attachments, templateData, clearAttachments, processAttachments, handleFilesSelected, handleTemplateEdit } =
  useFileUpload();

const handleTemplateDataUpdate = (value: UserItem[]) => {
  // 使用 handleTemplateEdit 处理 template 编辑，保持 templateData 和 attachments 同步
  const updatedTemplateData = handleTemplateEdit(templateData, inputMessage.value);
  inputMessage.value = '';
  templateData.value = updatedTemplateData;
};
const showMessages = computed(() => {
  let showMessages = messages.value;

  if (messageManager.value.messageState.status === STATUS.PROCESSING) {
    return [
      ...showMessages,
      {
        role: 'assistant',
        content: t('loading.thinking'),
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
              showThinkingResult: props.chatConfig?.showThinkingResult,
            },
          ],
        },
      ];
    }
  }
  return showMessages;
});
const setConversationTitle = (messageContent: string) => {
  const currentTitle = conversationState.conversations.find(
    (conversation) => conversation.id === conversationState.currentId,
  )?.title;
  const DEFAULT_TITLE = t('conversation.newConversation');
  if (currentTitle === DEFAULT_TITLE && conversationState.currentId) {
    const contentStr = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    updateTitle(conversationState.currentId, contentStr.substring(0, 20));
  }
};
const clearInputMessage = () => {
  inputMessage.value = '';
  templateData.value = [];
  clearAttachments();
};

const handleRemoveAttachment = (item: FileMeta | undefined) => {
  if (!item) return;
  attachments.value = attachments.value.filter((attachment) => item.name !== attachment.name);
  templateData.value = templateData.value.filter((data) => data.type !== 'template' || data.content !== item.name);
};

// 发送消息
const handleSendMessage = async (ipt: string) => {
  const messageContent = ipt;
  const userMessageContent: BubbleContentItem[] = [];
  let apiContent: any[] = [];
  const attachmentsValue = attachments.value.slice();
  const templateDataValue = templateData.value.slice();

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
  };
  messages.value.push(userMessage);
  // 附件处理
  if (attachmentsValue.length > 0) {
    const result = await processAttachments(attachmentsValue, props.features || {});
    if (!result) {
      messageManager.value.send();
      scrollToBottom();
      return;
    }
    apiContent = templateDataValue.map((templateItem: UserItem) => {
      if (templateItem.type === 'template') {
        return result.apiContent.find((att: any) => att.filename === templateItem.content);
      } else {
        return {
          type: 'text',
          text: (templateItem as UserTextItem).content,
        };
      }
    });

    // 添加 templateData 类型的消息项，用于渲染
    if (templateDataValue.length > 0) {
      userMessageContent.push({
        type: 'templateData',
        templateData: templateDataValue,
        attachments: attachmentsValue,
      });
    }

    userMessage.content = apiContent;
    userMessage.messages = userMessageContent;
  }

  messageManager.value.send();
  clearInputMessage();
  setConversationTitle(messageContent);
  saveConversations();
  scrollToBottom();
};

const handleNewConversation = () => {
  createConversation();
  saveConversations();
};

const abortRequest = () => {
  messageManager.value.abortRequest();
  saveConversations();
};

const messagesContainer: Ref<HTMLElement | undefined> = ref();
const { width: messagesContainerWidth } = useResize(messagesContainer);
const { scrollToBottom, scrollToBottomWithRetry, autoScrollToBottom, isLastMessageInBottom } = scrollEnd(messagesContainer);
// 使用节流包装 scrollToBottom，延迟 400ms
const throttledScrollToBottom = throttle(autoScrollToBottom, 400);

// 最新消息滚动到底部
watch(() => messages.value, throttledScrollToBottom, { deep: true });
watch(
  () => conversationState.currentId,
  () => {
    // 切换会话, 使用带重试机制的滚动函数，确保在 DOM 完全渲染后滚动到底部
    scrollToBottomWithRetry(10, 150);
  },
);

watch(
  () => [props.model, props.temperature],
  () => {
    customModelProvider.changeLlmConfig(props.model || '', props.temperature ?? 0.3);
  },
);

defineExpose({
  handleNewConversation,
  getConversation: () => conversation,
});
</script>

<template>
  <div
    class="tg-chat-container"
    :class="{ 'dark': genuiConfig?.theme === 'dark' }"
    :style="props.chatConfig?.showThinkingResult === false ? { '--thinking-display': 'none' } : {}"
  >
    <div class="messages-container" ref="messagesContainer" :style="{ '--messages-container-width': messagesContainerWidth + 'px' }">
      <tr-bubble-provider :content-renderers="messageRenderers" v-if="showMessages.length">
        <tr-bubble-list :items="showMessages" :roles="roles" auto-scroll> </tr-bubble-list>
      </tr-bubble-provider>
        <slot v-else name="empty"></slot>
    </div>
    <div class="sender-container">
      <!-- TODO: 抽离到组件 -->
      <div
        :class="['scroll-to-bottom-button', { 'is-generating': generating }]"
        v-show="!isLastMessageInBottom"
        @click="scrollToBottom"
      >
        <IconArrowDown class="icon-arrow-down" />
      </div>
      <tr-sender
        v-model="inputMessage"
        :placeholder="GeneratingStatus.includes(messageManager.messageState.status) ? t('placeholder.thinking') : t('placeholder.input')"
        :clearable="true"
        :allow-files="isAllowFiles"
        :buttonGroup="buttonGroup"
        :loading="GeneratingStatus.includes(messageManager.messageState.status)"
        @files-selected="(files) => handleFilesSelected(files, inputMessage)"
        v-model:template-data="templateData"
        @update:template-data="handleTemplateDataUpdate"
        :showWordLimit="true"
        :maxLength="1000"
        @clear="clearInputMessage"
        @submit="handleSendMessage"
        @cancel="abortRequest"
      >
        <template #header v-if="attachments.length > 0">
          <div class="attachments-container">
            <AttachmentsRenderer :attachments="attachments" @remove="handleRemoveAttachment" />
          </div>
        </template>
      </tr-sender>
      <div class="footer-text">{{ t('footer.aiGenerated') }}</div>
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
  word-break: break-word;
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
  // 匹配：type非空 + 排除 schema-card/loading-text 这两个值
  > [type]:not([type=""]):not([type='schema-card']):not([type='loading-text']) {
    display: var(--thinking-display, initial);
  }
}
:deep(.tr-bubble__step-tool) {
  & + .tr-bubble__step-tool {
    margin-top: 16px;
  }
}

:deep(.tr-bubble.placement-end) {
  width: 100%;
}
:deep(.tr-bubble__content-wrapper) {
  @avatar-and-gap-width: 56px;
  max-width: calc(100% - @avatar-and-gap-width * 2);
  
  .tr-bubble__content {
    max-width: 100%;
  }
  .tr-bubble__content-items {
    overflow-x: auto;
  }
}
.sender-container {
  position: relative;
  flex-shrink: 0;
  padding: 16px 0;
  background: url('./assets/sender-bg.svg') no-repeat center;
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
.footer-text {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin-top: 16px;
}

:deep(.schema-render-container) {
  @large-screen-min-width: 400px;
  @min-width-safe-padding: 250px;
  @small-screen-min-width: calc(var(--messages-container-width) - @min-width-safe-padding);
  min-width: min(@small-screen-min-width, @large-screen-min-width);
}

@keyframes rotate-border {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}


.tiny-sender {
  width: 80%;
  margin: 0 auto;
}
</style>
