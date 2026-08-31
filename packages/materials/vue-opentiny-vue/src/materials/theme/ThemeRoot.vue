<script setup lang="ts">
import TinyConfigProvider from '@opentiny/vue-config-provider';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const SCOPE_ATTR = 'data-genui-theme-scope';

defineOptions({ name: 'ThemeRoot', inheritAttrs: false });

// 每个 Root 实例生成唯一 scope token，避免不同实例的样式互相匹配
let scopeSeq = 0;
function nextScopeToken(): string {
  scopeSeq += 1;
  return `gts-${Date.now().toString(36)}-${scopeSeq.toString(36)}`;
}

// 把 :host / :root 改写为作用域自身的 data 属性选择器，注入 document 后只对自身子树生效
function scopeThemeConfig(themeConfig: { css?: string }, el: HTMLElement, token: string): { css: string } {
  el.setAttribute(SCOPE_ATTR, token);
  const selector = `[${SCOPE_ATTR}="${token}"]`;
  const next: { css: string } = { css: themeConfig.css || '' };
  next.css = next.css.split(':host').join(selector).split(':root').join(selector);
  return next;
}

// 只取 css 部分（data 品牌色由 Root 按 colorScheme 自行生成），作用域改写由 Root 完成
function buildThemeConfig(theme: string): { css: string } {
  if (theme === 'dark') {
    return { css: tinyDarkTheme.css };
  }
  if (theme === 'lite') {
    return { css: tinyOldTheme.css };
  }
  return { css: ' ' };
}

const props = defineProps<{ theme: string }>();

const providerRef = ref<{ $el?: HTMLElement } | null>(null);
const themeTool = new ThemeTool();
const scopeToken = nextScopeToken();

function applyTheme() {
  const el = providerRef.value?.$el;
  if (!el) {
    return;
  }
  const themeConfig = buildThemeConfig(props.theme);
  themeTool.changeTheme(scopeThemeConfig(themeConfig, el, scopeToken));
  el.setAttribute('data-color-scheme', props.theme === 'dark' ? 'dark' : 'light');
}

onMounted(() => {
  providerRef.value?.$el?.classList.remove('tiny-config-provider');
  applyTheme();
});

watch(() => props.theme, applyTheme);

onBeforeUnmount(() => {
  themeTool.changeTheme({ css: ' ' });
});
</script>

<template>
  <tiny-config-provider ref="providerRef" style="height: 100%" v-bind="$attrs">
    <slot />
  </tiny-config-provider>
</template>
