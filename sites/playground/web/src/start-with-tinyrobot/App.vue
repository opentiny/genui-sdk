<script setup lang="ts">
import { ref, computed, h, reactive } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import { TrBubbleList, TrSender, TrBubbleProvider, BubbleMarkdownContentRenderer } from '@opentiny/tiny-robot';
import { AIClient, GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import '@opentiny/tiny-robot/dist/style.css';
import type { IRendererProps } from '@opentiny/genui-sdk-vue';
import { CustomModelProvider } from './CustomModelProvider'; // 引入上面定义的 CustomModelProvider

// 初始化 AI 客户端
const client = new AIClient({
  provider: 'custom',
  providerImplementation: new CustomModelProvider('http://localhost:3100/chat/completions'),
});

// 消息管理
const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const messageState = reactive({ status: STATUS.INIT, errorMsg: null as any });
let abortController: AbortController | null = null;

const generating = computed(() => GeneratingStatus.includes(messageState.status));

// 发送消息
const sendMessage = async (messageContent: string) => {
  if (generating.value || !messageContent.trim()) return;

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
  };
  messages.value.push(userMessage);

  messageState.status = STATUS.PROCESSING;
  abortController = new AbortController();

  try {
    await client.chatStream(
      {
        messages: messages.value,
        options: { stream: true, signal: abortController.signal },
      },
      {
        onData: (data: any) => {
          messageState.status = STATUS.STREAMING;
          const lastMessage = messages.value[messages.value.length - 1];
          if (lastMessage?.role === 'assistant') {
            Object.assign(lastMessage, data);
          } else {
            messages.value.push(data);
          }
        },
        onError: (error: any) => {
          messageState.status = STATUS.ERROR;
          messageState.errorMsg = error;
          console.error('Stream error:', error);
        },
        onDone: () => {
          messageState.status = STATUS.FINISHED;
        },
      },
    );
  } catch (error) {
    messageState.status = STATUS.ERROR;
  } finally {
    abortController = null;
  }
};

// 取消请求
const abortRequest = () => {
  abortController?.abort();
  messageState.status = STATUS.FINISHED;
};

// 配置消息渲染器
const markdownRenderer = new BubbleMarkdownContentRenderer({
  defaultAttrs: { class: 'markdown-content' },
});

const lastSchemaCardId = computed(() => {
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg?.role !== 'assistant') return null;
  const items = (lastMsg as any).messages;
  if (!Array.isArray(items) || !items.length) return null;
  const schemaCard = items.find((m: any) => m.type === 'schema-card');
  return schemaCard?.id || null;
});

const messageRenderers = {
  'schema-card': (props: IRendererProps) => {
    return h(
      'div',
      {},
      h(GenuiRenderer, {
        ...props,
        generating: lastSchemaCardId.value === props.id ? generating.value : false,
      }),
    );
  },
  markdown: markdownRenderer,
};

// 处理发送消息 - TrSender 的 @submit 事件直接传入输入内容
const handleSubmit = (content: string) => {
  sendMessage(content);
};

const roles = {
  user: {
    placement: 'end',
  },
  assistant: {
    placement: 'start',
    customContentField: 'messages',
  },
};
</script>

<template>
  <div class="chat-container">
    <div class="messages-container">
      <TrBubbleProvider :content-renderers="messageRenderers">
        <TrBubbleList :items="messages" :roles="roles" />
      </TrBubbleProvider>
    </div>
    <div class="sender-container">
      <TrSender
        v-model="inputMessage"
        :loading="generating"
        :placeholder="generating ? '思考中...' : '请输入消息'"
        @submit="handleSubmit"
        @cancel="abortRequest"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
}

.messages-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.sender-container {
  flex-shrink: 0;
  padding: 16px;
  background: #fff;
  border-top: 1px solid #e5e5e5;
}
</style>
