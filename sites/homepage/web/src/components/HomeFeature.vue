<script setup lang="ts">
import genuiCompatibleIcon from '@/assets/genui_compatible_icon.svg';
import genuiThemeIcon from '@/assets/genui_theme_icon.svg';
import genuiCompIcon from '@/assets/genui_comp_icon.svg';
import genuiActionIcon from '@/assets/genui_action_icon.svg';
import genuiDevIcon from '@/assets/genui_dev_icon.svg';
import genuiMoreIcon from '@/assets/genui_more_icon.svg';
import { LinkKey, openLink } from '@/utils/link';

const features = [
  {
    icon: genuiCompatibleIcon,
    title: '现有AI生态的兼容',
    description: 'OpenAI格式兼容，支持MCP服务接入',
    background:
      'linear-gradient(180deg, rgba(245, 251, 239, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DcologicalCompatibility,
  },
  {
    icon: genuiThemeIcon,
    title: '定制主题',
    description: '支持主题切换、护眼暗黑模式及用户自定义，适配不同使用需求',
    background:
      'linear-gradient(180deg, rgba(249, 244, 254, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DefineTheme,
  },
  {
    icon: genuiCompIcon,
    title: '支持自定义组件',
    description: '支持传入自定义组件和组件描述，增强生成式UI能力，丰富生成界面',
    background:
      'linear-gradient(180deg, rgba(238, 246, 255, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DefineComponent,
  },
  {
    icon: genuiActionIcon,
    title: '自定义交互',
    description: '支持自定义交互行为，例如跳转新网页、下载附件等灵活操作',
    background:
      'linear-gradient(180deg, rgba(243, 255, 254, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.DefineAction,
  },
  {
    icon: genuiDevIcon,
    title: '多技术栈支持',
    description: '兼容Vue与Angular渲染器，同时支持自定义技术栈渲染扩展',
    background:
      'linear-gradient(180deg, rgba(255, 243, 243, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.MultiTechnology,
  },
  {
    icon: genuiMoreIcon,
    title: '更多功能',
    description:
      '自定义示例和自定义片段，能够助力构建更加优秀的UI界面，满足多样视觉偏好',
    background:
      'linear-gradient(180deg, rgba(255, 249, 243, 1), rgba(255, 255, 255, 1) 100%)',
    linkKey: LinkKey.MoreFeatures,
  },
];
</script>

<template>
  <section class="home-feature">
    <div class="home-feature-header">
      <div class="home-feature-header-title genui-title">为开发者而生</div>
      <div class="home-feature-header-subtitle genui-subtitle">
        OpenTiny生成式UI具备丰富的特性以及强大生态兼容性
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
        <div class="home-feature-card-title">
          {{ feature.title }}
        </div>
        <div class="home-feature-card-description">
          {{ feature.description }}
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
  padding: 110px 12.5% 110px 12.5%;

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

  @media (max-width: 768px) {
    &-content {
      grid-template-columns: repeat(1, 1fr);
    }
  }

  &-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px;
    border: 3px solid #fff;
    border-radius: 12px;
    cursor: pointer;

    &:hover {
      box-shadow: 0px 4px 30px 0px rgba(234, 233, 237, 0.9);
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

  @media (max-width: 1280px) {
    &-card {
      padding: 24px;
    }
  }
}
</style>
