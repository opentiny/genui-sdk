import { parseData, type PageContextValue } from './engine/parse-data';

export interface LifeCycles {
  onMounted?: unknown;
  onUnmounted?: unknown;
}

export type LifeCycleFn = () => void | Promise<void>;

function normalizeLifeCycles(lifeCycles: unknown): LifeCycles {
  if (lifeCycles == null || typeof lifeCycles !== 'object' || Array.isArray(lifeCycles)) {
    return {};
  }
  return lifeCycles as LifeCycles;
}

function parseLifeCycleFn(source: unknown, getContext: () => PageContextValue): LifeCycleFn | null {
  if (source == null) return null;
  try {
    const parsed = parseData(source, {}, getContext());
    return typeof parsed === 'function' ? (parsed as LifeCycleFn) : null;
  } catch (error) {
    console.error('LifeCycle parse error:', error);
    return null;
  }
}

export function getPageLifeCycleFns(
  lifeCycles: LifeCycles | null | undefined,
  getContext: () => PageContextValue,
): { onMounted: LifeCycleFn | null; onUnmounted: LifeCycleFn | null } {
  const cycles = normalizeLifeCycles(lifeCycles);
  const onMounted = parseLifeCycleFn(cycles.onMounted, getContext);
  const onUnmounted = parseLifeCycleFn(cycles.onUnmounted, getContext);

  return {
    onMounted,
    onUnmounted,
  };
}
