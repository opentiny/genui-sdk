<script setup lang="ts">
import genuiCompatibleIcon from '@/assets/genui_compatible_icon.svg';
import genuiThemeIcon from '@/assets/genui_theme_icon.svg';
import genuiCompIcon from '@/assets/genui_comp_icon.svg';
import genuiActionIcon from '@/assets/genui_action_icon.svg';
import genuiDevIcon from '@/assets/genui_dev_icon.svg';
import genuiMoreIcon from '@/assets/genui_more_icon.svg';
import { LinkKey, openLink } from '@/utils/link';
import { t } from '@/i18n';

const features = [
  {
    icon: genuiCompatibleIcon,
    title: t('feature.compatible.title'),
    description: t('feature.compatible.description'),
    background:
      'linear-gradient(180deg, rgba(245, 251, 239, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DcologicalCompatibility,
  },
  {
    icon: genuiThemeIcon,
    title: t('feature.theme.title'),
    description: t('feature.theme.description'),
    background:
      'linear-gradient(180deg, rgba(249, 244, 254, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DefineTheme,
  },
  {
    icon: genuiCompIcon,
    title: t('feature.component.title'),
    description: t('feature.component.description'),
    background:
      'linear-gradient(180deg, rgba(238, 246, 255, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DefineComponent,
  },
  {
    icon: genuiActionIcon,
    title: t('feature.action.title'),
    description: t('feature.action.description'),
    background:
      'linear-gradient(180deg, rgba(243, 255, 254, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DefineAction,
  },
  {
    icon: genuiDevIcon,
    title: t('feature.stack.title'),
    description: t('feature.stack.description'),
    background:
      'linear-gradient(180deg, rgba(255, 243, 243, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.MultiTechnology,
  },
  {
    icon: genuiMoreIcon,
    title: t('feature.more.title'),
    description: t('feature.more.description'),
    background:
      'linear-gradient(180deg, rgba(255, 249, 243, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.MoreFeatures,
  },
];
</script>

<template>
  <section class="home-feature">
    <div class="home-feature-header">
      <div class="home-feature-header-title genui-title">{{ t('feature.title') }}</div>
      <div class="home-feature-header-subtitle genui-subtitle">
        {{ t('feature.subtitle') }}
      </div>
    </div>
    <div class="home-feature-content">
      <div
        class="home-feature-card"
        v-for="feature in features"
        :key="feature.title"
        :style="{ background: feature.background }"
        @click="openLink(feature.linkKey)"
      >
        <img
          class="home-feature-card-icon"
          :src="feature.icon"
          alt="home-feature-card-icon"
        />
        <div class="home-feature-card-content">
          <div class="home-feature-card-title">
            {{ feature.title }}
          </div>
          <div class="home-feature-card-description">
            {{ feature.description }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.home-feature {

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-content: center;
  padding: 110px 12.5%;

  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &-content {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 45px;
  }

  &-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px;
    border: 3px solid #fff;
    border-radius: 16px;
    cursor: pointer;
    box-shadow: 0px 4px 30px 0px rgba(230, 230, 230, 0.6);

    &:hover {
      box-shadow: 0px 4px 32px 0px rgba(230, 230, 230, 0.9);
    }
    @media (max-width: 768px) {
      flex-direction: row;
      border-radius: 6px;
      box-shadow: 0px 2px 12px 0px rgba(230, 230, 230, 0.6);
      div&-title {
        margin-bottom: 0;
      }
    }

    &-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }

    @media (max-width: 1280px) {
      &-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
      .home-feature-card-description {
        font-size: 14px;
      }
    }

    &-title {
      font-size: var(--font-size-body-lg);
      line-height: var(--line-height-body-lg);
      font-weight: 600;
      margin-bottom: 8px;
    }

    &-description {
      color: rgba(128, 128, 128, 1);
      font-size: var(--font-size-body-sm-sm);
      line-height: var(--line-height-body-sm);
      font-weight: 400;
      letter-spacing: 0px;
    }
  }

  @media (max-width: 768px) {
    &-content {
      grid-template-columns: repeat(1, 1fr);
    }
  }

  @media (max-width: 1280px) {
    &-card {
      padding: 24px;
      justify-content: normal;
    }
  }

  @media (min-width: 1920px) {
    padding: 110px 240px 150px 240px;
  }
}
</style>
