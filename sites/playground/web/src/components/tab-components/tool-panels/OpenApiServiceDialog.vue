<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  TinyButton,
  TinyButtonGroup,
  TinyDialogBox,
  TinyForm,
  TinyFormItem,
  TinyInput,
  TinyNotify,
} from '@opentiny/vue';
import { t } from '../../../i18n';
import { readOpenApiFile } from '../../openapi-tools';
import type {
  OpenApiPreviewData,
  OpenApiPreviewTool,
  OpenApiToolServiceFormData,
  OpenApiInputMode,
} from '../../common.types';

const props = defineProps<{
  visible: boolean;
  serviceFormData: OpenApiToolServiceFormData;
  previewData: OpenApiPreviewData | null;
  previewStatus: 'idle' | 'loading' | 'success' | 'error';
  previewError: string;
  previewLoading: boolean;
  confirmLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:serviceFormData', value: OpenApiToolServiceFormData): void;
  (e: 'parseOpenApi'): void;
  (e: 'confirmOpenApiService'): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const modeButtonData = computed(() => [
  { text: 'URL', value: 'url' },
  { text: t('openApi.modeInline'), value: 'inline' },
  { text: t('openApi.modeFile'), value: 'file' },
]);

const handleClose = () => {
  emit('update:visible', false);
};

const patchFormData = (patch: Partial<OpenApiToolServiceFormData>) => {
  emit('update:serviceFormData', {
    ...props.serviceFormData,
    ...patch,
  });
};

const updateField = (field: keyof OpenApiToolServiceFormData, value: string) => {
  patchFormData({ [field]: value } as Partial<OpenApiToolServiceFormData>);
};

const onModeChange = (mode: OpenApiInputMode) => {
  if (mode === props.serviceFormData.openapiInputMode) {
    return;
  }
  patchFormData({
    openapiInputMode: mode,
    openapi: '',
    openapiFileName: '',
  });
};

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const applyOpenApiFile = async (file: File) => {
  try {
    const content = await readOpenApiFile(file);
    patchFormData({
      openapi: content,
      openapiFileName: file.name,
      openapiInputMode: 'file',
    });
  } catch (error) {
    TinyNotify({
      type: 'error',
      message: error instanceof Error ? error.message : t('openApi.readFileFailed'),
      position: 'top-right',
    });
  }
};

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    await applyOpenApiFile(file);
  }
  input.value = '';
};

const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await applyOpenApiFile(file);
  }
};

const previewTools = computed<OpenApiPreviewTool[]>(() => {
  const data = props.previewData;
  if (!data) {
    return [];
  }
  if (data.tools?.length) {
    return data.tools;
  }
  return (data.toolNames || []).map((name) => ({
    name,
    method: '',
    path: '',
  }));
});

const formatToolSummary = (tool: OpenApiPreviewTool) => {
  return tool.summary?.trim() || t('openApi.noDescription');
};
</script>

<template>
  <tiny-dialog-box
    :visible="visible"
    :title="serviceFormData.index > -1 ? t('openApi.edit') : t('openApi.add')"
    width="600px"
    height="560px"
    class="openapi-service-dialog"
    :append-to-body="true"
    @update:visible="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="openapi-service-dialog-body">
    <tiny-form :model="serviceFormData" label-width="140px" label-position="left" class="openapi-service-dialog-form">
      <tiny-form-item :label="t('openApi.docLabel')" required>
        <div class="openapi-service-input-section">
          <tiny-button-group
            size="small"
            :data="modeButtonData"
            :model-value="serviceFormData.openapiInputMode"
            @update:model-value="onModeChange($event as OpenApiInputMode)"
          />
          <div v-if="serviceFormData.openapiInputMode === 'url'" class="openapi-service-mode-panel">
            <tiny-input
              :model-value="serviceFormData.openapi"
              placeholder="https://example.com/openapi.json"
              @update:model-value="updateField('openapi', $event)"
            />
          </div>
          <div v-else-if="serviceFormData.openapiInputMode === 'inline'" class="openapi-service-mode-panel">
            <tiny-input
              type="textarea"
              :model-value="serviceFormData.openapi"
              :rows="8"
              :placeholder="t('openApi.inlinePlaceholder')"
              class="openapi-service-inline-input"
              @update:model-value="updateField('openapi', $event)"
            />
          </div>
          <div v-else class="openapi-service-mode-panel">
            <div
              class="openapi-service-dropzone"
              :class="{ 'openapi-service-dropzone--active': isDragOver }"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
              @click="openFilePicker"
            >
              <div class="openapi-service-dropzone__title">{{ t('openApi.dropzoneTitle') }}</div>
              <div class="openapi-service-dropzone__hint">{{ t('openApi.dropzoneHint') }}</div>
              <div v-if="serviceFormData.openapiFileName" class="openapi-service-dropzone__file">
                {{ t('openApi.fileLoaded', { fileName: serviceFormData.openapiFileName }) }}
              </div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              class="openapi-service-file-input"
              accept=".json,.yaml,.yml,application/json,text/yaml"
              @change="onFileInputChange"
            />
          </div>
          <div class="openapi-service-parse-row">
            <tiny-button type="primary" :loading="previewLoading" @click="emit('parseOpenApi')">
              {{ previewStatus === 'error' ? t('openApi.retry') : t('openApi.parse') }}
            </tiny-button>
          </div>
        </div>
      </tiny-form-item>
      <tiny-form-item :label="t('common.name')" prop="name" required>
        <tiny-input
          :model-value="serviceFormData.name"
          :placeholder="t('openApi.namePlaceholder')"
          @update:model-value="updateField('name', $event)"
        />
      </tiny-form-item>
      <tiny-form-item :label="t('openApi.apiHeaders')">
        <tiny-input
          type="textarea"
          :model-value="serviceFormData.apiHeaders || ''"
          :rows="4"
          :placeholder="t('openApi.apiHeadersPlaceholder')"
          class="openapi-service-headers-input"
          @update:model-value="updateField('apiHeaders', $event)"
        />
        <div class="openapi-service-hint openapi-service-hint--info openapi-service-headers-hint">
          {{ t('openApi.apiHeadersHint') }}
        </div>
      </tiny-form-item>
    </tiny-form>
      <div v-if="previewStatus === 'loading'" class="openapi-service-hint openapi-service-hint--info">
        {{ t('openApi.parsing') }}
      </div>
      <div v-if="previewStatus === 'error'" class="openapi-service-hint openapi-service-hint--error">
        {{ previewError }}
      </div>
      <div v-if="previewStatus === 'success' && previewData" class="openapi-service-preview">
        <div class="openapi-service-preview__badge">{{ t('openApi.parsed') }}</div>
        <div class="openapi-service-preview__main">
          <div class="openapi-service-preview__block">
            <span class="openapi-service-preview__block-label">Base URL</span>
            <div class="openapi-service-preview__url">{{ previewData.baseUrl }}</div>
          </div>
          <div class="openapi-service-preview__block">
            <span class="openapi-service-preview__block-label">{{ t('openApi.toolCount') }}</span>
            <div class="openapi-service-preview__count">{{ t('openApi.toolCountUnit', { count: previewData.toolCount }) }}</div>
          </div>
          <div class="openapi-service-preview__block">
            <span class="openapi-service-preview__block-label">{{ t('openApi.toolList') }}</span>
            <ul v-if="previewTools.length" class="openapi-service-preview__tool-list">
              <li v-for="(tool, i) in previewTools" :key="i" class="openapi-service-preview__tool-item">
                <div class="openapi-service-preview__tool-name">{{ tool.name }}</div>
                <div class="openapi-service-preview__tool-desc">{{ formatToolSummary(tool) }}</div>
              </li>
            </ul>
            <div v-else class="openapi-service-preview__tool-empty">{{ t('openApi.noTools') }}</div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <tiny-button type="primary" :loading="confirmLoading" @click="emit('confirmOpenApiService')">
        {{ t('common.confirm') }}
      </tiny-button>
    </template>
  </tiny-dialog-box>
</template>

<style scoped lang="less">
.openapi-service-dialog {
  :deep(.tiny-dialog-box__body) {
    overflow: hidden;
  }
}

.openapi-service-dialog-body {
  height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.openapi-service-dialog-form {
  :deep(.tiny-form-item__label) {
    line-height: 1.35;
    white-space: normal;
    word-break: break-word;
  }
}

.openapi-service-input-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.openapi-service-mode-panel {
  width: 100%;
}

.openapi-service-inline-input {
  :deep(textarea) {
    height: 160px !important;
    min-height: 160px !important;
    max-height: 160px !important;
    resize: none;
    overflow-y: auto;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}

.openapi-service-dropzone {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  height: 120px;
  min-height: 120px;
  max-height: 120px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &--active,
  &:hover {
    border-color: var(--ti-base-color-brand-6, #1890ff);
    background: rgba(24, 144, 255, 0.04);
  }

  &__title {
    font-size: 13px;
    color: #595959;
  }

  &__hint {
    font-size: 12px;
    color: #8c8c8c;
  }

  &__file {
    margin-top: 4px;
    font-size: 12px;
    color: #1476ff;
    word-break: break-all;
    text-align: center;
  }
}

.openapi-service-file-input {
  display: none;
}

.openapi-service-parse-row {
  display: flex;
  justify-content: flex-end;
}

.openapi-service-headers-input {
  :deep(textarea) {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}

.openapi-service-headers-hint {
  margin-top: 6px;
}

.openapi-service-preview {
  position: relative;
  margin-top: 16px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  background: linear-gradient(180deg, #fcfcfd 0%, #f7f8fa 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  overflow: hidden;

  &__badge {
    display: inline-block;
    margin: 12px 14px 0;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #1476ff;
    background: rgba(20, 118, 255, 0.08);
    border-radius: 4px;
  }

  &__main {
    padding: 10px 14px 14px;
  }

  &__block {
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__block-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #8c8c8c;
  }

  &__url,
  &__count {
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-all;
    color: #262626;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
  }

  &__url {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }

  &__tool-list {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 160px;
    overflow-y: auto;
  }

  &__tool-item {
    padding: 8px 10px;
    margin-bottom: 4px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__tool-name {
    font-size: 12px;
    line-height: 1.45;
    word-break: break-word;
    color: #262626;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-weight: 600;
  }

  &__tool-desc {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-word;
    color: #595959;
  }

  &__tool-empty {
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #8c8c8c;
    background: #fafafa;
    border: 1px dashed #e0e0e0;
    border-radius: 6px;
  }
}

.openapi-service-hint {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;

  &--info {
    background-color: #e6f4ff;
    color: #0958d9;
    border: 1px solid #91caff;
  }

  &--error {
    background-color: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
}
</style>
