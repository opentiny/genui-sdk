<script setup lang="ts">
import { ref } from 'vue';
import { TinyButton, TinyTag } from '@opentiny/vue';
import genuiAbility1 from '@/assets/genui_ability_1.svg';
import genuiAbility2 from '@/assets/genui_ability_2.webp';
import genuiAbility3 from '@/assets/genui_ability_3.webp';
import genuiActionVedioCover from '@/assets/genui_action_vedio_cover.webp';
import genuiFlowVedioCover from '@/assets/genui_flow_vedio_cover.webp';
import { LinkKey, linkMap } from '@/utils/link';
import { useMobile } from '@/composables/useMobile';
import HomeAbility from '@/components/HomeAbility.vue';
import HomeGuide from '@/components/HomeGuide.vue';
import HomeFeature from '@/components/HomeFeature.vue';
import HomeLink from '@/components/HomeLink.vue';
import HomeExtend from '@/components/HomeExtend.vue';
import HomeMcpToolMobile from '@/components/HomeMcpToolMobile.vue';

const abilityContentWrapClass = ref('home-ability-content-wrap');
const abilityThreePartContent = ref({
  title: 'Create_repository',
  subtitle: 'Create a new GitHub repository in your account',
  parameters: [
    {
      label: 'name *required',
      description: 'Repository name',
      tagColor: 'green',
      tag: 'string',
    },
    {
      label: 'private',
      description: 'Whether repo should be private',
      tagColor: 'orange',
      tag: 'boolean',
    },
    {
      label: 'autoInit',
      description: 'Initialize with README',
      tagColor: 'orange',
      tag: 'boolean',
    },
    {
      label: 'description',
      description: 'Repository description',
      tagColor: 'green',
      tag: 'string',
    },
  ],
});
const actionVideoSource =
  'https://tinyengine-assets.obs.cn-north-4.myhuaweicloud.com/files/videos/genui/genui_action_vedio.mov';
const flowVideoSource =
  'https://tinyengine-assets.obs.cn-north-4.myhuaweicloud.com/files/videos/genui/genui_flow_vedio.mov';

const { isMobile } = useMobile();
</script>

<template>
  <div :class="{ 'genui-sdk-container': true, 'genui-sdk-container-mobile': isMobile }">
    <!-- 第一屏 -->
    <div :class="{ 'home-core': true, 'home-core-mobile': isMobile }">
      <div class="home-core-left">
        <div class="home-core-title">OpenTiny GenUI SDK</div>
        <div class="home-core-subtitle">增强大模型对话展示和交互</div>
        <div class="home-core-decsription">为用户打造极致顺滑的智能体验，给开发者提供强大的定制能力与生态兼容性</div>
        <div class="operation-button-group">
          <a :href="linkMap[LinkKey.DevDoc]" target="_blank" class="btn-link">
            <tiny-button round type="primary" size="medium">开发文档</tiny-button>
          </a>
          <a :href="linkMap[LinkKey.Playground]" target="_blank" class="btn-link">
            <tiny-button round ghost size="medium">演练场</tiny-button>
          </a>
        </div>
      </div>
      <div class="home-core-right">
        <img :src="genuiAbility1" alt="genui-ability-1" />
      </div>
    </div>

    <!-- 第二屏 -->
    <home-ability
      class="home-ability-2"
      title="超越文字的表达能力"
      subtitle="以界面重构文字，打破文字表达壁垒，用可视化界面释放信息价值"
    >
      <div class="ability-image-wrap-2">
        <img class="ability-image" :src="genuiAbility2" alt="genui-ability-2" />
      </div>
    </home-ability>

    <!-- 第三屏 -->
    <home-ability title="更加流畅的交互方式" subtitle="打破两步交互，实现界面到对话的一站式流转">
      <video
        class="cover-image ability-image"
        id="genui-action-vedio"
        controls
        preload="none"
        :poster="genuiActionVedioCover"
      >
        <source :src="actionVideoSource" type="video/mp4" />
      </video>
    </home-ability>


    <home-mcp-tool-mobile v-if="isMobile"></home-mcp-tool-mobile>
    <home-ability
      v-else
      class="home-ability-4"
      title="结合MCP工具，让AI更懂业务场景"
      subtitle="接入MCP工具后，模型在调用工具缺少参数时能自动生成交互式UI来收集所需信息"
      background="morandi"
    >
      <div :class="abilityContentWrapClass">
        <div :class="`${abilityContentWrapClass}-left`">
          <div :class="`${abilityContentWrapClass}-left-header`">
            <span :class="`${abilityContentWrapClass}-left-header-title`">{{ abilityThreePartContent.title }}</span>
            <span :class="`${abilityContentWrapClass}-left-header-subtitle`">{{
              abilityThreePartContent.subtitle
            }}</span>
          </div>
          <span :class="`${abilityContentWrapClass}-label`">Parameters</span>
          <div :class="`${abilityContentWrapClass}-parameters`">
            <div
              :class="`${abilityContentWrapClass}-parameter`"
              v-for="parameter in abilityThreePartContent.parameters"
              :key="parameter.label"
            >
              <div :class="`${abilityContentWrapClass}-parameter-label`">
                <span :class="`${abilityContentWrapClass}-parameter-label-text`">{{ parameter.label }}</span>
                <tiny-tag :color="parameter.tagColor">{{ parameter.tag }}</tiny-tag>
              </div>
              <span :class="`${abilityContentWrapClass}-parameter-description`">{{ parameter.description }}</span>
            </div>
          </div>
        </div>
        <img :class="`${abilityContentWrapClass}-right`" :src="genuiAbility3" alt="genui-mcp-tool" />
      </div>
    </home-ability>

    <home-ability
      class="home-ability-5"
      title="界面混排与流式渲染"
      subtitle="生成式UI无侵入接入，支持混排，并实现UI流式渲染，界面无需漫长等待生成"
    >
      <video
        ref="videoRef"
        class="cover-image ability-image"
        id="genui-flow-vedio"
        controls
        preload="none"
        :poster="genuiFlowVedioCover"
      >
        <source :src="flowVideoSource" type="video/mp4" />
      </video>
    </home-ability>

    <home-extend></home-extend>

    <home-guide></home-guide>
    <home-feature></home-feature>
    <home-link></home-link>
  </div>
</template>

<style lang="less">
@import './home.less';
</style>

<style lang="less" scoped>
.genui-sdk-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
  overflow-x: hidden;

  .btn-link {
    + .btn-link {
      margin-left: 16px;
    }
  }

  .home-core {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background-image: url('@/assets/genui_ability_bg_1.svg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    padding: 10% 12.5%;

    // 开启gpu加速，优化首屏滚动卡顿
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000;

    &-left {
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin-right: 6%;
    }

    .operation-button-group {
      animation: slideUpFromBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.62s forwards;
      opacity: 0;
    }

    &-right {
      width: 60%;
      animation: slideUpFromBottom 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards;
      opacity: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    &-title {
      font-size: var(--font-size-title-xl);
      line-height: var(--line-height-title-xl);
      font-weight: 700;
      text-align: left;
      margin-bottom: 6px;
      white-space: nowrap;
      animation: slideUpFromBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
      opacity: 0;
    }

    &-subtitle {
      font-size: var(--font-size-title-lg);
      line-height: var(--line-height-title-lg);
      font-weight: 700;
      text-align: left;
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background: linear-gradient(90deg, rgba(188, 67, 203, 1), rgba(14, 112, 255, 1) 92%);
      background-clip: text;
      margin-bottom: 26px;
      white-space: nowrap;
      animation: slideUpFromBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.28s forwards;
      opacity: 0;
    }

    &-decsription {
      font-size: var(--font-size-body-sm);
      font-weight: 400;
      line-height: var(--line-height-description);
      text-align: left;
      color: rgba(89, 89, 89, 1);
      margin-bottom: 76px;
      animation: slideUpFromBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
      opacity: 0;
      white-space: nowrap;

      @media (max-width: 1280px) {
        margin-bottom: 42px;
      }
    }

    @media (max-width: 768px) {
      &-title {
        white-space: normal;
      }

      &-subtitle {
        white-space: normal;
      }
    }

    @media (max-width: 1280px) {
      padding: 8% 10%;
    }

    @media (min-width: 1280px) and (max-width: 1920px) {
      &-title {
        font-size: var(--font-size-title-lg);
      }

      &-subtitle {
        font-size: var(--font-size-title-lg-sm-md);
      }

      &-decsription {
        font-size: var(--font-size-body-sm-sm);
      }

      &-right {
        width: 70%;
      }
    }

    @media (min-width: 1920px) {
      padding: 140px 232px;

      :deep(.operation-button-group .tiny-button) {
        width: 152px;
        height: 48px;
        font-size: var(--font-size-body-sm);
      }
    }
  }

  .home-ability-2 {
    padding-bottom: 0 !important;
  }

  .home-ability-4 {
    background: rgba(248, 248, 255, 1);
  }

  :deep(.ability-image-wrap-2) {
    display: flex;
    padding: 16px;
    border-radius: 24px;
    background-image: url('@/assets/genui_ability_bg_2.jpg');

    img {
      border-radius: 16px;
      width: 100%;
      height: 100%;
    }
  }
}

.genui-sdk-container-mobile {
  .home-core {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 50px 20px !important;
    background: url('@/assets/genui_ability_mobile_bg_1.svg')  center/cover no-repeat;

    &-left {
      font-size: var(--font-size-title-md);
    }

    &-decsription {
      font-size: var(--font-size-body-md);
      white-space: normal;
      margin-bottom: 28px;
    }

    &-left {
      margin-bottom: 40px;

      div {
        text-align: center;
      }
    }

    &-right {
      width: 100%;
    }
  }

  :deep(.genui-title) {
    font-size: var(--font-size-title-md);
    margin-bottom: 8px;
  }

  :deep(.genui-subtitle) {
    font-size: var(--font-size-body-md);
    margin-bottom: 20px;
  }

  :deep(.home-ability) {
    padding: 46px 20px 0px 20px;
    &-title {
      &-text {
        font-size: var(--font-size-title-md);
        margin-bottom: 8px;
      }

      &-subtitle {
        font-size: var(--font-size-body-md);
        margin-bottom: 30px;
      }
    }

    .ability-image-wrap-2 {
      padding: 8px;
      border-radius: 8px !important;

      img {
        border-radius: 6px !important;
      }
    }

    .cover-image {
      border-radius: 8px !important;
    }
  }

  :deep(.home-extend) {
    padding: 46px 20px 0px 20px;

    &-title {
      margin-bottom: 20px;
    }

    &-schema {
      padding: 16px 12px 12px;
      border-radius: 8px;

      &-header {
        &-action {
          gap: 8px;

          div {
            width: 12px;
            height: 12px;
          }
        }

        &-subtitle {
          font-size: 14px;
        }
      }
    }

    .extend-button-element-active {
      color: rgba(25, 25, 25, 1) !important;
    }

    .extend-button-group {
      height: 32px;
      margin-bottom: 30px;
      padding: 2px;

      button {
        font-size: 14px;
        font-weight: 400;
        line-height: 19px;
        color: rgba(89, 89, 89, 1);
      }
    }
  }

  :deep(.home-guide) {
    padding: 46px 20px 0px 20px;

    &-content {
      &-right {
        padding: 12px;
        border-radius: 8px;

        &-framework {
          border-radius: 6px;
        }
      }
    }
  }

  :deep(.home-feature) {
    padding: 46px 20px 0px 20px;

    &-content {
      gap: 20px;
    }

    &-card {
      flex-direction: row;
      box-shadow: 0px 4px 30px 0px rgba(234, 233, 237, 0.9);

      &-content {
        margin-left: 16px;
      }
    }
  }

  :deep(.home-link) {
    margin-top: 60px;
    padding: 46px 20px 43px 20px;
    background-image: url('@/assets/genui_ability_mobile_bg_2.svg');

    &-description {
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
    }
  }
}

.home-ability-content-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 20px;
  box-shadow: 0px 4px 30px 0px rgba(0, 0, 0, 0.03);
  background: #fff;

  &-left {
    width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 30px 0px 30px 100px;

    @media (max-width: 1280px) {
      padding: 20px 0px 20px 60px;
    }

    &-header {
      display: flex;
      flex-direction: column;
      text-align: left;

      &-title {
        font-size: var(--font-size-title-md);
        font-weight: 600;
        line-height: var(--line-height-title-md);
        margin-bottom: 5px;
      }

      &-subtitle {
        font-size: var(--font-size-body-sm);
        font-weight: 400;
        line-height: var(--line-height-body-sm);
        color: rgba(102, 102, 102, 1);
      }
    }
  }

  &-right {
    width: 50%;
    padding: 8px;
    border-radius: 0px 20px 20px 0px;
  }

  &-label {
    margin: 20px 0px 10px 0px;
    font-size: var(--font-size-body-lg);
    font-weight: 600;
    line-height: var(--line-height-body-lg);
    text-align: left;
  }

  &-parameters {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (max-width: 1280px) {
    &-label {
      margin: 5px 0px 2px 0px;
    }

    &-parameters {
      gap: 5px;
    }
  }

  &-parameter {
    display: flex;
    flex-direction: column;

    &-label {
      font-size: var(--font-size-body-md);
      font-weight: 500;
      line-height: var(--line-height-body-md);

      &-text {
        margin-right: 10px;
      }
    }

    &-description {
      font-size: var(--font-size-body-sm);
      font-weight: 400;
      line-height: var(--line-height-body-sm);
      color: rgba(102, 102, 102, 1);
    }
  }

  @media (max-width: 768px) {
    &-left {
      padding: 20px 0px 20px 20px;

      &-header {
        &-title {
          font-size: 10px;
          line-height: 10px;
        }

        &-subtitle {
          font-size: 8px;
          line-height: 8px;
        }
      }
    }

    &-label {
      font-size: 8px;
      line-height: 8px;
    }

    &-parameter {
      &-label {
        font-size: 6px;
        line-height: 6px;

        :deep(.tiny-tag) {
          font-size: 6px;
          line-height: 6px;
        }
      }

      &-description {
        font-size: 6px;
        line-height: 6px;
      }
    }
  }
}

.ability-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cover-image {
  border-radius: 28px;
  cursor: pointer;
}

@keyframes slideUpFromBottom {
  from {
    opacity: 0;
    transform: translateY(60px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
