/**
 * useMessage composable
 * 提供消息管理和状态控制功能
 */

import { reactive, type Reactive, ref, toRaw, type Ref } from 'vue';
import {
  GeneratingStatus,
  STATUS,
  type AIClient,
  type ChatCompletionResponse,
  type ChatCompletionStreamResponse,
  type ChatMessage,
  type MessageState,
} from '@opentiny/tiny-robot-kit';

/**
 * useMessage选项接口
 */
export interface UseMessageOptions {
  /** AI客户端实例 */
  client: AIClient;
  /** 消息ID */
  conversationId: string;
  /** 是否默认使用流式响应 */
  useStreamByDefault?: boolean;
  /** 错误消息模板 */
  errorMessage?: string;
  /** 初始消息列表 */
  initialMessages?: ChatMessage[];
  events?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onReceiveData?: <T = any>(data: T, messages: Ref<ChatMessage[]>, preventDefault: () => void) => void;
    onFinish?: (
      finishReason: string | undefined,
      context: { messages: Ref<ChatMessage[]>; messageState: Reactive<MessageState> },
      preventDefault: () => void,
    ) => void;
  };
}

/**
 * useMessage返回值接口
 */
export interface UseMessageReturn {
  /** 消息ID */
  conversationId: string;
  /** 消息列表 */
  messages: Ref<ChatMessage[]>;
  /** 消息状态 */
  messageState: Reactive<MessageState>;
  /** 输入消息 */
  inputMessage: Ref<string>;
  /** 是否使用流式响应 */
  useStream: Ref<boolean>;
  /** 发送消息 */
  sendMessage: (content?: ChatMessage['content'], clearInput?: boolean) => Promise<void>;
  /** 手动执行addMessage添加消息后，可以执行send发送消息 */
  send: () => Promise<void>;
  /** 清空消息 */
  clearMessages: () => void;
  /** 添加消息 */
  addMessage: (message: ChatMessage | ChatMessage[]) => void;
  /** 中止请求 */
  abortRequest: () => void;
  /** 重试请求 */
  retryRequest: (msgIndex: number) => Promise<void>;
}

/**
 * useMessage composable
 * 提供消息管理和状态控制功能
 *
 * @param options useMessage选项
 * @returns UseMessageReturn
 */
import { useI18n } from '../i18n';

export function useMessage(options: UseMessageOptions): UseMessageReturn {
  const { t } = useI18n();
  const { client, useStreamByDefault = true, errorMessage = t('message.requestFailed'), initialMessages = [] } = options;

  // 消息列表
  const messages = ref<ChatMessage[]>([...initialMessages]);

  // 输入消息
  const inputMessage = ref('');

  // 是否使用流式响应
  const useStream = ref(useStreamByDefault);

  // 请求控制器
  let abortController: AbortController | null = null;

  // 消息状态
  const messageState = reactive<MessageState>({
    status: STATUS.INIT,
    errorMsg: null,
  });

  const chatOnReceiveData = (data: ChatCompletionResponse) => {
    const onReceiveData = options.events?.onReceiveData;
    let defaultPrevented = false;
    if (onReceiveData) {
      onReceiveData(data, messages, () => {
        defaultPrevented = true;
      });
    }

    if (!defaultPrevented) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.choices[0].message.content,
      };
      messages.value.push(assistantMessage);
    }
  };

  // 普通请求
  const chat = async (abortController: AbortController) => {
    const response = await client.chat({
      messages: toRaw(messages.value),
      options: {
        stream: false,
        signal: abortController.signal,
      },
    });

    chatOnReceiveData(response);
  };

  const streamChatOnReceiveData = (data: ChatCompletionStreamResponse) => {
    const onReceiveData = options.events?.onReceiveData;
    let defaultPrevented = false;
    if (onReceiveData) {
      onReceiveData(data, messages, () => {
        defaultPrevented = true;
      });
    }

    if (!defaultPrevented) {
      if (messages.value[messages.value.length - 1].role === 'user') {
        messages.value.push({ role: 'assistant', content: '' });
      }
      const choice = data.choices?.[0];
      if (choice && choice.delta.content) {
        messages.value[messages.value.length - 1].content += choice.delta.content;
      }
    }
  };

  // 流式请求
  const streamChat = async (abortController: AbortController) => {
    await client.chatStream(
      {
        messages: toRaw(messages.value),
        options: {
          stream: true,
          signal: abortController.signal,
        },
      },
      {
        onData: (data) => {
          messageState.status = STATUS.STREAMING;

          streamChatOnReceiveData(data);
        },
        onError: (error) => {
          messageState.status = STATUS.ERROR;
          messageState.errorMsg = errorMessage;
          console.error('Stream request error:', error);
        },
        onDone: (finishReason) => {
          const onFinish = options.events?.onFinish;

          let defaultPrevented = false;
          if (onFinish) {
            onFinish(finishReason, { messages, messageState }, () => {
              defaultPrevented = true;
            });
          }

          if (!defaultPrevented) {
            if (finishReason === 'aborted' || messageState.status === STATUS.ABORTED) {
              return;
            }
            messageState.status = STATUS.FINISHED;
          }
        },
      },
    );
  };

  const chatRequest = async () => {
    // 更新状态
    messageState.status = STATUS.PROCESSING;
    messageState.errorMsg = null;

    // 创建中止控制器
    abortController = new AbortController();

    try {
      if (useStream.value) {
        await streamChat(abortController);
      } else {
        await chat(abortController);
      }
    } catch (error) {
      messageState.errorMsg = errorMessage;
      messageState.status = STATUS.ERROR;
      console.error('Send message error:', error);
    } finally {
      abortController = null;
    }
  };

  // 发送消息
  const sendMessage = async (content: ChatMessage['content'] = inputMessage.value, clearInput: boolean = true) => {
    if (GeneratingStatus.includes(messageState.status)) {
      return;
    }

    if (!content) {
      return;
    }

    if (typeof content === 'string' && !content.trim()) {
      return;
    }

    if (Array.isArray(content) && content.length === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
    };
    messages.value.push(userMessage);
    if (clearInput) {
      inputMessage.value = '';
    }

    await chatRequest();
  };

  const send = async () => {
    if (GeneratingStatus.includes(messageState.status)) {
      return;
    }

    await chatRequest();
  };

  // 中止请求
  const abortRequest = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
      messageState.status = STATUS.ABORTED;
    }
  };

  // 重试请求
  const retryRequest = async (msgIndex: number) => {
    if (msgIndex === 0 || !messages.value[msgIndex] || messages.value[msgIndex].role === 'user') {
      return;
    }
    messages.value.splice(msgIndex);
    await chatRequest();
  };

  //清空消息
  const clearMessages = () => {
    messages.value = [];
    messageState.errorMsg = null;
  };

  // 添加消息
  const addMessage = (message: ChatMessage | ChatMessage[]) => {
    if (Array.isArray(message)) {
      messages.value.push(...message);
    } else {
      messages.value.push(message);
    }
  };

  return {
    conversationId: options.conversationId,
    messages,
    messageState,
    inputMessage,
    useStream,
    sendMessage,
    send,
    clearMessages,
    addMessage,
    abortRequest,
    retryRequest,
  };
}
