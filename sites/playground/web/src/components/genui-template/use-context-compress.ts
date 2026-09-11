import { ref, computed, onUnmounted, type ComputedRef } from 'vue';
import { TinyNotify } from '@opentiny/vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import {
  compressConversationHistory,
  createContextCompressMessage,
  findLatestContextCompressIndex,
  getContextCompressionPlan,
} from './template-chat-utils';
import { generateId } from '../../utils';
import { t } from '../../i18n';

type ContextCompressStatus = 'idle' | 'compressing' | 'compressed';

interface UseContextCompressOptions {
  messages: ComputedRef<ChatMessage[]>;
  generating: ComputedRef<boolean>;
  currentConversationId: ComputedRef<string | undefined>;
  getTemplateChatConfig: () => { url: string; llmConfig: LLMConfig; templateSchema: unknown };
  saveConversations: () => void;
  scrollToBottom: () => void;
}

function isCompressAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true;
  }
  const err = error as { name?: string; message?: string };
  if (err?.name === 'AbortError') {
    return true;
  }
  return typeof err?.message === 'string' && err.message.includes('已中止');
}

function notifyCompressError(message: string) {
  TinyNotify({
    type: 'error',
    message,
    position: 'top-right',
  });
}

export function useContextCompress(options: UseContextCompressOptions) {
  const status = ref<ContextCompressStatus>('idle');
  const compressingConversationId = ref<string | undefined>();
  let abortController: AbortController | null = null;

  const compressionPlan = computed(() => getContextCompressionPlan(options.messages.value));
  const latestCompressIndex = computed(() => findLatestContextCompressIndex(options.messages.value));

  const compressedDividerText = computed(() =>
    latestCompressIndex.value !== -1 ? t('template.contextCompressed') : '',
  );
  const compressingDividerText = computed(() => t('template.contextCompressing'));

  const isCompressing = computed(
    () =>
      status.value === 'compressing' && compressingConversationId.value === options.currentConversationId.value,
  );
  const showDivider = computed(() => isCompressing.value || latestCompressIndex.value !== -1);

  const canCompress = computed(() => compressionPlan.value !== null);

  const isButtonDisabled = computed(() => {
    if (isCompressing.value || options.generating.value) return true;
    return compressionPlan.value === null;
  });

  const reset = () => {
    abortController?.abort();
    abortController = null;
    compressingConversationId.value = undefined;
    status.value = 'idle';
  };

  onUnmounted(reset);

  const compress = async () => {
    if (isButtonDisabled.value) return;

    const plan = compressionPlan.value;
    if (!plan) return;

    const { url, llmConfig, templateSchema } = options.getTemplateChatConfig();
    if (!url) {
      notifyCompressError(t('template.compressNoUrl'));
      return;
    }

    const targetMessages = options.messages.value;
    const startedId = options.currentConversationId.value;

    abortController?.abort();
    const controller = new AbortController();
    abortController = controller;
    compressingConversationId.value = startedId;
    status.value = 'compressing';

    try {
      const summary = await compressConversationHistory({
        url,
        messages: plan.messages,
        templateSchema,
        llmConfig,
        signal: controller.signal,
      });

      const isCurrentRequest = () => abortController === controller;

      if (controller.signal.aborted || !isCurrentRequest()) {
        return;
      }

      const insertIndex = Math.min(plan.insertIndex, targetMessages.length);
      targetMessages.splice(insertIndex, 0, createContextCompressMessage(summary, generateId()));
      options.saveConversations();

      if (!isCurrentRequest()) {
        return;
      }
      if (startedId === options.currentConversationId.value) {
        status.value = 'compressed';
        options.scrollToBottom();
      } else {
        status.value = 'idle';
      }
    } catch (error) {
      if (!isCompressAbortError(error, controller.signal)) {
        console.error('会话压缩失败', error);
        notifyCompressError(t('template.compressFailed'));
      }
      if (
        abortController === controller &&
        startedId === options.currentConversationId.value &&
        !controller.signal.aborted
      ) {
        status.value = 'idle';
      }
    } finally {
      if (abortController === controller) {
        abortController = null;
        compressingConversationId.value = undefined;
      }
    }
  };

  return {
    compressedDividerText,
    compressingDividerText,
    isCompressing,
    showDivider,
    latestCompressIndex,
    canCompress,
    isButtonDisabled,
    reset,
    compress,
  };
}
