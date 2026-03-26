<script setup>
import { IconAi, IconUser } from '@opentiny/tiny-robot-svgs';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { GenuiConfigProvider, GenuiChat, GENUI_RENDERER } from '@opentiny/genui-sdk-vue';
import { ref, watch, onMounted, reactive, computed, onUnmounted, provide, defineAsyncComponent, h, shallowRef } from 'vue';
import { getModelFeatures, getModelOptions } from './api';
import { createCustomFetch } from './api/custom-fetch';
import AssistantFooter from './components/AssistantFooter.vue';
import UserFooter from './components/UserFooter.vue';
import PlaygroundSidebar from './components/PlaygroundSidebar.vue';
import { useInputMessage } from './hooks/use-input-message';
import { useIsMobile } from './hooks';
import useTemplate from './components/genui-template/useTemplate';
import { getOverlapEliminatorHandler, getContinueGeneratingHandler, locationPartialSchemaJson, movePartialSchemaJsonToLastMessage } from './continue-writing';
import useIcon from './use-icon';

const { topRenderer, addIcons } = useIcon();
const TopIconsRenderer = topRenderer();

addIcons(IconAi);

let framework = 'Vue'; // Angular

// 通过环境变量控制是否启用模板功能，默认不启用
const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

const GenuiTemplate = ENABLE_TEMPLATE
  ? defineAsyncComponent(() => import('./components/genui-template/GenuiTemplate.vue'))
  : shallowRef(null);

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

const STORAGE_KEY = 'GENUI_SDK_VUE_PLAYGROUND_CONFIG';
const {
  llmConfig: cacheLLmConfig,
  theme: cacheTheme,
  chatConfig: cacheChatConfig,
  customExamples: cacheCustomExamples,
} = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

const llmConfig = reactive(
  cacheLLmConfig || {
    temperature: 0.5,
    model: 'qwen3-coder-30b-a3b-instruct',
    mcpServers: [],
    promptList: [],
  },
);
const customExamples = ref(cacheCustomExamples || []);

const chatConfig = reactive(
  cacheChatConfig || {
    addToolCallContext: false,
    showThinkingResult: false,
  },
);

const modelData = ref([]);
const modelFeatures = ref({});
const theme = ref(cacheTheme || 'light');

const transformTheme = (themeConfig) => {
  const newThemeConfig = structuredClone(themeConfig);
  newThemeConfig.css = newThemeConfig.css.replaceAll(':host', `[class*="tiny-genui-playground"]`).replaceAll(':root', `[class*="tiny-genui-playground"]`);
  return newThemeConfig;
};

const themeMap = {
  dark: transformTheme(tinyDarkTheme),
  lite: transformTheme(tinyOldTheme),
  light: { css: ' ' },
};

const themeTool = new ThemeTool();

watch(theme, (newVal) => {
  const themeConfig = themeMap[newVal] || themeMap.light;
  themeTool.changeTheme(themeConfig);
}, { immediate: true });

watch(
  [() => theme.value, () => llmConfig, () => chatConfig, () => customExamples.value],
  async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: theme.value,
        llmConfig,
        chatConfig,
        customExamples: customExamples.value,
      }),
    );
  },
  { deep: true },
);

watch(
  () => llmConfig.model,
  async () => {
    modelFeatures.value = await getModelFeatures(llmConfig.model);
  },
);

const themeData = ref([
  { text: '默认', value: 'light' },
  { text: '暗黑', value: 'dark' },
  { text: '清新', value: 'lite' },
  { text: '自动', value: 'auto' },
]);

const messages = ref([]);

const url = import.meta.env.VITE_CHAT_URL;

// TODO: 后续优化后，在GenUI SDK导出此API
const insertHandlersAfterName = (handlers, insertHandlers, name) => {
  const index = handlers.findIndex(handler => handler.name === name);
  if (index !== -1) {
    handlers.splice(index + 1, 0, ...insertHandlers);
  }
  return handlers;
}

const chat = ref(null);
const conversation = computed(() => chat.value?.getConversation());
watch(chat, (instance) => {
  if (instance) {
    const defaultResponseHandlers = instance.getResponseHandlers();
    const contentHandler = defaultResponseHandlers.find(handler => handler.name === 'content');
    const newResponseHandlers = [
      ...defaultResponseHandlers,
      getContinueGeneratingHandler(conversation.value.messageManager),
      locationPartialSchemaJson(),
    ];
    
    insertHandlersAfterName(newResponseHandlers, [
      movePartialSchemaJsonToLastMessage(),
      getOverlapEliminatorHandler(contentHandler),
    ], 'init');
    instance.setResponseHandlers(newResponseHandlers);
  }
})

// 提供给侧边栏及其子组件使用的共享上下文
const playgroundContext = {
  llmConfig,
  chatConfig,
  modelData,
  themeData,
  conversation,
  customExamples,
};

provide('playgroundContext', playgroundContext);

const handleKeydown = (event) => {
  // Windows/Linux (Ctrl+K) 和 macOS (Command+K)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    chat.value.handleNewConversation();
  }
};

const templateUrl = import.meta.env.VITE_CHAT_TEMPLATE_URL;
const { isTemplateInit } = useTemplate({ url: templateUrl, llmConfig });
const { initInputMessage } = useInputMessage(chat);
const { isMobile } = useIsMobile();
const isSidebarOpen = ref(!isMobile.value);

onMounted(() => {
  initInputMessage();
  getModelOptions()
    .then(async (data) => {
      let modelChanged = false;
      if (!data.find((item) => item.value === llmConfig.model)) {
        llmConfig.model = data[0]?.value;
        modelChanged = true;
      }
      modelData.value = data;
      if (!modelChanged) {
        modelFeatures.value = await getModelFeatures(llmConfig.model);
      }
    })
    .catch((error) => {
      console.error('获取模型列表失败:', error);
    });
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const roles = computed(() => {
  return {
    assistant: {
      avatar: isMobile.value ? null : h(IconAi, { style: { fontSize: '32px' } }),
      slots: {
        trailer: AssistantFooter,
      },
    },
    user: {
      avatar: isMobile.value ? null : h(IconUser, { style: { fontSize: '32px' } }),
      slots: {
        trailer: UserFooter,
      },
    },
  };
});

const customFetch = createCustomFetch(() => ({
  ...llmConfig,
  framework,
}));

const updateCustomExamples = (list) => {
  customExamples.value = list.map((item) => ({ name: item.name, schema: item.schema }));
};

</script>

<template>
  <TopIconsRenderer style="height: 0" />
  <div class="genui-playground">
    <PlaygroundSidebar v-model:expanded="isSidebarOpen" v-model:theme="theme" @new-task="chat?.handleNewConversation()"
      @update-custom-examples="updateCustomExamples" v-slot="{ activeName }">
      <template v-if="ENABLE_TEMPLATE && isTemplateInit">
        <div v-if="activeName === 'template'" class="chat-container">
          <component v-if="GenuiTemplate" :is="GenuiTemplate" ref="genuiTemplateRef" :llm-config="llmConfig"
            :theme="theme" :chat-config="chatConfig" />
        </div>
      </template>
      <div v-show="!ENABLE_TEMPLATE || activeName !== 'template'" class="chat-container">
        <GenuiConfigProvider :theme="theme" style="height: 100%">
          <GenuiChat :url="url" ref="chat" :messages="messages" :chat-config="chatConfig" :roles="roles"
            :model="llmConfig.model" :temperature="llmConfig.temperature" :features="modelFeatures"
            :custom-fetch="customFetch" :custom-examples="customExamples">
            <template #empty>
              <div class="empty">
                <IconAi />
                <span>GenUI Playground</span>
              </div>
            </template>
          </GenuiChat>
        </GenuiConfigProvider>
      </div>
    </PlaygroundSidebar>
  </div>
</template>
<style scoped lang="less">
.genui-playground {
  --ti-common-scrollbar-width: 8px;
  --ti-common-scrollbar-height: 8px;
  display: flex;
  height: 100%;

  :deep(.tiny-sender__footer-slot.tiny-sender__bottom-row) {
    background: transparent;
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

  &>svg {
    width: 56px;
    height: 56px;
  }
}

@media (max-width: 768px) {
  .genui-playground {
    --ti-gen-chat-avatar-and-gap-width: 0px;
  }
  :deep(.action-buttons__button) {
    padding-right: 10px;
    svg[alt="录音"] {
      display: none;
    }
  }
  .empty {
    font-size: 24px;

    &>svg {
      width: 48px;
      height: 48px;
    }
  }
}
</style>
