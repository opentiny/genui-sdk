<script setup>
import { TinyTabs, TinyTabItem, TinyButtonGroup } from '@opentiny/vue';
import { iconPlus } from '@opentiny/vue-icon';
import { IconAi } from '@opentiny/tiny-robot-svgs';
import { GenuiConfigProvider, GenuiChat, GENUI_RENDERER } from '@opentiny/genui-sdk-vue';
import { ref, watch, onMounted, reactive, computed, onUnmounted, provide, defineAsyncComponent } from 'vue';
import { customComponents, customExamples } from './custom-components';
import { getModelFeatures, getModelOptions } from './api';
import { createCustomFetch } from './api/custom-fetch';
import NewSvg from './assets/images/new.svg?raw';
import OpenSvg from './assets/images/open.svg?raw';
import CloseSvg from './assets/images/close.svg?raw';
import AssistantFooter from './components/AssistantFooter.vue';
import UserFooter from './components/UserFooter.vue';
import RenderFooter from './components/RenderFooter.vue';
import ThinkComponent from './components/ThinkComponent.vue';
import ModelConfig from './components/tab-components/model-config.vue';
import McpTools from './components/tab-components/mcpTools.vue';
import GenuiHistory from './components/tab-components/GenuiHistory.vue';

let framework = 'Vue'; // Angular

/**
 * tiny-schema-renderer-ng
 */

if (location.search.includes('framework=angular')) {
  const SchemaRendererNgAdapter = defineAsyncComponent(() =>
    import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
  );
  provide(GENUI_RENDERER, SchemaRendererNgAdapter);
  framework = 'Angular';
}

const activeName = ref('model');
const TinyIconPlus = iconPlus();

const STORAGE_KEY = 'GENUI_SDK_VUE_PLAYGROUND_CONFIG';
const {
  llmConfig: cacheLLmConfig,
  theme: cacheTheme,
  chatConfig: cacheChatConfig,
} = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const isOpen = ref(true);
const llmConfig = reactive(
  cacheLLmConfig || {
    temperature: 0.5,
    model: 'qwen3-coder-30b-a3b-instruct',
    mcpServers: [],
    promptList: [],
  },
);

const chatConfig = reactive(
  cacheChatConfig || {
    addToolCallContext: false,
    showThinkingResult: false,
  },
);

const modelData = ref([]);
const modelFeatures = ref({});
const theme = ref(cacheTheme || 'light');



watch(
  [() => theme.value, () => llmConfig, () => chatConfig],
  async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: theme.value,
        llmConfig,
        chatConfig,
      }),
    );
    modelFeatures.value = await getModelFeatures(llmConfig.model);
  },
  { deep: true },
);
const themeData = ref([
  { text: '默认', value: 'light' },
  { text: '暗黑', value: 'dark' },
  { text: '清新', value: 'lite' },
]);

const messages = ref([]);

const url = import.meta.env.VITE_CHAT_URL;

const chat = ref(null);
const conversation = computed(() => chat.value?.getConversation());

const handleKeydown = (event) => {
  // Windows/Linux (Ctrl+K) 和 macOS (Command+K)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    chat.value.handleNewConversation();
  }
};

onMounted(() => {
  getModelOptions()
    .then(async (data) => {
      if (!data.find((item) => item.value === llmConfig.model)) {
        llmConfig.model = data[0]?.value;
      }
      modelData.value = data;
      modelFeatures.value = await getModelFeatures(llmConfig.model);
    })
    .catch((error) => {
      console.error('获取模型列表失败:', error);
    });
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const roles = {
  assistant: {
    slots: {
      trailer: AssistantFooter,
    },
  },
  user: {
    slots: {
      trailer: UserFooter,
    },
  },
};

const customFetch = createCustomFetch(() => ({
  ...llmConfig,
  framework,
}));
</script>

<template>
  <div class="genui-playground">
    <div class="config-tabs" :class="{ 'config-tabs--collapsed': !isOpen }">
      <!-- 头部区域 -->
      <header class="sidebar_header" :class="{ 'sidebar_header--collapsed': !isOpen }">
        <div class="sidebar_brand">
          <img src="/logo.svg" alt="logo" />
          <span v-if="isOpen">GenUI</span>
        </div>

        <div class="sidebar_actions">
          <div class="sidebar_header_right">
            <span v-if="isOpen" class="svg-icon" :innerHTML="CloseSvg" title="收起" @click="isOpen = false"></span>
            <span v-else class="svg-icon" :innerHTML="OpenSvg" title="展开" @click="isOpen = true"></span>
          </div>
          <span
            v-if="!isOpen"
            class="svg-icon"
            :innerHTML="NewSvg"
            title="新建会话"
            @click="chat.handleNewConversation()"
          ></span>
        </div>
      </header>
      <!-- 新建会话按钮 -->
      <div class="sidebar_new_task">
        <div v-if="isOpen" class="new-task-btn" type="button" @click="chat.handleNewConversation()">
          <TinyIconPlus :size="16" />
          <span class="new-task-btn__text">新建会话</span>
          <div class="new-task-btn__shortcut">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>
      </div>
      <tiny-tabs class="sidebar-tabs" v-model="activeName" v-show="isOpen">
        <tiny-tab-item title="模型配置" name="model">
          <ModelConfig
            :llm-config="llmConfig"
            :model-data="modelData"
            @update:llm-config="Object.assign(llmConfig, $event)"
          />
        </tiny-tab-item>
        <tiny-tab-item title="工具" name="tools">
          <McpTools
            :llm-config="llmConfig"
            :chat-config="chatConfig"
            @update:llm-config="Object.assign(llmConfig, $event)"
            @update:chat-config="Object.assign(chatConfig, $event)"
          />
        </tiny-tab-item>
        <tiny-tab-item title="主题" name="theme">
          <div class="config-title">切换主题</div>
          <tiny-button-group size="small" :data="themeData" v-model="theme"></tiny-button-group>
        </tiny-tab-item>
        <tiny-tab-item title="历史会话" name="history" class="history-tab">
          <GenuiHistory v-if="conversation" :conversation="conversation" />
        </tiny-tab-item>
      </tiny-tabs>
    </div>
    <div class="chat-container">
      <GenuiConfigProvider :theme="theme" style="height: 100%">
        <GenuiChat
          :url="url"
          ref="chat"
          :messages="messages"
          :config="chatConfig"
          :think-component="ThinkComponent"
          :roles="roles"
          :features="modelFeatures"
          :custom-fetch="customFetch"
        >
          <template #empty>
            <div class="empty">
              <IconAi />
              <span>GenUI Playground</span>
            </div>
          </template>
        </GenuiChat>
      </GenuiConfigProvider>
    </div>
  </div>
</template>
<style scoped lang="less">
.genui-playground {
  --ti-common-scrollbar-width: 8px;
  --ti-common-scrollbar-height: 8px;
  display: flex;
  height: 100%;
  :deep(.tiny-tabs__content) {
    height: 100%;
    overflow: auto;
    padding: 0 24px 90px;
  }
}
.config-tabs {
  --config-tas-width: 370px;
  --config-tas-width-collapsed: 48px;
  position: relative;
  width: var(--config-tas-width);
  flex-shrink: 0;
  height: 100%;
  box-sizing: border-box;
  transition: all 0.3s ease;
  display: flex; /* 新增：纵向布局 */
  flex-direction: column; /* 新增 */
  .sidebar_header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;
    &.sidebar_header--collapsed {
      flex-direction: column;
      gap: 20px;
    }
    .sidebar_brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .sidebar_actions {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  }
  .sidebar_new_task {
    padding: 20px 24px 10px;

    /* 新建任务按钮 */
    .new-task-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      height: 36px;
      border: 1px solid #c2c2c2;
      border-radius: 10px;
      cursor: pointer;
      white-space: nowrap;

      &__text {
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
        text-align: justify;
      }

      &__shortcut {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;

        span {
          font-size: 10px;
          line-height: 14px;
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          padding: 0 6px;
          background: #fafafa;
        }
      }

      &:hover {
        background: #0000000a;
      }

      &.collapsed {
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 50%;
      }
    }
  }
  .sidebar-tabs {
    .config-title {
      font-size: 14px;
      color: #595959;
      margin-bottom: 12px;
      line-height: 32px;
    }
    flex: 1;
    min-height: 0;
    overflow: hidden;
    :deep(.tiny-tabs__header.is-top) {
      padding: 0 24px;
    }
  }
  &.config-tabs--collapsed {
    width: var(--config-tas-width-collapsed);
  }
  .svg-icon {
    cursor: pointer;
  }
}
.chat-container {
  flex: 1;
  height: 100%;
  min-width: 0;
}
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 80%;
  font-size: 32px;
  font-weight: 600;
  & > svg {
    width: 56px;
    height: 56px;
  }
}
</style>
