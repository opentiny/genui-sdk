<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, computed } from 'vue';
import { TinyButton, TinyButtonGroup, TinyTooltip } from '@opentiny/vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import { IconArrowRight, IconRefresh } from '@opentiny/vue-icon';
import genuiGuideDefault from '@/assets/genui_guide_default.svg';
import { LinkKey, linkMap } from '@/utils/link';
import { splitJsonIntoChunks } from '@/utils/jsonUtil';
import caculatorJson from '@/static/caculator.json';
import todoJson from '@/static/todo.json';

interface IUserMessage {
  role: 'user';
  content: string;
  customMessage?: string;
}

interface IAssistantMessage {
  role: 'assistant';
  content: string;
}

type IMessage = IUserMessage | IAssistantMessage;

const TinyIconArrowRight = IconArrowRight();
const TinyIconRefresh = IconRefresh();

const message = ref<IMessage | null>(null);
const extendSelect = ref('element');
const generating = ref(false);
const schemaRendererRef = ref<HTMLElement | null>(null);
const hasStartedStreaming = ref(false);
let shouldStopStreaming = false;

const messageContentMap = {
  element: '生成一个计算器，不要用button，使用div，马卡龙配色，不要使用TinyLayout，要好看的',
  page: '创建一个待办应用，界面要丰富，把想到的功能尽量加进去',
};
const inputMessage = computed(
  () => `?input-message=${messageContentMap[extendSelect.value as keyof typeof messageContentMap]}`,
);

const getJsonData = (type: string) => {
  return type === 'element' ? caculatorJson : todoJson;
};

const initCodeAreaHeight = () => {
  nextTick(() => {
    const height = document.querySelector(
      '.home-extend-schema-renderer'
    )?.clientHeight;
    const codeArea = document.querySelector('.home-extend-schema-code');
    if (height && codeArea) {
      (codeArea as HTMLElement).style.height = `${height}px`;
    }
  });
};

const handleRefresh = () => {
  handleExtendClick(extendSelect.value);
};

const handleExtendClick = (value: string) => {
  if (generating.value) {
    shouldStopStreaming = true;
  }

  extendSelect.value = value;
  hasStartedStreaming.value = false;

  message.value = {
    role: 'assistant',
    content: '',
  };

  setTimeout(() => {
    loadChunksStreaming();
  }, 100);
};

const customActions = {
  saveState: {
    execute: () => {
      // do nothing
    },
  },
};

const initMessage = () => {
  generating.value = false;
  hasStartedStreaming.value = false;
  shouldStopStreaming = false;
};

const loadChunksStreaming = async () => {
  if (hasStartedStreaming.value) return;
  hasStartedStreaming.value = true;

  generating.value = true;
  let accumulatedContent = '';

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

    if (shouldStopStreaming) {
      initMessage();
      return;
    }

    const chunks = splitJsonIntoChunks(jsonData, chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      if (shouldStopStreaming && message.value?.content) {
        initMessage();
        return;
      }

      accumulatedContent += chunks[i];
      initCodeAreaHeight();

      if (message.value) {
        message.value.content = accumulatedContent;
      }

      if (i === chunks.length - 1) {
        generating.value = false;
        shouldStopStreaming = false;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 50));

        if (shouldStopStreaming) {
          initMessage();
          return;
        }
      }
    }
  } catch (error) {
    if (!shouldStopStreaming) {
      console.error('Error loading JSON:', error);
    }
    generating.value = false;
    hasStartedStreaming.value = false;
    shouldStopStreaming = false;
  }
};

let observer: IntersectionObserver | null = null;

onMounted(() => {
  message.value = {
    role: 'assistant',
    content: '',
  };

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasStartedStreaming.value) {
          loadChunksStreaming();
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  setTimeout(() => {
    if (schemaRendererRef.value) {
      observer?.observe(schemaRendererRef.value);
    }
  }, 100);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <section class="home-extend">
    <div class="home-extend-title genui-title">解锁更多玩法</div>
    <tiny-button-group class="extend-button-group" v-model="extendSelect">
      <tiny-button
        class="extend-button extend-button-element-1"
        :class="{ 'extend-button-element-active': extendSelect === 'element' }"
        value="element"
        @click="handleExtendClick('element')"
        >计算器</tiny-button
      >
      <tiny-button
        class="extend-button extend-button-element-2"
        :class="{ 'extend-button-element-active': extendSelect === 'page' }"
        value="page"
        @click="handleExtendClick('page')"
        >Todo应用</tiny-button
      >
    </tiny-button-group>
    <div class="home-extend-schema" ref="schemaRendererRef">
      <div class="home-extend-schema-header">
        <div class="home-extend-schema-header-action">
          <div class="home-extend-schema-header-action-close"></div>
          <div class="home-extend-schema-header-action-full"></div>
          <div class="home-extend-schema-header-action-exit"></div>
        </div>
        <a
          class="home-extend-schema-header-subtitle is-link"
          :href="linkMap[LinkKey.Playground] + inputMessage"
          target="_blank"
        >
          <span>进入 Playground</span>
          <tiny-icon-arrow-right />
        </a>
      </div>
      <div class="home-extend-schema-content">
        <div class="home-extend-schema-renderer-container">
          <GenuiRenderer
            v-if="message && message.content"
            class="home-extend-schema-renderer"
            :content="message.content"
            :generating="generating"
            :customActions="customActions"
          />
          <img v-else :src="genuiGuideDefault" alt="genui-guide-default" />
          <tiny-tooltip content="重新播放" placement="top" effect="light">
            <tiny-button
              class="refresh-button"
              circle
              size="medium"
              :icon="TinyIconRefresh"
              @click="handleRefresh"
            ></tiny-button>
          </tiny-tooltip>
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

  &-title {
    margin-bottom: 40px;
  }

  &-schema {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(
      180deg,
      rgba(232, 238, 254, 1),
      rgba(232, 238, 254, 0.3) 100%
    );
    border-radius: 24px;
    padding: 28px;

    &-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;

      &-action {
        display: flex;
        gap: 12px;

        div {
          width: 16px;
          height: 16px;
          border-radius: 50%;

          @media (min-width: 1920px) {
            width: 20px;
            height: 20px;
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
        &.is-link {
          text-decoration: none;
        }

        svg {
          fill: rgba(20, 118, 255, 1);
        }
      }
    }

    &-content {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 500px;
      background: #fff;
      border-radius: 12px;
      padding: 5% 5%;
      overflow: auto;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    @media (min-width: 1280px) {
      &-content {
        height: 575px;
      }
    }

    &-renderer {
      &-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
    }

    &-code {
      height: 400px;
      width: 50%;
      overflow-y: auto;
      margin-left: 3%;

      code {
        white-space: pre-wrap;
        word-wrap: break-word;
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

.refresh-button {
  position: absolute;
  right: calc(4%);
  bottom: calc(8% + 18px);
  box-shadow: 0 2px 4px #00000029;
}

.extend-button-group {
  border-radius: 382px;
  width: fit-content;
  height: 56px;
  background-color: rgba(232, 238, 254, 1);
  display: flex;
  align-items: center;
  padding: 4px;
  margin-bottom: 48px;

  .extend-button {
    height: 100%;
    width: 200px;
    margin-left: 0;
    border-radius: 0;
    border: none;
    background-color: rgba(232, 238, 254, 1);

    &-element-1 {
      border-radius: 382px;
    }

    &-element-2 {
      border-radius: 382px;
    }

    &-element-active {
      background-color: #fff;
      font-weight: 700;
    }
  }

  @media (max-width: 768px) {
    .extend-button {
      width: 98px;
      font-size: 18px;
    }
  }
}
</style>
