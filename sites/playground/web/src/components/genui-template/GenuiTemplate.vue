<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { CodeEditor } from 'monaco-editor-vue3';
import { GenuiConfigProvider, GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { IconRichTextCodeBlock } from '@opentiny/vue-icon';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import type { ISchemaCardMessageItem, IJsonPatchMessageItem } from './chat.types';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import useTemplate from './useTemplate';

const { currentSchema, setCurrentSchema, templateConversationState, getCurrentCardId, currentConversationId } = useTemplate();

const TinyIconRichTextCodeBlock = IconRichTextCodeBlock();

const props = defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

// schema 编辑器是否可见
const schemaEditorVisible = ref(false);
const currentCardId = ref<string>('');
// 是否最新版本卡片
const showReturnLatestButton = computed(() => getCurrentCardId() !== currentCardId.value && currentCardId.value)
// 编辑器中显示的代码
const schemaEditor = computed({
  get() {
    // 写入编辑器的代码
    if (!currentSchema.value) {
      schemaEditorVisible.value = false;
      return '{}';
    }

    return JSON.stringify(currentSchema.value, null, 2);
  },
  set(value: string) {
    // 在编辑器中编辑代码
    try {
      const schema = JSON.parse(value || '{}');

      setCurrentSchema(schema);
    } catch (error) {
      console.error('schemaEditor set error ===>', error);
    }
  },
});

const editorOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  folding: true,
  foldingHighlight: true,
  foldingStrategy: 'indentation',
  formatOnPaste: true,
};

const toggleSchemaEditor = () => {
  schemaEditorVisible.value = !schemaEditorVisible.value;
};

const toggleSchemaVersion = (schema: Record<string, unknown>, cardId: string) => {
  currentCardId.value = cardId;
  schemaEditor.value = JSON.stringify(schema, null, 2);
};

const resetToLatestVersion = () => {
  // 获取最新版本的 schema
  const currentConversation = templateConversationState.conversations.find(
    (conversation: Conversation) => conversation.id === templateConversationState.currentId,
  );
  const lastMessage = currentConversation?.messages?.[currentConversation?.messages.length - 1] as IMessage | undefined;
  const schemaMessage = lastMessage?.messages?.find(
    (message): message is ISchemaCardMessageItem | IJsonPatchMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  );
  const latestSchema = schemaMessage?.schema;
  currentCardId.value = schemaMessage?.cardId ?? '';
  if (latestSchema) {
    schemaEditor.value = JSON.stringify(JSON.parse(latestSchema), null, 2);
  }
};

// 按 Esc 关闭 schema 编辑/对比视图
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (schemaEditorVisible.value) {
      schemaEditorVisible.value = false;
    }
  }
};

watch(() => currentConversationId.value, () => {
  schemaEditorVisible.value = false;
  currentCardId.value = '';
});

onMounted(() => {
  resetToLatestVersion();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="genui-schema-template">
    <div class="genui-schema-template-left">
      <GenuiConfigProvider v-show="!schemaEditorVisible" :theme="theme" style="width: 100%; height: 100%">
        <genui-template-chat class="genui-template-chat" @schema-version-toggle="toggleSchemaVersion" />
      </GenuiConfigProvider>
      <div class="schema-version-container" v-show="schemaEditorVisible">
        <code-editor v-model:value="schemaEditor" language="json" theme="vs" :options="editorOptions" />
      </div>
    </div>
    <div class="genui-schema-template-right" v-if="currentSchema">
      <div class="genui-schema-template-right-wrapper">
        <tiny-button class="schema-editor-toggle-button" :icon="TinyIconRichTextCodeBlock" round
          @click="toggleSchemaEditor"></tiny-button>
        <div class="top-button-group">
          <tiny-button v-if="showReturnLatestButton" type="info" round
            @click="resetToLatestVersion">返回最新版本</tiny-button>
        </div>
        <schema-renderer class="schema-renderer" :content="currentSchema" :generating="false" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.genui-schema-template {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
  min-height: 100%;
}

.genui-schema-template-left {
  flex: 1;
  display: flex;
  height: 100%;
}

.genui-schema-template-right {
  width: 50%;
  overflow: auto;
  padding: 20px;

  &-wrapper {
    background-color: #ffffff;
    border-radius: 16px;
    height: 100%;
    text-align: center;
    position: relative;

    .top-button-group {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
    }

    .schema-editor-toggle-button {
      position: absolute;
      left: 0;
      top: 0;
    }
  }
}

.genui-template-chat {
  width: 100%;
}

.schema-version-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
}

.schema-version-toggle-button-group {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0px;
  border-bottom: 1px solid #808080;
  margin-bottom: 20px;
}

.json-patch-dev-icon {
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 20px;
  padding: 12px;
  text-align: right;
}
</style>
