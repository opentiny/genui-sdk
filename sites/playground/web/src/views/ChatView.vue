<script setup>
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import { IconAi } from '@opentiny/tiny-robot-svgs';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { locale, t } from '../i18n';
import PlaygroundViewShell from './PlaygroundViewShell.vue';
import { usePlaygroundViewContext } from './usePlaygroundViewContext';
import SchemaExportHeader from '../components/SchemaExportHeader.vue';

const {
  theme,
  llmConfig,
  chatConfig,
  url,
  messages,
  roles,
  modelFeatures,
  customFetch,
  customExamples,
  chat,
} = usePlaygroundViewContext();

const setChatRef = (el) => {
  if (el) chat.value = el;
};

const rendererSlots = {
  header: SchemaExportHeader,
};
</script>

<template>
  <PlaygroundViewShell>
    <GenuiConfigProvider :theme="theme" :locale="locale" :materials="materials" style="height: 100%">
      <GenuiChat
        :url="url"
        :ref="setChatRef"
        :messages="messages"
        :chat-config="chatConfig"
        :roles="roles"
        :model="llmConfig.model"
        :temperature="llmConfig.temperature"
        :features="modelFeatures"
        :custom-fetch="customFetch"
        :custom-examples="customExamples"
        :renderer-slots="rendererSlots"
      >
        <template #empty>
          <div class="empty">
            <IconAi />
            <span>{{ t('app.emptyTitle') }}</span>
          </div>
        </template>
      </GenuiChat>
    </GenuiConfigProvider>
  </PlaygroundViewShell>
</template>

<style scoped lang="less">
:deep(.renderer-header) {
  position: relative;

  .schema-export-button {
    position: absolute;
    bottom: -48px;
    right: 12px;
    z-index: 20;
    display: inline-flex;
    align-items: center;
    gap: 0;
    padding: 10px;
    border: 0;
    border-radius: 38px;
    background: rgba(25, 25, 25, 0.08);
    color: var(--tv-color-text, #191919);
    cursor: pointer;
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .schema-export-icon {
    width: 16px;
    height: 16px;
  }

  .schema-export-label {
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    transition: opacity 0.15s ease, max-width 0.2s ease;
  }

  .schema-export-button:hover {
    gap: 6px;
  }

  .schema-export-button:hover .schema-export-label {
    opacity: 1;
    max-width: 80px;
  }

  .schema-export-button:active {
    transform: translateY(0) scale(0.98);
  }
}

:deep(.schema-render-container:hover .schema-export-button) {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
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
  .empty {
    font-size: 24px;

    & > svg {
      width: 48px;
      height: 48px;
    }
  }
}
</style>
