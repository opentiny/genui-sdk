<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import darkCss from 'element-plus/theme-chalk/dark/css-vars.css?raw';

const SCOPE_ATTR = 'data-genui-theme-scope';

defineOptions({ name: 'ThemeRoot', inheritAttrs: false });

// 每个 Root 实例生成唯一 scope token，避免不同实例的样式互相匹配
let scopeSeq = 0;
function nextScopeToken(): string {
  scopeSeq += 1;
  return `eps-${Date.now().toString(36)}-${scopeSeq.toString(36)}`;
}

function scopeDarkCss(token: string): string {
  const selector = `[${SCOPE_ATTR}="${token}"]`;
  return darkCss.split('html.dark').join(selector);
}

const props = defineProps<{ theme: string }>();

const rootRef = ref<HTMLElement | null>(null);
const scopeToken = nextScopeToken();
let styleEl: HTMLStyleElement | null = null;

function syncDark() {
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.dataset.genuiTheme = 'element-plus-dark';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = props.theme === 'dark' ? scopeDarkCss(scopeToken) : '';
}

onMounted(() => {
  rootRef.value?.setAttribute(SCOPE_ATTR, scopeToken);
  syncDark();
});

watch(() => props.theme, syncDark);

onBeforeUnmount(() => {
  styleEl?.remove();
  styleEl = null;
});
</script>

<template>
  <div ref="rootRef" style="height: 100%">
    <slot />
  </div>
</template>
