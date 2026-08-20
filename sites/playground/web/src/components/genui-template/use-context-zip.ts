import { ref, computed, watch, onUnmounted, type ComputedRef } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import {
  compressConversationHistory,
  createContextCompressMessage,
  getMessagesForCompressRequest,
} from './template-chat-utils';
import { generateId } from '../../utils';

type ContextZipStatus = 'idle' | 'compressing' | 'compressed';

interface UseContextZipOptions {
  messages: ComputedRef<ChatMessage[]>;
  generating: ComputedRef<boolean>;
  currentConversationId: ComputedRef<string | undefined>;
  getTemplateChatConfig: () => { url: string; llmConfig: LLMConfig; templateSchema: unknown };
  saveConversations: () => void;
  scrollToBottom: () => void;
}

export function useContextZip(options: UseContextZipOptions) {
  const status = ref<ContextZipStatus>('idle');
  const messageCountAtZip = ref(0);
  let abortController: AbortController | null = null;

  const dividerText = computed(() => {
    if (status.value === 'compressing') return '压缩会话中';
    if (status.value === 'compressed') return '以上会话已压缩';
    return '';
  });

  const isCompressing = computed(() => status.value === 'compressing');
  const showDivider = computed(() => status.value !== 'idle');

  const isButtonDisabled = computed(() => {
    if (options.messages.value.length === 0) return true;
    if (isCompressing.value || options.generating.value) return true;
    return status.value === 'compressed' && options.messages.value.length <= messageCountAtZip.value;
  });

  const reset = () => {
    abortController?.abort();
    abortController = null;
    status.value = 'idle';
    messageCountAtZip.value = 0;
  };

  watch(options.currentConversationId, reset);
  onUnmounted(reset);

  const compress = async () => {
    if (isButtonDisabled.value) return;

    const { url, llmConfig, templateSchema } = options.getTemplateChatConfig();
    if (!url) {
      console.error('未配置模板聊天地址，无法压缩会话');
      return;
    }

    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    status.value = 'compressing';

    try {
      const summary = await compressConversationHistory({
        url,
        messages: getMessagesForCompressRequest(options.messages.value),
        templateSchema,
        llmConfig,
        signal: controller.signal,
      });

      options.messages.value.push(createContextCompressMessage(summary, generateId()));
      status.value = 'compressed';
      messageCountAtZip.value = options.messages.value.length;
      options.saveConversations();
      options.scrollToBottom();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('会话压缩失败', error);
      }
      if (!controller.signal.aborted) {
        status.value = 'idle';
      }
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
    }
  };

  return {
    dividerText,
    isCompressing,
    showDivider,
    isButtonDisabled,
    reset,
    compress,
  };
}
