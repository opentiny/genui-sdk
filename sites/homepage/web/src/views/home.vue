<script setup lang="ts">
import { ref } from "vue";
import { TinyButton, TinyTag } from "@opentiny/vue";
import genuiAbility1 from "@/assets/genui_ability_1.svg";
import genuiAbility2 from "@/assets/genui_ability_2.png";
import genuiAbility3 from "@/assets/genui_ability_3.svg";
import genuiActionVedioCover from '@/assets/genui_action_vedio_cover.webp';
import genuiFlowVedioCover from '@/assets/genui_flow_vedio_cover.svg';
import { LinkKey, openLink } from "@/utils/link";
import HomeAbility from "@/components/HomeAbility.vue";
import HomeGuide from "@/components/HomeGuide.vue";
import HomeFeature from "@/components/HomeFeature.vue";
import HomeLink from "@/components/HomeLink.vue";
import HomeExtend from "@/components/HomeExtend.vue";

const abilityContentWrapClass = ref("home-ability-content-wrap");
const abilityThreePartContent = ref({
  title: "Create_repository",
  subtitle: "Create a new GitHub repository in your account",
  parameters: [
    {
      label: "name *required",
      description: "Repository name",
      tagColor: "green",
      tag: "string",
    },
    {
      label: "private",
      description: "Whether repo should be private",
      tagColor: "orange",
      tag: "boolean",
    },
    {
      label: "autoInit",
      description: "Initialize with README",
      tagColor: "orange",
      tag: "boolean",
    },
    {
      label: "description",
      description: "Repository description",
      tagColor: "green",
      tag: "string",
    },
  ],
});
const actionVideoSource = 'https://tinyengine-assets.obs.cn-north-4.myhuaweicloud.com/files/videos/genui/genui_action_vedio.mov';
const flowVideoSource = 'https://tinyengine-assets.obs.cn-north-4.myhuaweicloud.com/files/videos/genui/genui_flow_vedio.mov';
</script>

<template>
  <div class="genui-sdk-container">
    <!-- 第一屏 -->
    <div class="home-core">
      <div class="home-core-left">
        <div class="home-core-title">OpenTiny GenUI SDK</div>
        <div class="home-core-subtitle">增强大模型对话展示和交互</div>
        <div class="home-core-decsription">
          为用户打造极致顺滑的智能体验，给开发者提供强大的定制能力与生态兼容性
        </div>
        <div class="operation-button-group">
          <tiny-button round type="primary" size="medium" @click="openLink(LinkKey.DevDoc)"
            >开发文档</tiny-button
          >
          <tiny-button round size="medium" @click="openLink(LinkKey.Playground)"
            >演练场</tiny-button
          >
        </div>
      </div>
      <div class="home-core-right">
        <img :src="genuiAbility1" alt="genui-ability-1" />
      </div>
    </div>

    <!-- 第二屏 -->
    <home-ability
      title="超越文字的表达能力"
      subtitle="以界面重构文字，打破文字表达壁垒，用可视化界面释放信息价值"
    >
      <img class="ability-image" :src="genuiAbility2" alt="genui-ability-2" />
    </home-ability>

    <!-- 第三屏 -->
    <home-ability
      title="更加流畅的交互方式"
      subtitle="打破两步交互，实现界面到对话的一站式流转"
    >
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

    <home-ability
      title="结合MCP工具，让AI更懂业务场景"
      subtitle="接入MCP工具后，模型在调用工具缺少参数时能自动生成交互式UI来收集所需信息"
      background="morandi"
    >
      <div :class="abilityContentWrapClass">
        <div :class="`${abilityContentWrapClass}-left`">
          <div :class="`${abilityContentWrapClass}-left-header`">
            <span :class="`${abilityContentWrapClass}-left-header-title`">{{
              abilityThreePartContent.title
            }}</span>
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
                <span
                  :class="`${abilityContentWrapClass}-parameter-label-text`"
                  >{{ parameter.label }}</span
                >
                <tiny-tag :color="parameter.tagColor">{{
                  parameter.tag
                }}</tiny-tag>
              </div>
              <span
                :class="`${abilityContentWrapClass}-parameter-description`"
                >{{ parameter.description }}</span
              >
            </div>
          </div>
        </div>
        <img
          :class="`${abilityContentWrapClass}-right`"
          :src="genuiAbility3"
          alt="genui-mcp-tool"
        />
      </div>
    </home-ability>

    <home-ability
      class="home-ability-4"
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
@import "./home.less";
</style>

<style lang="less" scoped>
.genui-sdk-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
  overflow-x: hidden;

  .home-core {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    background-image: url("@/assets/genui_ability_bg_1.svg");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    padding: 10% 12.5%;

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
      background: linear-gradient(
        90deg,
        rgba(188, 67, 203, 1),
        rgba(14, 112, 255, 1) 92%
      );
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
      color: var(--text-secondary);
      margin-bottom: 76px;
      animation: slideUpFromBottom 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
      opacity: 0;

      @media (max-width: 1280px) {
        margin-bottom: 42px;
      }
    }

    @media (max-width: 768px) {
      &-right {
        display: none;
      }

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
    padding: 30px 0px 30px 120px;

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

        /deep/ .tiny-tag {
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
  border-radius: 32px;
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
