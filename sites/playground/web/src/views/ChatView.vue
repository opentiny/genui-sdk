<script setup>
import { computed } from 'vue';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import { IconAi } from '@opentiny/tiny-robot-svgs';
import { materials as tinyMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { materials as epMaterials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
import { mergeMaterials } from '@opentiny/genui-sdk-core';
import { locale, t } from '../i18n';
import PlaygroundViewShell from './PlaygroundViewShell.vue';
import { usePlaygroundViewContext } from './usePlaygroundViewContext';

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
  chat
} = usePlaygroundViewContext();

const materials = mergeMaterials(tinyMaterials, epMaterials)

const setChatRef = (el) => {
  if (el) chat.value = el;
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
