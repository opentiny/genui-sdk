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

type ContextZipStatus = 'idle' | 'compressing' | 'compressed';

interface UseContextZipOptions {
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

export function useContextZip(options: UseContextZipOptions) {
  const status = ref<ContextZipStatus>('idle');
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

  const isButtonDisabled = computed(() => {
    if (isCompressing.value || options.generating.value) return true;
    return compressionPlan.value === null;
  });

  const compressDisabledReason = computed(() => {
    if (isCompressing.value) return '';
    if (options.generating.value) return t('template.compressDisabledGenerating');
    if (compressionPlan.value === null) return t('template.compressDisabledNeedMore');
    return '';
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
    const boundaryMessage = targetMessages[plan.insertIndex];

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

      if (controller.signal.aborted) {
        return;
      }

      const insertIndex = boundaryMessage ? targetMessages.indexOf(boundaryMessage) : -1;
      if (insertIndex === -1) {
        if (
          compressingConversationId.value === startedId &&
          startedId === options.currentConversationId.value
        ) {
          status.value = 'idle';
        }
        return;
      }

      targetMessages.splice(insertIndex, 0, createContextCompressMessage(summary, generateId()));
      options.saveConversations();

      if (compressingConversationId.value !== startedId) {
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
        compressingConversationId.value === startedId &&
        startedId === options.currentConversationId.value &&
        !controller.signal.aborted
      ) {
        status.value = 'idle';
      }
    } finally {
      if (abortController === controller) {
        abortController = null;
      }
      if (compressingConversationId.value === startedId) {
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
    isButtonDisabled,
    compressDisabledReason,
    reset,
    compress,
  };
}
