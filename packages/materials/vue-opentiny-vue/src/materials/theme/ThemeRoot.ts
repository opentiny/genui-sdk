import TinyConfigProvider from '@opentiny/vue-config-provider';
import ThemeTool from '@opentiny/vue-theme/theme-tool';
import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

const SCOPE_ATTR = 'data-genui-theme-scope';

export interface OpenTinyThemeState {
  themeConfig: { css: string };
  colorScheme: 'light' | 'dark';
}

// Root 自持的主题配置：apply 通过 setOpenTinyThemeState 写入，Root 内部响应式消费
const themeState = shallowRef<OpenTinyThemeState>({ themeConfig: { css: ' ' }, colorScheme: 'light' });

export function setOpenTinyThemeState(state: OpenTinyThemeState) {
  themeState.value = state;
}

// 把 :host / :root 改写为作用域自身的 data 属性选择器，注入 document 后只对自身子树生效
function scopeThemeConfig(themeConfig: { css?: string }, el: HTMLElement): { css: string } {
  el.setAttribute(SCOPE_ATTR, '');
  const selector = `[${SCOPE_ATTR}]`;
  const next: { css: string } = { css: themeConfig.css || '' };
  next.css = next.css.split(':host').join(selector).split(':root').join(selector);
  return next;
}

export const OpenTinyThemeRoot = defineComponent({
  name: 'OpenTinyThemeRoot',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const providerRef = ref<{ $el?: HTMLElement } | null>(null);
    const themeTool = new ThemeTool();

    function applyTheme() {
      const el = providerRef.value?.$el;
      if (!el) {
        return;
      }
      const { themeConfig, colorScheme } = themeState.value;
      themeTool.changeTheme(scopeThemeConfig(themeConfig, el));
      el.setAttribute('data-color-scheme', colorScheme === 'dark' ? 'dark' : 'light');
    }

    onMounted(() => {
      providerRef.value?.$el?.classList.remove('tiny-config-provider');
      applyTheme();
    });

    watch(themeState, applyTheme);

    onBeforeUnmount(() => {
      themeTool.changeTheme({ css: ' ' });
    });

    return () =>
      h(
        TinyConfigProvider,
        {
          ref: providerRef,
          style: { height: '100%' },
          theme: {
            data: {
              'tv-base-color-brand': themeState.value.colorScheme === 'dark' ? '#B3B3B3' : '#1476ff',
            },
          },
          ...attrs,
        },
        slots,
      );
  },
});
