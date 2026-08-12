import { computed, inject, onMounted, onUnmounted, ref, type ComputedRef } from 'vue';
import { GENUI_CONFIG } from '@opentiny/genui-sdk-vue';

export type PlaygroundColorTheme = 'light' | 'dark' | 'lite' | 'auto';

function useSystemPrefersDark() {
  const prefersDark = ref(false);
  let mql: MediaQueryList | null = null;
  function sync() {
    if (!mql) return;
    prefersDark.value = mql.matches;
  }
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

export function useMonacoPlaygroundTheme(
  fallbackTheme?: () => PlaygroundColorTheme | undefined,
): ComputedRef<'vs' | 'vs-dark'> {
  const genuiConfig = inject(GENUI_CONFIG, null) as { value?: { colorScheme?: 'light' | 'dark' } } | null;
  const systemPrefersDark = useSystemPrefersDark();

  return computed(() => {
    const colorScheme = genuiConfig?.value?.colorScheme;
    if (colorScheme) {
      return colorScheme === 'dark' ? 'vs-dark' : 'vs';
    }
    const raw = fallbackTheme?.() ?? 'light';
    const isDark = raw === 'dark' || (raw === 'auto' && systemPrefersDark.value);
    return isDark ? 'vs-dark' : 'vs';
  });
}

export const SCHEMA_JSON_DIFF_EDITOR_OPTIONS = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  readOnly: true,
  originalEditable: false,
  renderSideBySide: false,
} as const;
