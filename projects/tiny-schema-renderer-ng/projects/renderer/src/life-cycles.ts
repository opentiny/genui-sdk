import { parseData } from './parser/schema-parser';

export interface JSFunctionDescriptor {
  type: 'JSFunction';
  value: string;
  params?: string[];
}

export interface LifeCycles {
  onMounted?: JSFunctionDescriptor;
  onUnmounted?: JSFunctionDescriptor;
}

/**
 * 将 schema 中的 lifeCycles 字段规范化为生命周期对象。
 *
 * @param lifeCycles - schema 中的 lifeCycles 配置
 * @returns 规范化后的生命周期对象，无效输入时返回空对象
 */
const normalizeLifeCycles = (lifeCycles: unknown): LifeCycles => {
  if (lifeCycles == null || typeof lifeCycles !== 'object' || Array.isArray(lifeCycles)) {
    return {};
  }
  return lifeCycles as LifeCycles;
};

/**
 * 将生命周期配置解析为可执行的函数。
 * 在回调执行时重新解析，确保使用最新的渲染上下文。
 *
 * @param source - 生命周期函数描述（通常为 JSFunction）
 * @param getContext - 获取当前渲染上下文的函数
 * @returns 解析成功时返回可执行函数，否则返回 null
 */
const parseLifeCycleFn = (
  source: JSFunctionDescriptor | undefined,
  getContext: () => Record<string, unknown>,
): (() => void | Promise<void>) | null => {
  if (source == null) {
    return null;
  }
  return () => {
    try {
      const parsed = parseData(source, {}, getContext());
      if (typeof parsed === 'function') {
        return parsed();
      }
    } catch (error) {
      console.error('LifeCycle parse error:', error);
    }
  };
};

/**
 * 从 schema 的 lifeCycles 配置中解析页面级 onMounted / onUnmounted 回调。
 *
 * @param lifeCycles - schema 中的 lifeCycles 配置
 * @param getContext - 获取当前渲染上下文的函数
 * @returns 包含 onMounted 与 onUnmounted 回调的对象
 */
export const getPageLifeCycleFns = (
  lifeCycles: LifeCycles | null | undefined,
  getContext: () => Record<string, unknown>,
) => {
  const cycles = normalizeLifeCycles(lifeCycles);
  return {
    onMounted: parseLifeCycleFn(cycles.onMounted, getContext),
    onUnmounted: parseLifeCycleFn(cycles.onUnmounted, getContext),
  };
};
