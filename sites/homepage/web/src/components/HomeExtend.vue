<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { TinyButton, TinyButtonGroup } from "@opentiny/vue";
import { SchemaRenderer } from "@opentiny/genui-sdk-vue";
import { IconArrowRight, IconRefresh } from "@opentiny/vue-icon";
import genuiGuideDefault from "@/assets/genui_guide_default.svg";
import { LinkKey, openLink } from "@/utils/link";
import { splitJsonIntoChunks } from "@/utils/jsonUtil";

// 注册 JSON 语言（如果尚未注册）
if (!hljs.getLanguage("json")) {
  hljs.registerLanguage("json", json);
}

interface IUserMessage {
  role: "user";
  content: string;
  customMessage?: string;
}

interface IAssistantMessage {
  role: "assistant";
  content: string;
}

type IMessage = IUserMessage | IAssistantMessage;

const TinyIconArrowRight = IconArrowRight();
const TinyIconRefresh = IconRefresh();

const message = ref<IMessage | null>(null);
const extendSelect = ref("element");
const generating = ref(false);
const schemaRendererRef = ref<HTMLElement | null>(null);
const hasStartedStreaming = ref(false);
const codeRef = ref<HTMLElement | null>(null);
// 用于控制流式加载的取消标志
let shouldStopStreaming = false;

// 获取 JSON 文件路径
const getJsonPath = (type: string): string => {
  const fileName = type === "element" ? "caculator.json" : "todo.json";

  if (import.meta.env.DEV) {
    return `../static/${fileName}`;
  } else {
    try {
      const baseUrl = new URL(import.meta.url);
      const staticBaseUrl = new URL("./static/", baseUrl);
      const jsonUrl = new URL(fileName, staticBaseUrl);
      return jsonUrl.href;
    } catch (error) {
      return `./static/${fileName}`;
    }
  }
};

const initCodeAreaHeight = () => {
  nextTick(() => {
    const height = document.querySelector(
      ".home-extend-schema-renderer"
    )?.clientHeight;
    const codeArea = document.querySelector(".home-extend-schema-code");
    if (height && codeArea) {
      (codeArea as HTMLElement).style.height = `${height}px`;
    }
  });
};

const handleRefresh = () => {
  handleExtendClick(extendSelect.value);
};

const handleExtendClick = (value: string) => {
  // 停止当前的流式加载
  if (generating.value) {
    shouldStopStreaming = true;
  }

  // 重置状态
  extendSelect.value = value;
  hasStartedStreaming.value = false;

  message.value = {
    role: "assistant",
    content: "",
  };

  setTimeout(() => {
    // 触发新的流式加载
    loadChunksStreaming();
  }, 100);
};

const handleAction = ({
  llmFriendlyMessage,
  humanFriendlyMessage,
}: {
  llmFriendlyMessage: string;
  humanFriendlyMessage: string;
}) => {
  // 处理按钮点击事件
  console.log("Action:", { llmFriendlyMessage, humanFriendlyMessage });
};

// 格式化 JSON 内容用于显示
const formattedJsonContent = computed(() => {
  if (!message.value?.content) return "";

  try {
    // 尝试解析 JSON，如果成功则格式化
    const parsed = JSON.parse(message.value.content);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    // 如果 JSON 不完整（流式渲染中），直接返回原始内容
    return message.value.content;
  }
});

const initMessage = () => {
  generating.value = false;
  hasStartedStreaming.value = false;
  shouldStopStreaming = false;
};

// 流式加载并处理 JSON 分块
const loadChunksStreaming = async () => {
  if (hasStartedStreaming.value) return;
  hasStartedStreaming.value = true;

  generating.value = true;
  let accumulatedContent = "";

  // 初始化 message
  if (!message.value) {
    message.value = {
      role: "assistant",
      content: "",
    };
  }

  // 根据当前选择的应用类型确定 JSON 文件路径
  const currentType = extendSelect.value;
  const totalChunks = 150;

  try {
    // 读取完整的 JSON 文件
    const jsonPath = getJsonPath(currentType);
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to load JSON file: ${response.statusText}`);
    }
    const jsonContent = await response.text();
    const jsonData = JSON.parse(jsonContent);

    // 检查是否需要停止（在解析之后）
    if (shouldStopStreaming) {
      initMessage();
      return;
    }

    // 将 JSON 分块处理
    const chunks = splitJsonIntoChunks(jsonData, totalChunks);

    // 流式输出每个 chunk
    for (let i = 0; i < chunks.length; i++) {
      // 检查是否需要停止加载
      if (shouldStopStreaming && message.value?.content) {
        initMessage();
        return;
      }

      // 拼接内容
      accumulatedContent += chunks[i];
      initCodeAreaHeight();

      // 更新 message content
      if (message.value) {
        message.value.content = accumulatedContent;
      }

      // 最后一个 chunk 后，设置 generating 为 false
      if (i === chunks.length - 1) {
        generating.value = false;
        shouldStopStreaming = false;

        nextTick(() => {
          // 使用 highlight.js 更新代码高亮
          if (codeRef.value) {
            hljs.highlightElement(codeRef.value);
          }
        });
      } else {
        // 延时 50ms 输出下一个 chunk
        await new Promise((resolve) => setTimeout(resolve, 50));

        // 在延时后再次检查是否需要停止
        if (shouldStopStreaming) {
          initMessage();
          return;
        }
      }
    }
  } catch (error) {
    // 只有在不是主动停止的情况下才记录错误
    if (!shouldStopStreaming) {
      console.error("Error loading JSON:", error);
    }
    generating.value = false;
    hasStartedStreaming.value = false;
    shouldStopStreaming = false;
  }
};

// 使用 Intersection Observer 检测 SchemaRenderer 是否在视口中
let observer: IntersectionObserver | null = null;

onMounted(() => {
  // 初始化 message 为空，等待流式加载
  message.value = {
    role: "assistant",
    content: "",
  };

  // 创建 Intersection Observer
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasStartedStreaming.value) {
          // 当 SchemaRenderer 进入视口时，开始流式加载
          loadChunksStreaming();
        }
      });
    },
    {
      threshold: 0.1, // 当 10% 的元素可见时触发
    }
  );

  // 等待 DOM 更新后观察元素
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
        <div
          class="home-extend-schema-header-subtitle"
          @click="openLink(LinkKey.Playground)"
        >
          <span>进入 Playground</span>
          <tiny-icon-arrow-right />
        </div>
      </div>
      <div class="home-extend-schema-content">
        <div class="home-extend-schema-renderer-container">
          <SchemaRenderer
            v-if="message && message.content"
            class="home-extend-schema-renderer"
            :content="message.content"
            :generating="generating"
            :onAction="handleAction"
            @saveState="() => {}"
          />
          <img v-else :src="genuiGuideDefault" alt="genui-guide-default" />
          <tiny-button
            class="refresh-button"
            circle
            size="medium"
            :icon="TinyIconRefresh"
            @click="handleRefresh"
          ></tiny-button>
        </div>
      </div>
    </div>
  </section>
</template>
<style lang="less" scoped>
@import "../style/index.less";

.home-extend {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px 8% 0px 8%;

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
    padding: 3%;

    &-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 26px;

      &-action {
        display: flex;
        gap: 16px;

        &-close {
          width: 16px;
          height: 16px;
          background-color: rgba(254, 3, 4, 1);
          border-radius: 50%;
        }

        &-full {
          width: 16px;
          height: 16px;
          background-color: rgba(254, 199, 3, 1);
          border-radius: 50%;
        }

        &-exit {
          width: 16px;
          height: 16px;
          background-color: rgba(0, 207, 106, 1);
          border-radius: 50%;
        }
      }

      &-subtitle {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(20, 118, 255, 1);
        cursor: pointer;

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
    }

    &-renderer {
      &-container {
        display: flex;
        flex-direction: column;
        width: 100%;
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
}

.refresh-button {
  position: absolute;
  right: calc(4%);
  bottom: calc(5% + 18px);
  box-shadow: 0 2px 4px #00000029;
}

.extend-button-group {
  border-radius: 382px;
  width: fit-content;
  height: 56px;
  background-color: rgba(243, 243, 244, 1);
  display: flex;
  align-items: center;
  padding: 4px;
  margin-bottom: 60px;

  .extend-button {
    height: 100%;
    width: 200px;
    margin-left: 0;
    border-radius: 0;
    border: none;
    background-color: rgba(243, 243, 244, 1);

    &-element-1 {
      border-radius: 382px;
    }

    &-element-2 {
      border-radius: 382px;
    }

    &-element-active {
      background-color: #fff;
    }
  }

  @media (max-width: 768px) {
    .extend-button {
      width: 80px;
    }
  }
}

/deep/ .extend-code-content {
  background: #ffffff !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: auto !important;
  max-height: 100%;

  /* highlight.js 样式 */
  .hljs {
    display: block;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5em;
    color: rgb(25, 25, 25);
    background: #ffffff;
  }

  .hljs-attr {
    color: rgb(0, 0, 255);
  }

  .hljs-string {
    color: rgb(148, 43, 41);
  }

  .hljs-number {
    color: rgb(5, 129, 4);
  }

  .hljs-literal {
    color: rgb(5, 129, 4);
  }

  .hljs-keyword {
    color: rgb(0, 0, 255);
  }

  .hljs-punctuation {
    color: rgb(25, 25, 25);
  }

  .hljs-operator {
    color: rgb(25, 25, 25);
  }

  .hljs-built_in {
    color: rgb(5, 129, 4);
  }
}
</style>
