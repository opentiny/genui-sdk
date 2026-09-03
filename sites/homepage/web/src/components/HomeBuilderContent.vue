<script setup lang="ts">
import { computed, ref } from 'vue';
import { TinyButton } from '@opentiny/vue';
import genuiBuilderDemoChat from '@/assets/genui_builder_demo_chat1.svg';
import genuiBuilderDemoVersion from '@/assets/genui_builder_demo_version1.svg';
import genuiBuilderDemoPreview from '@/assets/genui_builder_demo_preview1.svg';
import genuiBuilderIconChat from '@/assets/genui_builder_icon_chat.svg';
import genuiBuilderIconVersion from '@/assets/genui_builder_icon_version.svg';
import genuiBuilderIconPreview from '@/assets/genui_builder_icon_preview.svg';
import genuiBuilderIconExperinment from '@/assets/genui_builder_icon_experinment.svg'
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
    <div class="home-builder-section-ellipse" aria-hidden="true"></div>
    <div class="home-builder-section-header">
      <div class="home-builder-section-badge">
        <img class="home-builder-section-badge-icon" :src="genuiBuilderIconExperinment" alt="" />
        <span>{{ t('ability.builder.badge') }}</span>
      </div>
      <div class="home-builder-section-title genui-title">{{ t('ability.builder.title') }}</div>
    </div>
    <div :class="['home-builder-content', { 'home-builder-content-mobile': isMobile }]">
      <div v-if="!isMobile" class="home-builder-content-left">
        <div class="home-builder-content-left-wrap">
          <img
            class="home-builder-content-left-image"
            :src="activeImage"
            :alt="features[activeIndex]?.title"
          />
        </div>
      </div>
      <div v-if="!isMobile" class="home-builder-content-right">
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
      <div v-if="isMobile">
        <div 
          v-for="(item, index) in features"
          :key="item.title"
          class="home-builder-content-card"
          >
          <div class="home-builder-content-card-title">{{ item.title }}</div>
          <div class="home-builder-content-card-description">{{ item.description }}</div>
          <img :src="item.image" alt="" class="home-builder-content-card-img">
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
  overflow: hidden;
  padding-bottom: 110px;

  &-ellipse {
    position: absolute;
    top: -79px;
    left: 361.5px;
    width: 1251px;
    height: 178px;
    border-radius: 50%;
    background: rgba(241, 236, 254, 1);
    filter: blur(100px);
    pointer-events: none;
  }

  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding-top: 110px;
    padding-left: 12.5%;
    padding-right: 12.5%;
  }

  &-badge {
    display: flex;
    justify-content: center;
    z-index: 1;

    height: 34px;
    width: 128px;
    margin-bottom: 26px;

    background-color: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(241, 236, 254, 1);
    border-radius: 8px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    color: rgba(25, 25, 25, 1);
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
    white-space: nowrap;

    &-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
  }

  &-title {
    margin-bottom: 80px;
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
      isolation: isolate;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: -122px;
        left: 63px;
        width: 234px;
        height: 570px;
        border-radius: 50%;
        background-color: rgba(239, 232, 255, 1);
        filter: blur(160px);
        pointer-events: none;
        z-index: -1;  
      }
    }

    &-badge {
      margin-bottom: 20px;
    }

    .home-builder-section-title.genui-title {
      margin-bottom: 30px;
      padding-inline: 24px;
      white-space: normal;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 32px;
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
    background-color: rgba(255, 255, 255, 0.4);
    border-radius: 96.55px;
    border: 1px solid rgba(212, 195, 255, 1)
  }
}

.home-builder-content {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 80px;
  width: 100%;
  box-sizing: border-box;
  padding: 0 12.5% 0;

  @media (max-width: 1280px) {
    padding: 0 10% 40px;
  }

  @media (min-width: 1920px) {
    padding: 0 240px 48px;
  }

  &-left {
    // flex: 1;
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
    // flex: 1;
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

  @media (max-width: 768px) {
    .btn-link {
      display: flex;
      justify-content: center;
      margin-top: 8px;
      text-decoration: none;
    }

    &-button {
      height: 36px;
      font-size: 14px;
      
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

.home-builder-content-card {
  // background-color: pink;
  height: 307px;
  padding: 24px 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 12px;
  box-shadow: 0 0 16px 0 rgba(0, 0, 0, 0.08);

  &-title {
    font-size: 16px;
    color: rgba(0, 0, 0, 1);
    font-weight: 600;
    line-height: 24px;
    margin-bottom: 4px;
    
  }

  &-description {
    height: 44px;
    color: rgba(128, 128, 128, 1);
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
    margin-bottom: 16px;
  }

  &-img {
    flex: 1;
    width: 100%;
    min-height: 0;
    object-fit: fill;
  }
}
</style>
