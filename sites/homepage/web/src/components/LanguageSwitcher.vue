<script setup lang="ts">
import { computed } from 'vue';
import { t, locale, setLocale } from '@/i18n';

const isZh = computed(() => locale.value === 'zh_CN');

const switchLang = (lang: string) => setLocale(lang);
</script>

<template>
  <div class="language-switcher" role="group" :aria-label="t('lang.switch')">
    <button type="button" class="language-switcher-item" :class="{ 'is-active': isZh }" @click="switchLang('zh_CN')">
      {{ t('lang.zh') }}
    </button>
    <span class="language-switcher-divider" aria-hidden="true">|</span>
    <button type="button" class="language-switcher-item" :class="{ 'is-active': !isZh }" @click="switchLang('en_US')">
      {{ t('lang.en') }}
    </button>
  </div>
</template>

<style scoped>
.language-switcher {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.language-switcher-item {
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 20px;
  color: rgba(89, 89, 89, 1);
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.2s ease;
}

.language-switcher-item:hover {
  color: rgba(14, 112, 255, 1);
}

.language-switcher-item.is-active {
  color: rgba(14, 112, 255, 1);
  font-weight: 600;
}

.language-switcher-divider {
  color: rgba(200, 200, 200, 1);
  font-size: 12px;
  user-select: none;
}

@media (max-width: 768px) {
  .language-switcher {
    top: 12px;
    right: 12px;
    padding: 4px 10px;
  }

  .language-switcher-item {
    font-size: 13px;
  }
}
</style>
