<script setup>
import { IconAi, IconUser } from '@opentiny/tiny-robot-svgs';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import {
  ref,
  watch,
  onMounted,
  reactive,
  computed,
  onUnmounted,
  provide,
  defineAsyncComponent,
  h,
  shallowRef,
} from 'vue';
import { materials as tinyMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { materials as epMaterials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
import { mergeMaterials } from '@opentiny/genui-sdk-core';
import { getModelFeatures, getModelOptions } from './api';
import { createCustomFetch } from './api/custom-fetch';
import AssistantFooter from './components/AssistantFooter.vue';
import UserFooter from './components/UserFooter.vue';
import PlaygroundSidebar from './components/PlaygroundSidebar.vue';
import { useMaterialsConfig } from './components/materials-tab/materials-options';
import { useInputMessage } from './hooks/use-input-message';
import { useIsMobile } from './hooks';
import useTemplate from './components/genui-template/useTemplate';
import {
  getOverlapEliminatorHandler,
  getContinueGeneratingHandler,
  locationPartialSchemaJson,
  movePartialSchemaJsonToLastMessage,
} from './continue-writing';
import useIcon from './use-icon';
import {
  getMixedContentHandler,
  getMessageRendererAngular,
} from './message-renderers';
import { locale, t } from './i18n';

const { topRenderer, addIcons } = useIcon();
const TopIconsRenderer = topRenderer();

addIcons(IconAi);

// 通过环境变量控制是否启用模板功能，默认不启用
const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

const GenuiTemplate = ENABLE_TEMPLATE
  ? defineAsyncComponent(() => import('./components/genui-template/GenuiTemplate.vue'))
  : shallowRef(null);

const STORAGE_KEY = 'GENUI_SDK_VUE_PLAYGROUND_CONFIG';
const {
  llmConfig: cacheLLmConfig,
  theme: cacheTheme,
  chatConfig: cacheChatConfig,
  customExamples: cacheCustomExamples,
  framework: cacheFramework,
  componentLib: cacheComponentLib, 
} = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

const { framework, componentLib, setFramework, setComponentLib } = useMaterialsConfig({
  framework: cacheFramework,
  componentLib: cacheComponentLib,
});
/**
 * Normalizes cached custom examples for the id-based contract.
 * Drops invalid/legacy entries and de-duplicates by id.
 * @param {unknown} examples Raw cached examples from localStorage.
 * @returns {Array<{id: string, name: unknown, schema: unknown}>}
 */
const normalizeCustomExamples = (examples) => {
  if (!Array.isArray(examples)) {
    return [];
  }

  const dedupedExamples = new Map();
  examples.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) {
      return;
    }

    dedupedExamples.set(id, {
      id,
      name: item.name,
      schema: item.schema,
    });
  });

  return Array.from(dedupedExamples.values());
};

const isOpen = ref(true);
const llmConfig = reactive(
  cacheLLmConfig || {
  temperature: 0.5,
  model: 'qwen3-coder-30b-a3b-instruct',
  promptVariant: 'standard',
  mcpServers: [],
  agents: [],
  skills: [],
  openApiTools: [],
  promptList: [],
});
if (!Array.isArray(llmConfig.openApiTools)) {
  llmConfig.openApiTools = [];
}
const customExamples = ref(normalizeCustomExamples(cacheCustomExamples));

const chatConfig = reactive(
  cacheChatConfig || {
    addToolCallContext: false,
    showThinkingResult: true,
  },
);

const modelData = ref([]);
const modelFeatures = ref({});
const theme = ref(cacheTheme || 'light');

let latestModelFeaturesRequest = 0;

const syncModelFeatures = async (model) => {
  const requestId = ++latestModelFeaturesRequest;
  try {
    const features = await getModelFeatures(model);
    if (requestId === latestModelFeaturesRequest && llmConfig.model === model) {
      modelFeatures.value = features;
    }
  } catch (error) {
    if (requestId === latestModelFeaturesRequest) {
      console.error('Failed to get model features:', error);
    }
  }
};

watch(() => llmConfig.model, syncModelFeatures);
const transformTheme = (themeConfig) => {
  const newThemeConfig = structuredClone(themeConfig);
  newThemeConfig.css = newThemeConfig.css
    .replaceAll(':host', `[class*="tiny-genui-playground"]`)
    .replaceAll(':root', `[class*="tiny-genui-playground"]`);
  return newThemeConfig;
};

const themeMap = {
  dark: transformTheme(tinyDarkTheme),
  lite: transformTheme(tinyOldTheme),
  light: { css: ' ' },
};

const themeTool = new ThemeTool();

watch(
  theme,
  (newVal) => {
    const themeConfig = themeMap[newVal] || themeMap.light;
    themeTool.changeTheme(themeConfig);
  },
  { immediate: true },
);

watch(
  [() => theme.value, () => llmConfig, () => chatConfig, () => customExamples.value, () => framework.value, () => componentLib.value],
  async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: theme.value,
        llmConfig,
        chatConfig,
        customExamples: customExamples.value,
        framework: framework.value,
        componentLib: componentLib.value,
      }),
    );
  },
  { deep: true },
);

const themeData = computed(() => [
  { text: t('theme.default'), value: 'light' },
  { text: t('theme.dark'), value: 'dark' },
  { text: t('theme.lite'), value: 'lite' },
  { text: t('theme.auto'), value: 'auto' },
]);

const messages = ref([]);

const url = import.meta.env.VITE_CHAT_URL;

// TODO: 后续优化后，在GenUI SDK导出此API
const insertHandlersAfterName = (handlers, insertHandlers, name) => {
  const index = handlers.findIndex((handler) => handler.name === name);
  if (index !== -1) {
    handlers.splice(index + 1, 0, ...insertHandlers);
  }
  return handlers;
}
const insertHandlersBeforeName = (handlers, insertHandlers, name) => {
  const index = handlers.findIndex(handler => handler.name === name);
  if (index !== -1) {
    handlers.splice(index, 0, ...insertHandlers);
  }
  return handlers;
}
const replaceHandlers = (handlers, replaceHandlers, name) => {
  const index = handlers.findIndex(handler => handler.name === name);
  if (index !== -1) {
    handlers.splice(index, 1, ...replaceHandlers);
  }
  return handlers;
}

const chat = ref(null);
const conversation = computed(() => chat.value?.getConversation());
watch(chat, (instance) => {
  if (instance) {
    const defaultResponseHandlers = instance.getResponseHandlers();
    const contentHandler = defaultResponseHandlers.find((handler) => handler.name === 'content');
    const newContentHandler = getMixedContentHandler(contentHandler, framework);
    replaceHandlers(defaultResponseHandlers, [
      newContentHandler,
    ], 'content');

    const newResponseHandlers = [
      ...defaultResponseHandlers,
      getContinueGeneratingHandler(conversation.value.messageManager),
      locationPartialSchemaJson(),
    ];

    insertHandlersAfterName(
      newResponseHandlers,
      [movePartialSchemaJsonToLastMessage(), getOverlapEliminatorHandler(contentHandler)],
      'init',
    );
    instance.setResponseHandlers(newResponseHandlers);

    instance.setMessageRenderer('schema-card-angular', getMessageRendererAngular(instance));
  }
});

// 提供给侧边栏及其子组件使用的共享上下文
const playgroundContext = {
  llmConfig,
  chatConfig,
  modelData,
  themeData,
  conversation,
  customExamples,
  framework,
  componentLib,
  setFramework,
  setComponentLib,
};

provide('playgroundContext', playgroundContext);

const mergedMaterials = mergeMaterials(tinyMaterials, epMaterials);

const handleKeydown = (event) => {
  // Windows/Linux (Ctrl+K) 和 macOS (Command+K)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    chat.value.handleNewConversation();
  }
};

const templateUrl = import.meta.env.VITE_CHAT_TEMPLATE_URL;
const { isTemplateInit, templateSchemaList, switchTemplate } = useTemplate({
  url: templateUrl,
  llmConfig,
});
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
  framework: framework.value,
  componentLib: componentLib.value,
}));

/**
 * Rehydrates custom examples from cache using normalized data.
 */
const initExampleList = () => {
  customExamples.value = normalizeCustomExamples(cacheCustomExamples);
};

/**
 * Updates custom examples and enforces the normalized shape.
 * @param {unknown[]} list Latest examples from UI events.
 */
const updateCustomExamples = (list) => {
  customExamples.value = normalizeCustomExamples(list);
};

watch(
  () => templateSchemaList.value,
  (newVal) => {
    if (!newVal) {
      return;
    }
    const templateMap = new Map(newVal.map((item) => [item.id, item]));
    // Only keep examples that still exist in templateSchemaList,
    // and always refresh them from the latest template source.
    customExamples.value = customExamples.value.map((example) => templateMap.get(example.id)).filter(Boolean);
  },
  { deep: true },
);

onMounted(() => {
  initInputMessage();
  initExampleList();
  getModelOptions()
    .then(async (data) => {
      if (!data.find((item) => item.value === llmConfig.model)) {
        llmConfig.model = data[0]?.value;
      }
      modelData.value = data;
      syncModelFeatures(llmConfig.model);
    })
    .catch((error) => {
      console.error('Failed to get model options:', error);
    });
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <TopIconsRenderer style="height: 0" />
  <div class="genui-playground">
    <PlaygroundSidebar
      :key="locale"
      v-model:expanded="isSidebarOpen"
      v-model:theme="theme"
      @new-task="chat?.handleNewConversation()"
      @update-custom-examples="updateCustomExamples"
      v-slot="{ activeName }"
    >
      <template v-if="ENABLE_TEMPLATE && isTemplateInit">
        <div v-if="activeName === 'template'" class="chat-container">
          <component
            v-if="GenuiTemplate"
            :is="GenuiTemplate"
            ref="genuiTemplateRef"
            :llm-config="llmConfig"
            :theme="theme"
            :chat-config="chatConfig"
          />
        </div>
      </template>
      <div v-show="!ENABLE_TEMPLATE || activeName !== 'template'" class="chat-container">
        <GenuiConfigProvider
          :theme="theme"
          :locale="locale"
          :materials="mergedMaterials"
          style="height: 100%"
        >
          <GenuiChat
            :url="url"
            ref="chat"
            :messages="messages"
            :chat-config="chatConfig"
            :roles="roles"
            :model="llmConfig.model"
            :temperature="llmConfig.temperature"
            :features="modelFeatures"
            :custom-fetch="customFetch"
            :custom-examples="customExamples"
          >
            <template #empty>
              <div class="empty">
                <IconAi />
                <span>{{ t('app.emptyTitle') }}</span>
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

  & > svg {
    width: 56px;
    height: 56px;
  }
}

@media (max-width: 768px) {
  .genui-playground {
    --ti-gen-chat-avatar-and-gap-width: 0px;
  }
  :deep(.action-buttons__button .action-buttons__icon) {
    padding-right: 10px;
    display: none;
  }

  .empty {
    font-size: 24px;

    & > svg {
      width: 48px;
      height: 48px;
    }
  }
}
</style>
