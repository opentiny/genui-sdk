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
  + .btn-link {
    margin-left: 16px;
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

  &-description {
    font-size: 16px;
    font-weight: 400;
    line-height: 26px;
    text-align: center;
    margin-bottom: 36px;
  }

  &-title {
    color: rgba(255, 123, 123, 1);
    background-image: linear-gradient(
      90deg,
      rgba(255, 123, 123, 1) 0%,
      rgba(157, 54, 240, 1) 50%,
      rgba(18, 115, 255, 1) 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (min-width: 1920px) {
    &-description {
      font-size: 18px;
    }

    &-button-group {
      display: flex;
      gap: 20px;
    }
  }
}
</style>
  
