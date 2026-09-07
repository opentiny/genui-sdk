<script setup lang="ts">
import { computed, ref } from 'vue';
import { TinyButton } from '@opentiny/vue';
import genuiBuilderDemoChat from '@/assets/genui_builder_demo_chat.png';
import genuiBuilderDemoVersion from '@/assets/genui_builder_demo_version.png';
import genuiBuilderDemoPreview from '@/assets/genui_builder_demo_preview.png';
import genuiBuilderIconChat from '@/assets/genui_builder_icon_chat.svg';
import genuiBuilderIconVersion from '@/assets/genui_builder_icon_version.svg';
import genuiBuilderIconPreview from '@/assets/genui_builder_icon_preview.svg';
import arrowRightIcon from '@/assets/arrow.svg';
import { LinkKey, linkMap } from '@/utils/link';
import { useMobile } from '@/composables/useMobile';
import { t } from '@/i18n';

const { isMobile } = useMobile();

const activeIndex = ref(0);

const features = computed(() => [
  {
    icon: genuiBuilderIconChat,
    image: genuiBuilderDemoChat,
    title: t('ability.builder.feature1.title'),
    description: t('ability.builder.feature1.description'),
  },
  {
    icon: genuiBuilderIconVersion,
    image: genuiBuilderDemoVersion,
    title: t('ability.builder.feature2.title'),
    description: t('ability.builder.feature2.description'),
  },
  {
    icon: genuiBuilderIconPreview,
    image: genuiBuilderDemoPreview,
    title: t('ability.builder.feature3.title'),
    description: t('ability.builder.feature3.description'),
  },
]);

const activeImage = computed(() => features.value[activeIndex.value]?.image ?? genuiBuilderDemoChat);

function handleFeatureClick(index: number) {
  activeIndex.value = index;
}
</script>

<template>
  <section :class="['home-builder-section', { 'home-builder-section-mobile': isMobile }]">
    <div class="home-builder-section-header">
      <div class="home-builder-section-badge">
        <svg class="home-builder-section-badge-icon" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M6 0.5L7.545 4.182L11.5 4.545L8.75 7.318L9.545 11.318L6 9.5L2.455 11.318L3.25 7.318L0.5 4.545L4.455 4.182L6 0.5Z"
            fill="currentColor"
          />
        </svg>
        <span>{{ t('ability.builder.badge') }}</span>
      </div>
      <div class="home-builder-section-title genui-title">{{ t('ability.builder.title') }}</div>
    </div>
    <div :class="['home-builder-content', { 'home-builder-content-mobile': isMobile }]">
    <div class="home-builder-content-left">
      <div class="home-builder-content-left-wrap">
        <img
          class="home-builder-content-left-image"
          :src="activeImage"
          :alt="features[activeIndex]?.title"
        />
      </div>
    </div>
    <div class="home-builder-content-right">
      <div
        v-for="(feature, index) in features"
        :key="feature.title"
        class="home-builder-content-feature"
        :class="{ 'home-builder-content-feature-active': activeIndex === index }"
        role="button"
        tabindex="0"
        @click="handleFeatureClick(index)"
        @keydown.enter="handleFeatureClick(index)"
        @keydown.space.prevent="handleFeatureClick(index)"
      >
        <div class="home-builder-content-feature-icon">
          <img :src="feature.icon" :alt="feature.title" />
        </div>
        <div class="home-builder-content-feature-text">
          <div class="home-builder-content-feature-title">{{ feature.title }}</div>
          <div class="home-builder-content-feature-description">{{ feature.description }}</div>
        </div>
      </div>
      <a v-if="linkMap[LinkKey.PlaygroundBuilder]" :href="linkMap[LinkKey.PlaygroundBuilder]" target="_blank" rel="noopener noreferrer" class="btn-link">
        <tiny-button class="home-builder-content-button" size="medium" round ghost>
          {{ t('ability.builder.tryNow') }}
          <img :src="arrowRightIcon" alt="arrow-right" />
        </tiny-button>
      </a>
    </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.home-builder-section {
  position: relative;
  width: 100%;
  background: linear-gradient(180deg, #f4f6ff 0%, #ffffff 100%);
  padding-bottom: 110px;

  &-header {
    position: relative;
    width: 100%;
    padding-top: 110px;
    padding-left: 12.5%;
    padding-right: 12.5%;
  }

  &-title {
    margin-bottom: 60px;
  }

  &-badge {
    position: absolute;
    top: 30%;
    right: 2%;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px 8px 20px;
    border-radius: 148px 148px 148px 0;
    background: linear-gradient(90deg, #d98aff, #9390ff, #85b2ff);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;

    &-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
  }

  @media (max-width: 1280px) {
    &-header {
      padding-top: 80px;
      padding-left: 10%;
      padding-right: 10%;
    }
  }

  @media (min-width: 1920px) {
    &-header {
      padding-left: 240px;
      padding-right: 240px;
    }
  }

  @media (max-width: 768px) {
    padding-bottom: 46px;

    &-header {
      padding-top: 40px;
    }

    &-title {
      margin-bottom: 30px;
      white-space: normal;
    }
  }
}

.home-builder-section-mobile {
  padding-bottom: 0;

  .home-builder-section-header {
    padding-top: 46px;
    padding-left: 20px;
    padding-right: 20px;
  }

  .home-builder-section-badge {
    border-radius: 48px 48px 48px 0;
  }
}

.home-builder-content {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 10%;
  width: 100%;
  box-sizing: border-box;
  padding: 0 12.5% 48px;

  @media (max-width: 1280px) {
    padding: 0 10% 40px;
  }

  @media (min-width: 1920px) {
    padding: 0 240px 48px;
  }

  &-left {
    flex: 1;
    min-width: 0;

    &-wrap {
      flex: 1;
      width: 100%;
      border-radius: 24px;
      overflow: hidden;
    }

    &-image {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
  }

  &-right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;
  }

  &-feature {
    display: flex;
    padding: 5%;
    min-width: 0;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover:not(&-active) {
      background-color: rgba(255, 255, 255, 0.6);
      border-radius: 20px;
    }

    &-active {
      background-color: #fff;
      border-radius: 20px;
      box-shadow: 0 4px 30px 0 rgba(230, 230, 230, 0.6);
    }

    &-icon {
      margin-right: 16px;
      flex-shrink: 0;

      img {
        width: 32px;
        height: 32px;
      }
    }

    &-title {
      font-size: var(--font-size-body-md);
      line-height: var(--line-height-body-md);
      font-weight: 600;
      margin-bottom: 12px;
    }

    &-description {
      color: rgba(128, 128, 128, 1);
      font-size: var(--font-size-body-sm-sm);
      font-weight: 400;
      line-height: var(--line-height-body-xs);
    }
  }

  &-button {
    margin-top: 24px;
    align-self: flex-start;
    margin-left: 5%;

    img {
      margin-left: 8px;
    }
  }

  @media (min-width: 1280px) {
    &-button {
      height: 44px;
      font-size: 16px;
    }
  }
}

.home-builder-content-mobile {
  flex-direction: column;
  align-items: stretch;
  gap: 30px;
  padding: 0 20px 30px;

  .home-builder-content-left {
    display: block;

    &-wrap {
      flex: none;
      aspect-ratio: 1024 / 625;
    }
  }

  .home-builder-content-left-wrap {
    border-radius: 8px;
  }

  .home-builder-content-feature {
    padding: 16px;

    &-active,
    &:hover:not(&-active) {
      border-radius: 12px;
    }
  }

  .home-builder-content-button {
    margin-left: 16px;
  }
}
</style>
