<script setup>
import { computed } from 'vue';
import { THEME_PREVIEW_COLOR_PRESETS } from './theme-colors';
import ThemePreviewContent from './ThemePreviewContent.vue';

const props = defineProps({
  theme: {
    type: String,
    default: 'light',
  },
  themeColors: {
    type: Object,
    default: () => ({}),
  },
});

const resolvePreset = (theme) => {
  const presetTheme = theme === 'auto' ? 'light' : theme;
  return THEME_PREVIEW_COLOR_PRESETS[presetTheme] || THEME_PREVIEW_COLOR_PRESETS.light;
};

const toStyleVars = (colors) => ({
  '--preview-border': colors.previewBorder,
  '--preview-bg': colors.previewBg,
  '--sidebar-bg': colors.sidebarBg,
  '--main-bg': colors.mainBg,
  '--skeleton-bg': colors.skeletonBg,
  '--new-task-bg': colors.newTaskBg,
  '--bubble-border': colors.bubbleBorder,
  '--bubble-bg': colors.bubbleBg,
  '--sender-border': colors.senderBorder,
  '--sender-bg': colors.senderBg,
});

const themeStyleVars = computed(() => {
  const preset = resolvePreset(props.theme);
  const colors = { ...preset, ...props.themeColors };
  return toStyleVars(colors);
});
</script>

<template>
  <div class="theme-card__preview" :style="themeStyleVars">
    <div class="theme-card__preview-body" :style="themeStyleVars">
      <ThemePreviewContent />
    </div>
  </div>
</template>

<style scoped lang="less">
.theme-card__preview {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--preview-border);
  height: 96px;
  box-sizing: border-box;
  padding-bottom: 0;
  background: var(--preview-bg);
}

.theme-card__preview-body {
  display: flex;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 4px 0;
  margin-bottom: -1px;
  align-items: stretch;
}
</style>
