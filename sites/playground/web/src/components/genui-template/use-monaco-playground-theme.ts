import { computed, inject, onMounted, onUnmounted, ref, type ComputedRef } from 'vue';
import { GENUI_CONFIG } from '@opentiny/genui-sdk-vue';

export type PlaygroundColorTheme = 'light' | 'dark' | 'lite' | 'auto';

function useSystemPrefersDark() {
  const prefersDark = ref(false);
  let mql: MediaQueryList | null = null;
  const sync = () => {
    if (!mql) return;
    prefersDark.value = mql.matches;
  };
  onMounted(() => {
    if (typeof window === 'undefined') return;
    mql = window.matchMedia('(prefers-color-scheme: dark)');
    sync();
    mql.addEventListener('change', sync);
  });
  onUnmounted(() => {
    mql?.removeEventListener('change', sync);
  });
  return prefersDark;
}

/**
 * Monaco：`dark` → vs-dark；`auto` 仅在传入 fallback 时跟系统（Provider 内 auto 已解析则走 inject 即可）。
 */
export function useMonacoPlaygroundTheme(
  fallbackTheme?: () => PlaygroundColorTheme | undefined,
): ComputedRef<'vs' | 'vs-dark'> {
  const genuiConfig = inject(GENUI_CONFIG, null) as { value?: { theme?: PlaygroundColorTheme } } | null;
  const systemPrefersDark = useSystemPrefersDark();

  return computed(() => {
    const raw = fallbackTheme?.() ?? genuiConfig?.value?.theme ?? 'light';
    const isDark = raw === 'dark' || (raw === 'auto' && systemPrefersDark.value);
    return isDark ? 'vs-dark' : 'vs';
  });
}
