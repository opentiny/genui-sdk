<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import { TinyButton } from '@opentiny/vue';
import genuiChatIcon from '@/assets/genui_chat_icon.svg';
import genuiInusecon from '@/assets/genui_inuse_icon.svg';
import arrowRightIcon from '@/assets/arrow.svg';
import gneuiSettingsIcon from '@/assets/genui_settings_icon.svg';
import { guideCodeMap } from '@/config';
import { LinkKey, linkMap } from '@/utils/link';
import HomeGuideCard from './HomeGuideCard.vue';
import HomeGuideStepMobile from './HomeGuideStepMobile.vue';
import { t } from '@/i18n';

const activeCard = ref(0);
const codeRef = ref<HTMLElement | null>(null);
const isMobile = ref(false);

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  updateIsMobile();
  window.addEventListener('resize', updateIsMobile);
  hightlight();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile);
  clearTimeout(copyFeedbackTimer);
});

hljs.registerLanguage('javascript', javascript);

function hightlight() {
  nextTick(() => {
    if (codeRef.value) {
      const codeArea = document.querySelector('.code-area');
      delete (codeArea as HTMLElement).dataset.highlighted;
      hljs.highlightElement(codeRef.value);
    }
  });
}

const handleGuideCardClick = (index: number) => {
  activeCard.value = index;
  hightlight();
};

const copyState = ref<'idle' | 'success' | 'fail'>('idle');
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

const copyLabel = computed(() => {
  if (copyState.value === 'success') {
    return t('guide.skill.copySuccess');
  }
  if (copyState.value === 'fail') {
    return t('guide.skill.copyFail');
  }
  return t('guide.skill.copyPrompt');
});

const copyText = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand('copy');
  document.body.removeChild(textarea);
  return succeeded;
};

const handleCopyPrompt = async () => {
  const text = t('guide.skill.prompt');
  let succeeded = false;

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard api unavailable');
    }
    await navigator.clipboard.writeText(text);
    succeeded = true;
  } catch {
    succeeded = copyText(text);
  } finally {
    copyState.value = succeeded ? 'success' : 'fail';

    clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = setTimeout(() => {
      copyState.value = 'idle';
    }, 500);
  }
};
</script>

<template>
  <section class="home-guide" :class="isMobile ? 'home-guide-mobile' : ''">
    <div class="home-guide-header">
      <div class="home-guide-header-title genui-title">{{ t('guide.title') }}</div>
      <div class="home-guide-header-subtitle genui-subtitle">
        {{ t('guide.subtitle') }}
      </div>
    </div>
    <div :class="isMobile ? 'home-guide-content-mobile' : 'home-guide-content'">
      <home-guide-step-mobile v-if="isMobile" @change="handleGuideCardClick"></home-guide-step-mobile>
      <div v-else class="home-guide-content-left">
        <home-guide-card
          :title="t('guide.step1.title')"
          :description="t('guide.step1.description')"
          :img="genuiChatIcon"
          :active="activeCard === 0"
          @click="handleGuideCardClick(0)"
        />
        <home-guide-card
          :title="t('guide.step2.title')"
          :description="t('guide.step2.description')"
          :img="genuiInusecon"
          :active="activeCard === 1"
          @click="handleGuideCardClick(1)"
        />
        <home-guide-card
          :title="t('guide.step3.title')"
          :description="t('guide.step3.description')"
          :img="gneuiSettingsIcon"
          :active="activeCard === 2"
          @click="handleGuideCardClick(2)"
        />
        <a :href="linkMap[LinkKey.ChatDoc]" target="_blank" rel="noopener noreferrer" class="btn-link">
          <tiny-button class="home-guide-content-left-button" size="medium" round>
            {{ t('guide.devDoc') }}
            <img :src="arrowRightIcon" alt="arrow-right" />
          </tiny-button>
        </a>
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
    <div class="home-guide-skill">
      <div class="home-guide-skill-header">
        <span class="home-guide-skill-header-icon"></span>
        <span class="home-guide-skill-header-title">{{ t('guide.skill.title') }}</span>
      </div>
      <div class="home-guide-skill-descript">{{ t('guide.skill.description') }}</div>
      <div class="home-guide-skill-content">
        <div class="home-guide-skill-prompt">{{ t('guide.skill.prompt') }}</div>
        <div class="home-guide-skill-copy" @click="handleCopyPrompt">
          <span
            class="home-guide-skill-copy-icon"
            :class="{ 'home-guide-skill-copy-icon--success': copyState === 'success' }"
          ></span>
          <span
            class="home-guide-skill-copy-icon home-guide-skill-copy-icon--success home-guide-skill-copy-icon--preload"
            aria-hidden="true"
          ></span>
          <span class="home-guide-skill-copy-text">{{ copyLabel }}</span>
        </div>
      </div>
    </div>
    
  </section>
</template>

<style lang="less" scoped>
.home-guide {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-content: center;
  padding: 110px 12.5% 0px 12.5%;
  @media (max-width: 1280px) {
    padding: 80px 10% 10px 10%;
  }

  @media (max-width: 768px) {
    padding: 40px 10% 10px 10%;
  }

  @media (min-width: 1920px) {
    padding: 110px 240px 10px 240px;
  }

  &-title {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;

    @media (max-width: 1280px) {
      &-subtitle {
        margin-bottom: 40px;
      }
    }
  }

  &-mobile {
    width: 100%;
    padding-left: 5%;
    padding-right: 5%;

    .home-guide-content-right {
      width: 100%;
      margin-left: 0;
    }
  }

  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    &-mobile {
      display: flex;
      flex-direction: column;
      gap: 30px;

      .home-guide-content-right {
        width: 100%;

        &-framework {
          height: 376px;
        }
      }
    }

    &-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0;
      &-button {
        margin-top: 24px;
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

    @media (max-width: 768px) {
      &-right {
        width: 490px;
      }
    }

    &-right {
      flex: 1;
      width: 1px;
      background: rgba(242, 242, 242, 1);
      border-radius: 24px;
      padding: 20px;
      margin-left: 10%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;

      &-framework {
        height: 360px;
        display: flex;
        flex-direction: column;
        background: linear-gradient(180, rgba(47, 47, 47, 1), rgba(19, 19, 19, 1) 100%);
        border-radius: 12px;
        overflow: hidden;

        .guide-code {
          flex: 1;
        }

        &-header {
          background: rgba(61, 61, 61, 1);
          border-radius: 12px 12px 0 0;
          height: 52px;
          padding-left: 28px;

          &-action {
            display: flex;
            align-items: center;
            height: 100%;
            gap: 10px;

            div {
              width: 14px;
              height: 14px;
              border-radius: 50%;
            }

            .header-action-close {
              background-color: rgba(254, 3, 4, 1);
            }

            .header-action-full {
              background-color: rgba(254, 199, 3, 1);
            }

            .header-action-exit {
              background-color: rgba(0, 207, 106, 1);
            }
          }
        }
      }

      @media (min-width: 1280px) {
        &-framework {
          height: 380px;
        }
      }

      @media (min-width: 1600px) {
        &-framework {
          height: 392px;
        }
      }

      @media (min-width: 1920px) {
        &-framework {
          height: 400px;
        }
      }

      @media (min-width: 2000px) {
        &-framework {
          height: 430px;
        }
      }
    }
  }

  &-skill {
    width: 100%;
    background-color: rgba(246, 246, 246, 1);
    margin-top: 60px;
    border-radius: 20px;
    padding: 40px;

    &-header {
      display: flex;
      align-items: center;

      &-icon {
        height: 40px;
        width: 40px;
        margin-right: 16px;
        background: url('@/assets/genui_skill_icon.svg');
      }
      
      &-title {
        font-size: 22px;
        font-weight: 700;
        line-height: 29px;
      }
    }

    &-descript {
      margin-top: 8px;
      margin-left: 56px;
      font-size: 16px;
      line-height: 24px;
      font-weight: 400;
      color: rgba(128, 128, 128, 1);
      letter-spacing: 0;
    }

    &-content {
      margin-top: 34px;
      width: 100%;
      padding: 20px 30px;
      background-color: #fff;
      border-radius: 12px;
    }

    &-prompt {
        font-size: 16px;
        line-height: 30px;
        font-weight: 400;
        color: rgba(25, 25, 25, 1)
      }
    
      &-copy {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: fit-content;
        margin-left: auto;
        width: 142px;
        height: 36px;
        border-radius: 62px;
        background-color: rgba(25, 25, 25, 1);
        cursor: pointer;


        &-icon {
          width: 16px;
          height: 16px;
          background: url('@/assets/copy.svg');

          &--success {
            background: url('@/assets/checkmark.svg');
          }

          &--preload {
            position: absolute;
            left: 0;
            top: 0;
            opacity: 0;
            pointer-events: none;
          }
        }

        &-text {
          font-size: 14px;
          font-weight: 400;
          line-height: 24px;
          color: #fff;
        }

      }
    
      @media (max-width: 768px) {
      margin-top: 16px;
      padding: 20px;
      
      &-content {
        padding: 20px;
      }
      &-header-title {
        font-size: 15px;
      }
      &-descript {
        text-align: justify;
        text-justify: inter-ideograph;
      }
      &-prompt {
        text-align: justify;
        text-justify: inter-ideograph;
      }
      &-copy {
        margin: 20px auto 0;
        width: 220px;
        height: 40px;
      }

      @media (max-width: 480px) {
        &-copy {
          width: 100%;
        }
        
      }
    }
  }

  @media (min-width: 1920px) {
    padding: 110px 240px 0px 240px;
  }
}

@media (max-width: 768px) {
  .home-guide-content-right-framework {
    border-radius: 6px;

    &-header {
      border-radius: 6px 6px 0 0;
    }
  }

  :deep(.guide-code) {
    font-size: 14px;
    border-radius: 0 0 6px 6px;

    &::-webkit-scrollbar-corner {
      border-bottom-right-radius: 6px;
    }
  }
}

:deep(.guide-code) {
  background: #0b1020;
  padding: 20px;
  margin: 0;
  overflow: auto;
  border-radius: 0 0 12px 12px;
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 16px;
  line-height: 1.6;
  color: #e5e7eb;

  &::-webkit-scrollbar {
    width: 10px; /* 纵向滚动条宽度 */
    height: 10px; /* 横向滚动条高度 */
  }

  &::-webkit-scrollbar-track {
    background: #0b1020;
  }

  &::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #adb5bd;
  }

  &::-webkit-scrollbar-corner {
    background: #0b1020;
    border-bottom-right-radius: 12px;
  }

  // TODO: 临时解决部署后代码阴影问题，后续更换更优雅方案
  code[class*='language-'] {
    text-shadow: none;
  }

  code.hljs {
    background: transparent;
    color: inherit;
    padding: 0;
  }

  ::selection {
    background: rgba(96, 165, 250, 0.35);
  }

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
