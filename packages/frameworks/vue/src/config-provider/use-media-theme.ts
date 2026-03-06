import { ref, readonly } from 'vue';

const hasMediaQuery = () => typeof window !== 'undefined' && window.matchMedia;

const getMediaTheme = (): 'light' | 'dark' => {
  if (hasMediaQuery()) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const theme = ref<'light' | 'dark'>(getMediaTheme());
let mediaQuery: MediaQueryList | null = null;

const handleThemeChange = () => {
  theme.value = getMediaTheme();
};

const startWatchMediaTheme = () => {
  if (hasMediaQuery() && !mediaQuery) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
  }
};

export const useMediaTheme = () => {
  startWatchMediaTheme();
  return {
    theme: readonly(theme),
  }
}
