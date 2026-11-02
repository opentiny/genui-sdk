<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';
import darkCss from 'element-plus/theme-chalk/dark/css-vars.css?raw';

defineOptions({ name: 'ThemeRoot', inheritAttrs: false });

const scopeClass = `element-plus-theme-root-${Math.random().toString(36).slice(2, 8)}`;

function scopeDarkCss(): string {
  const selector = `.${scopeClass}`;
  return darkCss.split('html.dark').join(selector);
}

const props = defineProps<{ theme: string }>();

let styleEl: HTMLStyleElement | null = null;

function syncDark() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.dataset.genuiTheme = 'element-plus-dark';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = props.theme === 'dark' ? scopeDarkCss() : '';
}

onMounted(() => {
  syncDark();
});

watch(() => props.theme, syncDark);

onBeforeUnmount(() => {
  styleEl?.remove();
  styleEl = null;
});
</script>

<template>
  <div :class="scopeClass" style="height: 100%">
    <slot />
  </div>
</template>
