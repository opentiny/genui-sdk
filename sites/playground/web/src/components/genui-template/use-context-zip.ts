import { ref, computed, watch, onUnmounted, type ComputedRef } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import {
  compressConversationHistory,
  createContextCompressMessage,
  findLatestContextCompressIndex,
  getContextCompressionPlan,
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
  let abortController: AbortController | null = null;

  const compressionPlan = computed(() => getContextCompressionPlan(options.messages.value));
  const latestCompressIndex = computed(() => findLatestContextCompressIndex(options.messages.value));

  const dividerText = computed(() => {
    if (status.value === 'compressing') return '压缩会话中';
    if (latestCompressIndex.value !== -1) return '以上会话已压缩';
    return '';
  });

  const isCompressing = computed(() => status.value === 'compressing');
  const showDivider = computed(() => isCompressing.value || latestCompressIndex.value !== -1);

  const isButtonDisabled = computed(() => {
    if (isCompressing.value || options.generating.value) return true;
    return compressionPlan.value === null;
  });

  const reset = () => {
    abortController?.abort();
    abortController = null;
    status.value = 'idle';
  };

  watch(options.currentConversationId, reset);
  onUnmounted(reset);

  const compress = async () => {
    if (isButtonDisabled.value) return;

    const plan = compressionPlan.value;
    if (!plan) return;

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
        messages: plan.messages,
        templateSchema,
        llmConfig,
        signal: controller.signal,
      });

      // 摘要插入到被保留的最近消息之前；旧消息仍完整保存在会话中。
      options.messages.value.splice(plan.insertIndex, 0, createContextCompressMessage(summary, generateId()));
      status.value = 'compressed';
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
    latestCompressIndex,
    isButtonDisabled,
    reset,
    compress,
  };
}
