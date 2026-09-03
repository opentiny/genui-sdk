<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { TinyButton, TinyButtonGroup, TinyTooltip } from '@opentiny/vue';
import { GenuiRenderer, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';
import { IconAi, IconUser } from '@opentiny/tiny-robot-svgs';
import { IconArrowRight, IconPause, IconRefresh, IconStartCircle } from '@opentiny/vue-icon';
import { LinkKey, linkMap } from '@/utils/link';
import { useMobile } from '@/composables/useMobile';
import { splitJsonIntoChunks } from '@/utils/jsonUtil';
import caculatorJson from '@/static/caculator.json';
import todoJson from '@/static/todo.json';
import todoJsonEn from '@/static/todo.en.json';
import coinGameJson from '@/static/coin-game.json';
import coinGameJsonEn from '@/static/coin-game.en.json';
import { t, locale } from '@/i18n';
import calculatorIcon from '@/assets/calculator.svg'
import todoIcon from '@/assets/todo.svg'
import playIcon from '@/assets/play.svg' 

const TinyIconArrowRight = IconArrowRight();
const TinyIconPause = IconPause();
const TinyIconRefresh = IconRefresh();
const TinyIconStartCircle = IconStartCircle();

const message = ref<{ role: 'assistant'; content: string } | null>(null);
const extendSelect = ref('element');
const generating = ref(false);
const streamCompleted = ref(false);
const hasPlayedOnce = ref(false);
const preparingPlayback = ref(false);
const userRowVisible = ref(true);
const aiAvatarVisible = ref(true);
const cardVisible = ref(true);
const suppressExitAnimation = ref(false);
const rendererKey = ref(0);
const { isMobile } = useMobile();
let streamGeneration = 0;
let pauseRequested = false;
let resumeChunkIndex = 0;
let revealCardOnFirstChunk = false;

const messageContentMap = {
  element: t('extend.prompt.element'),
  page: t('extend.prompt.page'),
  coin: t('extend.prompt.coin'),
};
const bubbleContentMap = {
  element: t('extend.prompt.elementBubble'),
  page: t('extend.prompt.pageBubble'),
  coin: t('extend.prompt.coinBubble'),
};
const inputMessage = computed(
  () => `?input-message=${messageContentMap[extendSelect.value as keyof typeof messageContentMap]}`,
);

/** 首次播放按钮居中展示；生成中 / 暂停 / 播放过后的重放均固定右下角，避免遮挡内容 */
const streamControlsDocked = computed(
  () => generating.value || preparingPlayback.value || !streamCompleted.value || hasPlayedOnce.value,
);

const userBubbleContent = computed(
  () => bubbleContentMap[extendSelect.value as keyof typeof bubbleContentMap],
);

const getJsonData = (type: string) => {
  if (type === 'element') {
    return caculatorJson;
  }
  if (type === 'coin') {
    return locale.value === 'en_US' ? coinGameJsonEn : coinGameJson;
  }
  return locale.value === 'en_US' ? todoJsonEn : todoJson;
};

const bumpStreamGeneration = () => {
  streamGeneration += 1;
};

const resetReplayVisualState = () => {
  suppressExitAnimation.value = true;
  userRowVisible.value = false;
  aiAvatarVisible.value = false;
  cardVisible.value = false;
  message.value = {
    role: 'assistant',
    content: '',
  };
};

const getFullSchemaContent = (type: string) => {
  const chunkSize = type === 'element' ? 30 : 20;
  return splitJsonIntoChunks(getJsonData(type), chunkSize).join('');
};

const resetToCompletedFrame = (type: string) => {
  bumpStreamGeneration();
  rendererKey.value += 1;
  pauseRequested = false;
  resumeChunkIndex = 0;
  revealCardOnFirstChunk = false;
  generating.value = false;
  streamCompleted.value = true;
  hasPlayedOnce.value = false;
  preparingPlayback.value = false;
  suppressExitAnimation.value = false;
  userRowVisible.value = true;
  aiAvatarVisible.value = true;
  cardVisible.value = true;
  message.value = {
    role: 'assistant',
    content: getFullSchemaContent(type),
  };
};

const handleExtendClick = (value: string) => {
  extendSelect.value = value;
  resetToCompletedFrame(value);
};

const customActions = {
  saveState: {
    execute: () => {
      // do nothing
    },
  },
};

const runChunkStreaming = async (startIndex: number, accumulatedContent: string) => {
  const myGen = streamGeneration;
  pauseRequested = false;
  generating.value = true;
  streamCompleted.value = false;

  if (!message.value) {
    message.value = {
      role: 'assistant',
      content: '',
    };
  }

  const currentType = extendSelect.value;
  const chunkSize = extendSelect.value === 'element' ? 30 : 20;

  try {
    const jsonData = getJsonData(currentType);
    const chunks = splitJsonIntoChunks(jsonData, chunkSize);
    let accumulated = accumulatedContent;

    for (let i = startIndex; i < chunks.length; i++) {
      if (myGen !== streamGeneration) {
        generating.value = false;
        return;
      }

      if (pauseRequested) {
        resumeChunkIndex = i;
        if (message.value) {
          message.value.content = accumulated;
        }
        generating.value = false;
        return;
      }

      accumulated += chunks[i];
      if (message.value) {
        message.value.content = accumulated;
      }

      if (revealCardOnFirstChunk && accumulated.length > 0) {
        cardVisible.value = true;
        revealCardOnFirstChunk = false;
      }

      if (i === chunks.length - 1) {
        generating.value = false;
        streamCompleted.value = true;
        hasPlayedOnce.value = true;
        resumeChunkIndex = 0;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      if (myGen !== streamGeneration) {
        generating.value = false;
        return;
      }

      if (pauseRequested) {
        resumeChunkIndex = i + 1;
        if (message.value) {
          message.value.content = accumulated;
        }
        generating.value = false;
        return;
      }
    }
  } catch (error) {
    console.error('Error loading JSON:', error);
    generating.value = false;
  }
};

const handleCornerPause = () => {
  pauseRequested = true;
};

const handleCornerResume = () => {
  runChunkStreaming(resumeChunkIndex, message.value?.content ?? '');
};

const handleCornerReplay = () => {
  if (preparingPlayback.value) return;
  bumpStreamGeneration();
  rendererKey.value += 1;
  const myGen = streamGeneration;
  pauseRequested = false;
  resumeChunkIndex = 0;
  revealCardOnFirstChunk = false;
  preparingPlayback.value = true;
  generating.value = false;
  resetReplayVisualState();
  setTimeout(() => {
    if (myGen !== streamGeneration) return;
    suppressExitAnimation.value = false;
    userRowVisible.value = true;
  }, 100);
  setTimeout(() => {
    if (myGen !== streamGeneration) return;
    aiAvatarVisible.value = true;
  }, 500);
  setTimeout(() => {
    if (myGen !== streamGeneration) return;
    revealCardOnFirstChunk = true;
    streamCompleted.value = false;
    preparingPlayback.value = false;
    runChunkStreaming(0, '');
  }, 700);
};

watch(isMobile, (mobile) => {
  if (mobile && (extendSelect.value === 'page' || extendSelect.value === 'coin')) {
    handleExtendClick('element');
  }
});

onMounted(() => {
  resetToCompletedFrame(extendSelect.value);
});

onUnmounted(() => {
  bumpStreamGeneration();
});
</script>

<template>
  <section class="home-extend">
    <div class="home-extend-title genui-title">{{ t('extend.title') }}</div>
    <tiny-button-group
      class="extend-button-group"
      :class="{ 'extend-button-group--mobile': isMobile }"
      v-model="extendSelect"
    >
      <tiny-button
        class="extend-button extend-button-element-1"
        :class="{ 'extend-button-element-active': extendSelect === 'element' }"
        :reset-time="0"
        value="element"
        @click="handleExtendClick('element')"
      >
        <img class="extend-button-icon" :src="calculatorIcon" alt="" />
        {{ t('extend.calculator') }}
      </tiny-button>
      <tiny-button
        v-if="!isMobile"
        class="extend-button extend-button-element-2"
        :reset-time="0"
        :class="{ 'extend-button-element-active': extendSelect === 'page' }"
        value="page"
        @click="handleExtendClick('page')"
      >
        <img class="extend-button-icon" :src="todoIcon" alt="" />
        {{ t('extend.todoApp') }}
      </tiny-button>
      <tiny-button
        v-if="!isMobile"
        class="extend-button extend-button-element-3"
        :reset-time="0"
        :class="{ 'extend-button-element-active': extendSelect === 'coin' }"
        value="coin"
        @click="handleExtendClick('coin')"
      >
        {{ t('extend.coinGame') }}
      </tiny-button>
    </tiny-button-group>
    <div class="home-extend-schema">
      <div class="home-extend-schema-header">
        <div class="home-extend-schema-header-action">
          <div class="home-extend-schema-header-action-close"></div>
          <div class="home-extend-schema-header-action-full"></div>
          <div class="home-extend-schema-header-action-exit"></div>
        </div>
        <a
          v-if="linkMap[LinkKey.Playground]"
          class="home-extend-schema-header-subtitle is-link"
          :href="linkMap[LinkKey.Playground] + inputMessage"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>{{ t('extend.tryPlayground') }}</span>
          <tiny-icon-arrow-right />
        </a>
      </div>
      <div class="home-extend-schema-content">
        <div class="home-extend-schema-content-scroll">
          <div class="home-extend-schema-content-inner">
            <div class="home-extend-chat-mock">
              <div
                class="home-extend-user-row"
                :class="{ 'is-visible': userRowVisible, 'no-exit': suppressExitAnimation }"
              >
                <div class="home-extend-user-bubble">{{ userBubbleContent }}</div>
                <div class="home-extend-avatar home-extend-avatar-user">
                  <IconUser class="home-extend-avatar-icon" />
                </div>
              </div>
              <div class="home-extend-ai-row">
                <div
                  class="home-extend-avatar home-extend-avatar-ai"
                  :class="{ 'is-visible': aiAvatarVisible, 'no-exit': suppressExitAnimation }"
                >
                  <IconAi class="home-extend-avatar-icon" />
                </div>
                <div
                  class="home-extend-render-area"
                  :class="{ 'is-visible': cardVisible, 'no-exit': suppressExitAnimation }"
                >
                  <GenuiConfigProvider :materials="materials">
                    <GenuiRenderer
                      :key="rendererKey"
                      class="home-extend-schema-renderer"
                      :content="message?.content || ''"
                      :generating="generating"
                      :customActions="customActions"
                    />
                  </GenuiConfigProvider>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="home-extend-stream-controls"
          :class="{ 'home-extend-stream-controls--docked': streamControlsDocked }"
          :aria-label="t('extend.replayControls')"
        >
          <div class="home-extend-stream-controls-surface">
            <tiny-tooltip v-if="generating" :content="t('extend.pause')" placement="top" effect="light">
              <tiny-button
                class="home-extend-control-btn"
                circle
                :reset-time="0"
                :size="streamControlsDocked ? 'medium' : 'large'"
                :icon="TinyIconPause"
                @click="handleCornerPause"
              />
            </tiny-tooltip>
            <tiny-tooltip v-else-if="!streamCompleted" :content="t('extend.resume')" placement="top" effect="light">
              <tiny-button
                class="home-extend-control-btn"
                circle
                :reset-time="0"
                :size="streamControlsDocked ? 'medium' : 'large'"
                @click="handleCornerResume">
                <img :src="playIcon" alt="">
              </tiny-button>
            </tiny-tooltip>
            <tiny-tooltip
              v-else
              :content="
                preparingPlayback ? t('extend.preparing') : hasPlayedOnce ? t('extend.replay') : t('extend.play')
              "
              placement="top"
              effect="light"
            >
              <tiny-button
                class="home-extend-control-btn"
                circle
                :reset-time="0"
                :size="streamControlsDocked ? 'medium' : 'large'"
                :icon="hasPlayedOnce ? TinyIconRefresh : undefined"
                :disabled="preparingPlayback"
                @click="handleCornerReplay"
                >
                <img v-if="!hasPlayedOnce" :src="playIcon" alt="">
              </tiny-button>
            </tiny-tooltip>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.home-extend {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0px 8%;
  background-image: url('@/assets/home_extend_bg.svg');

  &-title {
    margin-bottom: 40px;
  }

  &-schema {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    // background: linear-gradient(180deg, rgba(232, 238, 254, 1), rgba(232, 238, 254, 0.3) 100%);
    border-radius: 20px;
    border: 1px solid #fff;
    box-shadow: 0 0 60px 0 rgba(217, 223, 255, 0.5);


    padding: 28px;
    margin-bottom: 110px;

    &-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;

      &-action {
        display: flex;
        gap: 14px;
        margin-left: 28px;

        div {
          width: 14px;
          height: 14px;
          border-radius: 50%;

          @media (min-width: 1920px) {
            width: 16px;
            height: 16px;
          }
        }

        &-close {
          background-color: rgba(254, 3, 4, 1);
        }

        &-full {
          background-color: rgba(254, 199, 3, 1);
        }

        &-exit {
          background-color: rgba(0, 207, 106, 1);
        }
      }

      &-subtitle {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(20, 118, 255, 1);
        cursor: pointer;
        font-size: 16px;
        &.is-link {
          text-decoration: none;
        }

        svg {
          fill: rgba(20, 118, 255, 1);
        }
      }
    }

    &-content {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 560px;
      height: 590px;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-sizing: border-box;
      container-type: size;
      container-name: extend-stream;
    }

    &-content-scroll {
      flex: 1 1 0;
      min-height: 0;
      width: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      box-sizing: border-box;
      scrollbar-gutter: stable;
      border-bottom-right-radius: 12px;
    }

    &-content-inner {
      padding: 5% 5%;
      box-sizing: border-box;
      position: relative;
      width: 100%;
      @media (max-width: 768px) {
        padding: 20px;
      }
    }

    @media (min-width: 1280px) {
      &-content {
        min-height: 640px;
        height: 720px;
      }
    }
  }
  @media (max-width: 768px) {
    &-schema {
      padding: 5%;
    }
  }

  @media (min-width: 1920px) {
    padding: 0px 240px;

    &-title {
      margin-bottom: 60px;
    }
  }
}

.home-extend-chat-mock {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.home-extend-user-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 16px;
  width: 100%;
}

.home-extend-user-row,
.home-extend-avatar-ai,
.home-extend-render-area {
  opacity: 0;
  transform: translateY(80px);
  transition:
    opacity 420ms ease,
    transform 420ms ease;

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  &.no-exit:not(.is-visible) {
    transition: none;
  }
}

.home-extend-user-bubble {
  max-width: min(92%, 720px);
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(232, 238, 254, 1);
  font-size: 14px;
  line-height: 1.5;
  color: rgba(25, 25, 25, 1);
  word-break: break-word;
  white-space: pre-wrap;
  border-top-right-radius: 0;
  margin-top: 8px;
}

.home-extend-ai-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 16px;
  width: 100%;
}

.home-extend-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-extend-avatar-icon {
  font-size: 40px;
}

.home-extend-render-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  border-bottom-right-radius: 12px;
  overflow: hidden;

  :deep(div.schema-render-container) {
    max-width: 100%;
    border-bottom-right-radius: 12px;
    overflow: hidden;
  }
}

.home-extend-stream-controls {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;

  &-surface {
    position: absolute;
    left: 50%;
    top: 50%;
    width: max-content;
    pointer-events: auto;
    will-change: transform;
    transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
    transform: translate(-50%, -50%);
  }

  &--docked &-surface {
    transform: translate(calc(50cqw - 24px - 100%), calc(50cqh - 16px - 100%));
  }

  @media (prefers-reduced-motion: reduce) {
    &-surface {
      transition-duration: 0.01ms;
    }
  }
}

.home-extend-control-btn {
  border: none;
  box-shadow: 0 2px 4px #00000029;
}

.extend-button-group {
  // border-radius: 382px;
  width: fit-content;
  height: 56px;
  // background-color: rgba(232, 238, 254, 1);
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 4px;
  margin-bottom: 48px;

  .extend-button {
    height: 100%;
    width: 200px;
    margin-left: 0;
    border: none;
    background-color: transparent;
    font-size: 20px;
    font-weight: 400;
    color: rgba(89, 89, 89, 1);

    &-element-1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .extend-button-icon {
      width: 24px;
      height: 24px;
    }

    &-element-2 {
      border-radius: 0;
    }

    &-element-3 {
      // border-radius: 0 382px 382px 0;
    }

    &-element-active {
      border-radius: 73px;
      background-color: #fff;
      box-shadow: 0 0 20px 0 rgba(207, 218, 228, 0.36);
      font-weight: 500;
      color: rgba(25, 25, 25, 1)
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
}

@media (max-width: 768px) {
  .home-extend-avatar-user,
  .home-extend-avatar-ai {
    display: none;
  }
  .home-extend-schema-content {
    border-radius: 6px;
  }
}
</style>
