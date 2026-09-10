<script setup lang="ts">
import { computed } from 'vue';
import { LinkKey, linkMap } from '@/utils/link';
import { TinyButton } from '@opentiny/vue';
import { useMobile } from '@/composables/useMobile';
import { t } from '@/i18n';

const { isMobile } = useMobile();

const buttonSize = computed(() => {
  return isMobile.value ? 'medium' : 'large';
});
</script>

<template>
  <section class="home-link">
    <div class="home-link-content">
      <div class="home-link-title genui-title">{{ t('link.title') }}</div>
      <div v-if="!isMobile" class="home-link-description genui-subtitle">
        {{ t('link.description') }}
      </div>
      <div v-else class="home-link-description genui-subtitle">
        <div>{{ t('link.descriptionLine1') }}</div>
        <div>{{ t('link.descriptionLine2') }}</div>
      </div>
      <div class="home-link-button-group">
        <a v-if="linkMap[LinkKey.Playground]" :href="linkMap[LinkKey.Playground]" target="_blank" rel="noopener noreferrer" class="btn-link">
          <tiny-button type="primary" :size="buttonSize" round>{{ t('link.tryNow') }}</tiny-button>
        </a>
        <a :href="linkMap[LinkKey.DevDoc]" target="_blank" rel="noopener noreferrer" class="btn-link">
          <tiny-button :size="buttonSize" round ghost>{{ t('link.productDoc') }}</tiny-button>
        </a>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>

.btn-link {
  :deep(.tiny-button) {
    font-size: 16px;
  }
}

.home-link {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 102px 12.5%;
  background-image: url('@/assets/homelink_bg.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  &-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  &-title {
    color: #191919
  }

  &-description {
    font-size: 16px;
    font-weight: 400;
    line-height: 26px;
    text-align: center;
    margin-bottom: 36px;
  }

  @media (min-width: 1920px) {
    &-description {
      font-size: var(--font-size-body-sm);
    }

    &-button-group {
      display: flex;
      gap: 20px;
    }
  }

  @media (max-width: 768px) {
    background-image: url('@/assets/homelink_bg_mobile.svg');
    margin-top: 16px;
  }
}
</style>
  
