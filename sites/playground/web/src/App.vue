<script setup>
import { IconAi, IconUser } from '@opentiny/tiny-robot-svgs';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import {
  ref,
  watch,
  onMounted,
  reactive,
  computed,
  onUnmounted,
  provide,
  h,
} from 'vue';
import { getModelFeatures, getModelOptions } from './api';
import { createCustomFetch } from './api/custom-fetch';
import AssistantFooter from './components/AssistantFooter.vue';
import UserFooter from './components/UserFooter.vue';
import PlaygroundSidebar from './components/PlaygroundSidebar.vue';
import { useMaterialsConfig } from './components/materials-tab';
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
import { getMixedContentHandler, getMessageRendererAngular, getMessageRendererReact } from './message-renderers';
import { locale, t } from './i18n';
import { useRoute } from 'vue-router';
import { PlaygroundMode } from './constants';

const { topRenderer, addIcons } = useIcon();
const TopIconsRenderer = topRenderer();

addIcons(IconAi);

// 通过环境变量控制是否启用模板功能，默认不启用
const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

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
};
const replaceHandlers = (handlers, nextHandlers, name) => {
  const index = handlers.findIndex((handler) => handler.name === name);
  if (index !== -1) {
    handlers.splice(index, 1, ...nextHandlers);
  }
  return handlers;
};

const chat = ref(null);

const conversation = computed(() => chat.value?.getConversation());

watch(chat, (instance) => {
  if (instance) {
    const defaultResponseHandlers = instance.getResponseHandlers();
    const contentHandler = defaultResponseHandlers.find((handler) => handler.name === 'content');
    const newContentHandler = getMixedContentHandler(contentHandler, framework);
    replaceHandlers(
      defaultResponseHandlers,
      [newContentHandler],
      'content',
    );

    const newResponseHandlers = [
      ...defaultResponseHandlers,
      getContinueGeneratingHandler(conversation.value.messageManager),
      locationPartialSchemaJson(),
      {
        name: 'chatTiming',
        match: () => false,
        handler: () => false,
        beforeRequest: (context) => {
          context.timing = { sentAt: Date.now() };
        },
        start: (context) => {
          const timing = context.timing;
          if (timing) {
            timing.firstByteAt = Date.now();
            timing.ttfb = timing.firstByteAt - timing.sentAt;
          }
        },
        end: (context) => {
          const timing = context.timing;
          const finishInfo = context.chatMessage?.finishInfo;
          if (!timing || !finishInfo) return;
          const { firstByteAt, ttfb } = timing;
          const renderEndAt = Date.now();
          context.chatMessage.finishInfo = {
            ...finishInfo,
            ttfb,
            renderDurationMs: firstByteAt != null ? renderEndAt - firstByteAt : undefined,
          };
        },
      },
    ];

    insertHandlersAfterName(
      newResponseHandlers,
      [movePartialSchemaJsonToLastMessage(), getOverlapEliminatorHandler(contentHandler)],
      'init',
    );
    instance.setResponseHandlers(newResponseHandlers);

    instance.setMessageRenderer('schema-card-angular', getMessageRendererAngular(instance));
    instance.setMessageRenderer('schema-card-react', getMessageRendererReact(instance));
  }
});

const { isMobile } = useIsMobile();

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

const playgroundContext = {
  llmConfig,
  chatConfig,
  modelData,
  themeData,
  conversation,
  customExamples,
  framework,
  componentLib,
  setComponentLib,
  setFramework,
  theme,
  url,
  messages,
  roles,
  modelFeatures,
  customFetch,
  chat,
};

provide('playgroundContext', playgroundContext);

const route = useRoute();
const templateUrl = import.meta.env.VITE_CHAT_TEMPLATE_URL;
const { templateSchemaList, createTemplate } = ENABLE_TEMPLATE
  ? useTemplate({
      url: templateUrl,
      llmConfig,
    })
  : { templateSchemaList: ref([]), createTemplate: () => {} };

const handleKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (ENABLE_TEMPLATE && route.name === PlaygroundMode.Builder) {
      createTemplate();
      return;
    }
    chat.value?.handleNewConversation();
  }
};

const { initInputMessage } = useInputMessage(chat);
const isSidebarOpen = ref(!isMobile.value);

/**
 * Rehydrates custom examples from cache using normalized data.
 */
const initExampleList = () => {
  customExamples.value = normalizeCustomExamples(cacheCustomExamples);
};

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
    customExamples.value = customExamples.value.map((example) => templateMap.get(example.id)).filter(Boolean);
  },
  { deep: true },
);

onMounted(() => {
  initInputMessage();
  initExampleList();
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
    >
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
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

@media (max-width: 768px) {
  .genui-playground {
    --ti-gen-chat-avatar-and-gap-width: 0px;
  }
  :deep(.action-buttons__button .action-buttons__icon) {
    padding-right: 10px;
    display: none;
  }
}
</style>
