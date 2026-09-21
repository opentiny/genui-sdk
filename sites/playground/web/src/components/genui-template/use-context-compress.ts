import { ref, computed, watch, onUnmounted, toValue, type ComputedRef } from 'vue';
import { TinyNotify } from '@opentiny/vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import {
  compressConversationHistory,
  createContextCompressMessage,
  estimateContextTokens,
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
  /** 当前模板 Schema：后端每次请求都会完整拼入 prompt，需计入上下文占用 */
  templateSchema: ComputedRef<unknown>;
  getTemplateChatConfig: () => { url: string; llmConfig: LLMConfig; templateSchema: unknown };
  saveConversations: () => void;
  scrollToBottom: () => void;
  /** 模型上下文窗口大小（token），默认 128000；支持传入 computed，模型切换时自动更新 */
  contextWindowTokens?: number | ComputedRef<number | undefined>;
  /** 自动压缩触发阈值：占用达到可用窗口该比例时触发，默认 0.9 */
  compressThresholdPercent?: number;
  /**
   * 系统提示词 + 工具定义等固定开销的估算值（token），默认 20000。
   */
  systemOverheadTokens?: number;
  /** 为模型输出预留的空间（token），从可用窗口中扣除，默认 8000 */
  reservedOutputTokens?: number;
  /**
   * 自动压缩后的最小增长量（token）：压缩后占用再增长该值才允许再次自动触发，
   * 防止压缩收益不足时每轮发送都重复压缩。默认为窗口的 5%。
   */
  minGrowthTokensAfterAutoCompress?: number;
}

/** 默认上下文窗口（token） */
const DEFAULT_CONTEXT_WINDOW_TOKENS = 128_000;
/** 默认自动压缩触发阈值 */
const DEFAULT_COMPRESS_THRESHOLD_PERCENT = 0.9;
/** 默认系统固定开销估算（token） */
const DEFAULT_SYSTEM_OVERHEAD_TOKENS = 20_000;
/** 默认输出预留（token） */
const DEFAULT_RESERVED_OUTPUT_TOKENS = 8_000;

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

  // ---------- 自动压缩：窗口占用估算与触发 ----------

  const contextWindowTokens = computed(() => toValue(options.contextWindowTokens) ?? DEFAULT_CONTEXT_WINDOW_TOKENS);
  const compressThresholdPercent = options.compressThresholdPercent ?? DEFAULT_COMPRESS_THRESHOLD_PERCENT;
  const systemOverheadTokens = options.systemOverheadTokens ?? DEFAULT_SYSTEM_OVERHEAD_TOKENS;
  const reservedOutputTokens = options.reservedOutputTokens ?? DEFAULT_RESERVED_OUTPUT_TOKENS;
  const minGrowthTokens = computed(() =>
    options.minGrowthTokensAfterAutoCompress ?? Math.round(contextWindowTokens.value * 0.05),
  );
  /** 可用窗口：扣除输出预留，避免“满窗才触发”导致输出被截断 */
  const usableWindowTokens = computed(() => Math.max(contextWindowTokens.value - reservedOutputTokens, 1));

  /** 消息 + 当前 Schema 的估算占用（分项） */
  const tokenEstimate = computed(() => estimateContextTokens(options.messages.value, options.templateSchema.value));
  /** 模型可见总占用 = 消息 + Schema + 系统固定开销（估算值） */
  const occupiedTokens = computed(() => tokenEstimate.value.totalTokens + systemOverheadTokens);

  // 服务端在每次请求的 SSE 流末尾返回真实 usage（prompt_tokens 等）。
  // 因此以最近一次真实 prompt_tokens 为基线，仅对基线之后的新增内容使用估算增量。

  /** 最近一条已完成的 assistant 消息携带的服务端真实 prompt_tokens */
  const lastPromptTokens = computed(() => {
    const messages = options.messages.value;
    for (let i = messages.length - 1; i >= 0; i--) {
      const finishInfo = (messages[i] as ChatMessage & { finishInfo?: { usage?: { prompt_tokens?: number } } })
        ?.finishInfo;
      const tokens = finishInfo?.usage?.prompt_tokens;
      if (typeof tokens === 'number' && tokens > 0) return tokens;
    }
    return undefined;
  });
  /** 校准基线：最近一次真实请求的 prompt_tokens */
  const calibrationBaselineTokens = ref<number | undefined>(undefined);
  /** 校准是否有效：压缩改写历史后，旧的真实值不再代表当前窗口，需失效并等待下一次请求刷新 */
  const calibrationValid = ref(false);
  /** 基线请求发送时的估算快照（由 markRequestSent 记录） */
  let estimateAtRequest: number | null = null;

  watch(
    lastPromptTokens,
    (tokens) => {
      if (tokens != null) {
        calibrationBaselineTokens.value = tokens;
        calibrationValid.value = true;
      } else {
        calibrationBaselineTokens.value = undefined;
        calibrationValid.value = false;
        estimateAtRequest = null;
      }
    },
    { immediate: true },
  );

  const invalidateCalibration = () => {
    calibrationBaselineTokens.value = undefined;
    calibrationValid.value = false;
    estimateAtRequest = null;
  };

  /** 发送请求前调用：记录当前估算快照，作为下一次真实 usage 的增量基线 */
  const markRequestSent = () => {
    estimateAtRequest = occupiedTokens.value;
  };

  /** 校准后的模型可见总占用：真实 prompt_tokens + 距上次请求的估算增量 */
  const calibratedOccupiedTokens = computed(() => {
    if (!calibrationValid.value || estimateAtRequest == null || calibrationBaselineTokens.value == null) {
      return occupiedTokens.value;
    }
    const incremental = Math.max(occupiedTokens.value - estimateAtRequest, 0);
    return calibrationBaselineTokens.value + incremental;
  });

  const contextUsagePercent = computed(() => calibratedOccupiedTokens.value / usableWindowTokens.value);

  /** 上次压缩完成后的占用基线（token），null 表示尚未压缩过 */
  const lastCompressOccupiedTokens = ref<number | null>(null);
  /** 距离上次压缩是否已积累足够多的新内容（防止压缩收益不足时每轮重复触发） */
  const hasEnoughGrowthSinceCompress = computed(
    () =>
      lastCompressOccupiedTokens.value === null ||
      calibratedOccupiedTokens.value >= lastCompressOccupiedTokens.value + minGrowthTokens.value,
  );

  /** 是否达到自动压缩阈值：占用超阈值、距上次压缩积累足够、有可压缩内容、且当前空闲 */
  const shouldAutoCompress = computed(
    () =>
      contextUsagePercent.value >= compressThresholdPercent &&
      hasEnoughGrowthSinceCompress.value &&
      compressionPlan.value !== null &&
      !isCompressing.value &&
      !options.generating.value,
  );

  // 切换会话时重置压缩基线（会话级状态）
  watch(
    () => options.currentConversationId.value,
    () => {
      lastCompressOccupiedTokens.value = null;
      invalidateCalibration();
    },
  );

  // ---------- 压缩执行 ----------

  const compressedDividerText = computed(() =>
    latestCompressIndex.value !== -1 ? t('template.contextCompressed') : '',
  );
  const compressingDividerText = computed(() => t('template.contextCompressing'));

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

      // 滚动更新：新摘要替换被合并的旧摘要，避免摘要消息叠积
      if (plan.replaceIndex >= 0) {
        targetMessages.splice(plan.replaceIndex, 1);
      }
      const insertIndex = Math.min(plan.insertIndex, targetMessages.length);
      targetMessages.splice(insertIndex, 0, createContextCompressMessage(summary, generateId()));
      options.saveConversations();

      // 压缩改写历史后，旧的真实 usage 不再代表当前窗口：先失效校准再更新基线
      invalidateCalibration();
      // 更新压缩后占用基线（此时 computed 已反映压缩结果，且校准已回退为估算值）
      lastCompressOccupiedTokens.value = calibratedOccupiedTokens.value;

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
    /** 自动压缩 */
    shouldAutoCompress,
    /** 发送请求前调用，记录估算快照以校准真实 usage */
    markRequestSent,
  };
}
