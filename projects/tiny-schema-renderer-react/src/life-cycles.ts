import { parseData, type PageContextValue } from './engine/parse-data';

export interface LifeCycles {
  onMounted?: unknown;
  onUnmounted?: unknown;
}

export type LifeCycleFn = () => void | Promise<void>;

/**
 * 规范化 schema 中的 lifeCycles 字段。
 *
 * @param lifeCycles - 页面 schema 上的生命周期配置
 * @returns 有效的生命周期对象
 */
function normalizeLifeCycles(lifeCycles: unknown): LifeCycles {
  if (lifeCycles == null || typeof lifeCycles !== 'object' || Array.isArray(lifeCycles)) {
    return {};
  }
  return lifeCycles as LifeCycles;
}

/**
 * 将 schema 生命周期描述解析为可执行函数。
 *
 * @param source - onMounted / onUnmounted 原始配置
 * @param getContext - 获取当前页面上下文
 * @returns 解析后的生命周期函数，失败时返回 null
 */
function parseLifeCycleFn(
  source: unknown,
  getContext: () => PageContextValue,
): LifeCycleFn | null {
  if (source == null) return null;
  try {
    const parsed = parseData(source, {}, getContext());
    return typeof parsed === 'function' ? (parsed as LifeCycleFn) : null;
  } catch (error) {
    console.error('LifeCycle parse error:', error);
    return null;
  }
}

/**
 * 从页面 schema 解析 onMounted / onUnmounted。
 *
 * @param lifeCycles - 页面 schema.lifeCycles
 * @param getContext - 获取当前页面上下文
 * @returns 解析后的生命周期函数
 */
export function getPageLifeCycleFns(
  lifeCycles: LifeCycles | null | undefined,
  getContext: () => PageContextValue,
): { onMounted: LifeCycleFn | null; onUnmounted: LifeCycleFn | null } {
  const cycles = normalizeLifeCycles(lifeCycles);
  return {
    onMounted: parseLifeCycleFn(cycles.onMounted, getContext),
    onUnmounted: parseLifeCycleFn(cycles.onUnmounted, getContext),
  };
}
