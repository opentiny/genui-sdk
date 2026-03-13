<script setup lang="ts">
import { computed, ref } from 'vue';
import { CodeEditor } from 'monaco-editor-vue3';
import { GenuiConfigProvider, GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { IconEditorCode } from '@opentiny/vue-icon';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import type { ISchemaCardMessageItem, IJsonPatchMessageItem } from './chat.types';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import useTemplate from './useTemplate';

const { currentSchema, setCurrentSchema, templateConversationState } = useTemplate();

const TinyIconEditorCode = IconEditorCode();

const props = defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const schemaEditorVisible = ref(false);
const schemaDiffVisible = ref(false);
const newSchema = ref<string>('');
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

const toggleSchemaVersion = (schema: Record<string, unknown>) => {
  schemaDiffVisible.value = true;
  newSchema.value = JSON.stringify(schema, null, 2);
  schemaEditorVisible.value = true;
};

const updateSchemaVersion = () => {
  schemaEditor.value = newSchema.value;
  schemaDiffVisible.value = false;
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
  if (latestSchema) {
    schemaEditor.value = JSON.stringify(JSON.parse(latestSchema), null, 2);
  }
  schemaDiffVisible.value = false;
};

resetToLatestVersion();
</script>

<template>
  <div class="genui-schema-template">
    <div class="genui-schema-template-left">
      <GenuiConfigProvider v-show="!schemaEditorVisible" :theme="theme" style="width: 100%; height: 100%">
        <genui-template-chat class="genui-template-chat" @schema-version-toggle="toggleSchemaVersion" />
      </GenuiConfigProvider>
      <div class="schema-version-container" v-if="schemaEditorVisible">
        <div class="schema-version-toggle-button-group" v-if="schemaDiffVisible">
          <tiny-button @click="updateSchemaVersion">还原此版本</tiny-button>
          <tiny-button type="info" @click="resetToLatestVersion">返回最新版本</tiny-button>
        </div>
        <code-editor v-model:value="schemaEditor" language="json" theme="vs" :options="editorOptions" />
      </div>
    </div>
    <div class="genui-schema-template-right" v-if="currentSchema">
      <tiny-button class="schema-editor-toggle-button" :icon="TinyIconEditorCode"
        @click="toggleSchemaEditor"></tiny-button>
      <schema-renderer class="schema-renderer" :content="currentSchema" :generating="false" />
    </div>
  </div>
</template>

<style scoped>
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
}

.genui-template-chat {
  width: 100%;
}

.schema-editor-toggle-button {
  margin: 8px 0px 0px 8px;
  border: none;
}

.schema-renderer {
  padding: 0px 20px;
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
