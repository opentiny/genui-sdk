import TinyConfigProvider from '@opentiny/vue-config-provider';
import ThemeTool from '@opentiny/vue-theme/theme-tool';
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
  type ShallowRef,
} from 'vue';

const SCOPE_ATTR = 'data-genui-theme-scope';

export interface OpenTinyThemeState {
  themeConfig: { css: string };
  colorScheme: 'light' | 'dark';
}

// 每个 Root 实例生成唯一 scope token，避免不同实例的样式互相匹配
let scopeSeq = 0;
function nextScopeToken(): string {
  scopeSeq += 1;
  return `gts-${Date.now().toString(36)}-${scopeSeq.toString(36)}`;
}

// 把 :host / :root 改写为作用域自身的 data 属性选择器，注入 document 后只对自身子树生效
function scopeThemeConfig(
  themeConfig: { css?: string },
  el: HTMLElement,
  token: string,
): { css: string } {
  el.setAttribute(SCOPE_ATTR, token);
  const selector = `[${SCOPE_ATTR}="${token}"]`;
  const next: { css: string } = { css: themeConfig.css || '' };
  next.css = next.css.split(':host').join(selector).split(':root').join(selector);
  return next;
}

// 工厂：为每次 apply 创建独立的 Root 组件，闭包捕获该 apply 自己的主题状态，
// 后续 update 只改写闭包内的 state（不重建组件），从而保留子树 UI 状态
export function createOpenTinyThemeRoot(themeState: ShallowRef<OpenTinyThemeState>): Component {
  return defineComponent({
    name: 'OpenTinyThemeRoot',
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      const providerRef = ref<{ $el?: HTMLElement } | null>(null);
      const themeTool = new ThemeTool();
      const scopeToken = nextScopeToken();

      function applyTheme() {
        const el = providerRef.value?.$el;
        if (!el) {
          return;
        }
        const { themeConfig, colorScheme } = themeState.value;
        themeTool.changeTheme(scopeThemeConfig(themeConfig, el, scopeToken));
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
}
