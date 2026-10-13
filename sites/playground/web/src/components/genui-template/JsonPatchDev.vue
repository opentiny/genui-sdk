<script setup lang="ts">
import { ref, watch } from 'vue';
import { TinyDialogBox, TinyButton } from '@opentiny/vue';
import { CodeEditor } from 'monaco-editor-vue3';
import { useMonacoPlaygroundTheme } from './composables/use-monaco-playground-theme';
import * as jsonDiffPatch from 'jsondiffpatch';
import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { textToJson } from './template-chat-utils';
import { t } from '../../i18n';

const props = defineProps<{
  currentSchema: string;
  jsonPatch: string;
  prevSchema: string;
}>();

const visible = defineModel<boolean>({ default: false });

const monacoTheme = useMonacoPlaygroundTheme();

const editorOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  folding: true,
  foldingHighlight: true,
  foldingStrategy: 'indentation',
  formatOnPaste: true,
};

const left = ref(null);
const right = ref(null);
const jsonPatch = ref(null);

const handlePatch = () => {
  try {
    const leftData = JSON.parse(left.value);
    const patchData = JSON.parse(jsonPatch.value);
    const target = structuredClone(leftData);

    jsonPatchFormatter.patch(target, patchData as JsonPatchOp[]);

    right.value = JSON.stringify(target as any, null, 2);
  } catch (error) {
    console.error('Patch 失败:', error);
  }
};

const handleDiff = () => {
  try {
    const leftData = JSON.parse(left.value);
    const rightData = JSON.parse(right.value);

    const diffPatcher = jsonDiffPatch.create();

    const delta = diffPatcher.diff(leftData, rightData);

    const patch = jsonPatchFormatter.format(delta);

    jsonPatch.value = JSON.stringify(patch, null, 2);
  } catch (error) {
    console.error('Diff 失败:', error);
  }
};

watch(
  () => visible.value,
  async (newVal) => {
    if (newVal) {
      const { value: leftData } = await textToJson(props.prevSchema);
      left.value = JSON.stringify(leftData as any, null, 2);
      const { value: jsonPatchData } = await textToJson(props.jsonPatch);
      jsonPatch.value = JSON.stringify(jsonPatchData as any, null, 2);
      right.value = '';
      handlePatch();
    } else {
      left.value = '';
      jsonPatch.value = '';
      right.value = '';
    }
  },
);
</script>

<template>
  <tiny-dialog-box v-model:visible="visible" :title="t('templateEditor.debugger')" width="80%" height="600px">
    <!-- footer 居中 -->
    <template #footer>
      <div class="json-patch-dev-footer">
        <TinyButton @click="handlePatch">patch left to right</TinyButton>
        <TinyButton @click="handleDiff">diff left and right</TinyButton>
      </div>
    </template>
    <div class="json-patch-dev">
      <div class="json-patch-dev-content json-patch-dev-content-left">
        <h1>Left</h1>
        <CodeEditor
          class="json-patch-dev-content-editor"
          v-model:value="left"
          language="json"
          :theme="monacoTheme"
          :options="editorOptions"
        />
      </div>
      <div class="json-patch-dev-content json-patch-dev-content-center">
        <h1>JSON Patch(RFC 6902)</h1>
        <CodeEditor
          class="json-patch-dev-content-editor"
          v-model:value="jsonPatch"
          language="json"
          :theme="monacoTheme"
          :options="editorOptions"
        />
      </div>
      <div class="json-patch-dev-content json-patch-dev-content-right">
        <h1>Right</h1>
        <CodeEditor
          class="json-patch-dev-content-editor"
          v-model:value="right"
          language="json"
          :theme="monacoTheme"
          :options="editorOptions"
        />
      </div>
    </div>
  </tiny-dialog-box>
</template>

<style scoped>
.json-patch-dev {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  height: 600px;
}

.json-patch-dev-content {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-right: 1px solid #e0e0e0;
}

.json-patch-dev-content-editor {
  height: 100%;
  flex: 1;
}

.json-patch-dev-content-right {
  border-right: none;
}

.json-patch-dev-footer {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
