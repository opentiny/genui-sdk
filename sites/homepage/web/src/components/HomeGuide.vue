<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import hljs from 'highlight.js/lib/core'
import { TinyButton } from '@opentiny/vue'
import genuiChatIcon from '@/assets/genui_chat_icon.svg'
import genuiInusecon from '@/assets/genui_inuse_icon.svg'
import gneuiSettingsIcon from '@/assets/genui_settings_icon.svg'
import { guideCodeMap } from '@/config'
import { LinkKey, openLink } from '@/utils/link'
import HomeGuideCard from './HomeGuideCard.vue'

const activeCard = ref(0)
const codeRef = ref<HTMLElement | null>(null)

function hightlight() {
  // 每次都要更新一下代码高亮
  nextTick(() => {
    if (codeRef.value) {
      const codeArea = document.querySelector('.code-area')
      delete (codeArea as HTMLElement).dataset.highlighted
      // highlight.js 会自动处理内容更新，直接调用即可
      hljs.highlightElement(codeRef.value)
    }
  })
}

const handleGuideCardClick = (index: number) => {
  activeCard.value = index
  hightlight()
}

onMounted(() => {
  hightlight()
})
</script>

<template>
  <section class="home-guide">
    <div class="home-guide-header">
      <div class="home-guide-header-title genui-title">快速集成生成式UI</div>
      <div class="home-guide-header-subtitle genui-subtitle">提供强大的渲染组件和开箱即用的对话组件</div>
    </div>
    <div class="home-guide-content">
      <div class="home-guide-content-left">
        <home-guide-card
          title="步骤1：引入并使用chat组件"
          description="开箱即用的caht组件内置了对话界面与消息管理"
          :img="genuiChatIcon"
          :active="activeCard === 0"
          @click="handleGuideCardClick(0)"
        />
        <home-guide-card
          title="步骤2：使用chat组件"
          description="简单地配置配套的大模型服务地址，即可体验生成式UI"
          :img="genuiInusecon"
          :active="activeCard === 1"
          @click="handleGuideCardClick(1)"
        />
        <home-guide-card
          title="步骤3：添加自定义配置"
          description="强大的定制能力，可定制主题、组件、消息底部工具栏等"
          :img="gneuiSettingsIcon"
          :active="activeCard === 2"
          @click="handleGuideCardClick(2)"
        />
        <tiny-button class="home-guide-content-left-button" round size="small" @click="openLink(LinkKey.ChatDoc)">开发文档</tiny-button>
      </div>
      <div class="home-guide-content-right">
        <div class="home-guide-content-right-framework">
          <div class="home-guide-content-right-framework-header">
            <div class="home-guide-content-right-framework-header-action">
              <div class="header-action-close"></div>
              <div class="header-action-full"></div>
              <div class="header-action-exit"></div>
            </div>
          </div>
          <pre
            class="guide-code language-js line-numbers"
          ><code ref="codeRef" class="language-js code-area">{{ guideCodeMap[`step${activeCard + 1}`] }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '../style/index.less';

.home-guide {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-content: center;
  padding: 110px 12.5% 0px 12.5%;

  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &-content {
    display: flex;
    justify-content: space-between;
    align-items: center;

    &-left {
      display: flex;
      flex-direction: column;
      gap: 12px;

      &-button {
        max-width: 150px;
        margin-left: 32px;
      }

      @media (max-width: 1280px) {
        &-button {
          max-width: 120px;
        }
      }
    }

    &-right {
      flex: 1;
      max-height: 400px;
      background: rgba(242, 242, 242, 1);
      border-radius: 24px;
      padding: 30px;
      margin-left: 10%;
      height: -webkit-fill-available;

      &-framework {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: linear-gradient(180, rgba(47, 47, 47, 1), rgba(19, 19, 19, 1) 100%);
        border-radius: 12px;

        .guide-code {
          flex: 1;
        }

        &-header {
          background: rgba(61, 61, 61, 1);
          border-radius: 12px 12px 0 0;
          height: 40px;
          padding: 15px 28px;

          &-action {
            display: flex;
            height: 100%;
            gap: 12px;

            .header-action-close {
              width: 10px;
              height: 10px;
              background-color: rgba(254, 3, 4, 1);
              border-radius: 50%;
            }

            .header-action-full {
              width: 10px;
              height: 10px;
              background-color: rgba(254, 199, 3, 1);
              border-radius: 50%;
            }

            .header-action-exit {
              width: 10px;
              height: 10px;
              background-color: rgba(0, 207, 106, 1);
              border-radius: 50%;
            }
          }
        }
      }
    }
  }
}

/deep/.guide-code {
  background: #0b1020;
  padding: 20px;
  margin: 0;
  overflow: auto;
  border-radius: 0 0 12px 12px;
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #e5e7eb;

  /* highlight.js 基础样式 */
  code.hljs {
    background: transparent;
    color: inherit;
    padding: 0;
  }

  /* 选中高亮行号或文本时的背景 */
  ::selection {
    background: rgba(96, 165, 250, 0.35);
  }

  /* 语法高亮配色（暗色主题） */
  .hljs-comment,
  .hljs-quote {
    color: #6b7280;
    font-style: italic;
  }

  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-literal {
    color: #60a5fa;
  }

  .hljs-string,
  .hljs-meta .hljs-string,
  .hljs-template-tag,
  .hljs-template-variable {
    color: #a3e635;
  }

  .hljs-number,
  .hljs-symbol,
  .hljs-bullet {
    color: #fbbf24;
  }

  .hljs-title.function_,
  .hljs-function .hljs-title {
    color: #22d3ee;
  }

  .hljs-attr,
  .hljs-attribute,
  .hljs-variable,
  .hljs-class .hljs-title {
    color: #f97316;
    font-weight: 500;
  }

  // class 名单独稍微再亮一点
  .hljs-title.class_ {
    color: #facc15;
    font-weight: 600;
  }

  .hljs-tag,
  .hljs-name {
    color: #f97316;
  }

  .hljs-built_in,
  .hljs-builtin-name {
    color: #38bdf8;
  }

  .hljs-meta,
  .hljs-meta .hljs-keyword {
    color: #a855f7;
  }

  .hljs-operator {
    color: #e5e7eb;
  }

  .hljs-link {
    color: #93c5fd;
    text-decoration: underline;
  }
}
</style>

