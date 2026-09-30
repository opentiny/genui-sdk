<script setup lang="ts">
import TinyConfigProvider from '@opentiny/vue-config-provider';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

defineOptions({ name: 'ThemeRoot', inheritAttrs: false });

const scopeClass = `opentiny-vue-theme-root-${Math.random().toString(36).slice(2, 8)}`;

function scopeThemeConfig(themeConfig: { css?: string }): { css: string } {
  const selector = `.${scopeClass}`;
  const next: { css: string } = { css: themeConfig.css || '' };
  next.css = next.css.split(':host').join(selector).split(':root').join(selector);
  return next;
}

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

function applyTheme() {
  const el = providerRef.value?.$el;
  if (!el) {
    return;
  }
  const themeConfig = buildThemeConfig(props.theme);
  themeTool.changeTheme(scopeThemeConfig(themeConfig));
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
  <tiny-config-provider ref="providerRef" style="height: 100%" v-bind="$attrs" :class="scopeClass">
    <slot />
  </tiny-config-provider>
</template>
