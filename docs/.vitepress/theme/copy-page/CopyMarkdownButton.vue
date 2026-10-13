<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useData } from 'vitepress';
import { getCopyPageMessages } from './copyPageMessages';
import { getPageMarkdownSource, hasPageMarkdownSource } from './pageMarkdownSource';
import { useTitleAnchor } from './useTitleAnchor';

const { page, lang } = useData();
const { anchor } = useTitleAnchor();
const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

const markdownSource = computed(() => getPageMarkdownSource(page.value));
const visible = computed(() => {
  if (page.value.isNotFound || !page.value.filePath) {
    return false;
  }

  return hasPageMarkdownSource(page.value) && Boolean(anchor.value);
});
const messages = computed(() => getCopyPageMessages(lang.value));
const label = computed(() => (copied.value ? messages.value.copied : messages.value.copy));

/**
 * 将文本写入系统剪贴板。
 * 优先使用 Clipboard API，不支持时回退到 execCommand。
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 一键复制当前页面的 Markdown 源码到剪贴板。
 */
async function copyMarkdown(): Promise<void> {
  const source = markdownSource.value;
  if (!source) {
    return;
  }

  const ok = await writeToClipboard(source);
  if (!ok) {
    return;
  }

  copied.value = true;
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    copied.value = false;
  }, 2000);
}

onUnmounted(() => {
  clearTimeout(resetTimer);
});
</script>

<template>
  <Teleport v-if="visible && anchor" :to="anchor">
    <button
      type="button"
      class="copy-page-btn"
      :class="{ copied }"
      :aria-label="label"
      :title="label"
      @click="copyMarkdown"
    >
      <span class="copy-page-btn-icon" aria-hidden="true">
        <svg
          v-if="!copied"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span class="copy-page-btn-text">{{ label }}</span>
    </button>
  </Teleport>
</template>
