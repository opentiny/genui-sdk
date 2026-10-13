<script setup>
import { ref, inject } from 'vue';
import { TinyButton, TinySwitch, TinyPopover, TinyCollapseItem, TinyNotify } from '@opentiny/vue';
import { iconDel, iconEdit, iconPlus, iconEllipsis } from '@opentiny/vue-icon';
import OpenApiServiceDialog from './OpenApiServiceDialog.vue';
import { detectOpenApiInputMode, formatOpenApiSourceLabel, parseApiHeadersText, formatApiHeadersObject } from '../../openapi-tools';
import { t } from '../../../i18n';

const playgroundContext = inject('playgroundContext');
const { llmConfig } = playgroundContext;

const IconPlus = iconPlus();
const IconDel = iconDel();
const IconEdit = iconEdit();
const IconEllipsis = iconEllipsis();

const showServiceFormDialog = ref(false);
const previewLoading = ref(false);
const confirmLoading = ref(false);
const previewData = ref(null);
const previewStatus = ref('idle');
const previewError = ref('');
const lastParsedOpenApi = ref('');
const lastParsedToolNamePrefix = ref('');

const emptyServiceFormData = () => ({
  name: '',
  openapi: '',
  openapiInputMode: 'url',
  openapiFileName: '',
  apiHeaders: '',
  index: -1,
});

const serviceFormData = ref(emptyServiceFormData());

function slugifyName(name) {
  const slug = String(name ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return /^[0-9]/.test(slug) ? `_${slug}` : slug;
}

function resolveOpenApiDocument(service) {
  return (service?.openapi ?? '').trim();
}

function resolveOpenApiFileName(service) {
  return service?.openapiFileName ?? '';
}

const invalidatePreview = () => {
  previewData.value = null;
  previewStatus.value = 'idle';
  previewError.value = '';
  lastParsedOpenApi.value = '';
  lastParsedToolNamePrefix.value = '';
};

const closeServiceDialog = () => {
  showServiceFormDialog.value = false;
  serviceFormData.value = emptyServiceFormData();
  invalidatePreview();
  previewLoading.value = false;
  confirmLoading.value = false;
};

const addOpenApiService = () => {
  serviceFormData.value = emptyServiceFormData();
  invalidatePreview();
  showServiceFormDialog.value = true;
};

const editOpenApiService = (service, index) => {
  const openApiDocument = resolveOpenApiDocument(service);
  const openApiFileName = resolveOpenApiFileName(service);
  serviceFormData.value = {
    name: service.name || '',
    openapi: openApiDocument,
    openapiInputMode: detectOpenApiInputMode(openApiDocument, openApiFileName),
    openapiFileName: openApiFileName,
    apiHeaders: formatApiHeadersObject(service.apiHeaders),
    index,
  };
  previewStatus.value = 'success';
  previewData.value = {
    baseUrl: service.baseUrl || '',
    toolCount: service.toolCount ?? 0,
    toolNames: service.toolNames || [],
    tools: service.tools || [],
  };
  lastParsedOpenApi.value = openApiDocument;
  lastParsedToolNamePrefix.value = service.toolNamePrefix || slugifyName(service.name || '');
  showServiceFormDialog.value = true;
};

const onUpdateServiceFormData = (val) => {
  serviceFormData.value = val;
  const openApiDocument = (val.openapi || '').trim();
  const prefix = (val.name || '').trim() ? slugifyName(val.name) : '';
  if (
    lastParsedOpenApi.value !== '' &&
    (openApiDocument !== lastParsedOpenApi.value || prefix !== lastParsedToolNamePrefix.value)
  ) {
    invalidatePreview();
  }
};

const deleteOpenApiService = (service) => {
  const services = [...(llmConfig.openApiTools || [])];
  llmConfig.openApiTools = services.filter((s) => s.name !== service.name);
};

const updateOpenApiServiceEnabled = (service, enabled) => {
  const services = [...(llmConfig.openApiTools || [])];
  llmConfig.openApiTools = services.map((s) => (s.name === service.name ? { ...s, enabled } : s));
};

const parseOpenApi = async () => {
  const openApiDocument = (serviceFormData.value.openapi || '').trim();
  const name = (serviceFormData.value.name || '').trim();

  if (!openApiDocument) {
    TinyNotify({
      type: 'warning',
      message: t('openApi.documentRequired'),
      position: 'top-right',
    });
    return false;
  }

  previewLoading.value = true;
  previewStatus.value = 'loading';
  previewError.value = '';

  try {
    const checkOpenApiToolsUrl = import.meta.env.VITE_CHECK_OPENAPI_TOOLS_URL;
    const res = await fetch(checkOpenApiToolsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openapi: openApiDocument,
        toolNamePrefix: name ? slugifyName(name) : undefined,
      }),
    });
    const data = await res.json();
    if (data.code !== 200) {
      throw new Error(data.message || t('openApi.parseFailed'));
    }

    previewData.value = data.data;
    previewStatus.value = 'success';
    lastParsedOpenApi.value = openApiDocument;
    lastParsedToolNamePrefix.value = name ? slugifyName(name) : '';
    return true;
  } catch (error) {
    previewStatus.value = 'error';
    previewError.value = error?.message
      ? t('openApi.parseFailedWithMessage', { message: error.message })
      : t('openApi.parseFailed');
    return false;
  } finally {
    previewLoading.value = false;
  }
};

const confirmOpenApiService = async () => {
  const { name, openapi, openapiFileName, apiHeaders, index } = serviceFormData.value;
  const openApiTrimmed = (openapi || '').trim();
  const nameTrimmed = (name || '').trim();

  if (!nameTrimmed || !openApiTrimmed) {
    TinyNotify({
      type: 'warning',
      message: t('openApi.nameAndDocRequired'),
      position: 'top-right',
    });
    return;
  }

  confirmLoading.value = true;
  try {
    const currentPrefix = slugifyName(nameTrimmed);
    const needsParse =
      !previewData.value ||
      previewStatus.value !== 'success' ||
      openApiTrimmed !== lastParsedOpenApi.value ||
      currentPrefix !== lastParsedToolNamePrefix.value;

    if (needsParse) {
      const parsed = await parseOpenApi();
      if (!parsed) {
        return;
      }
    }

    const services = [...(llmConfig.openApiTools || [])];
    const nameCollision = services.some((s, i) => i !== index && (s.name || '').trim() === nameTrimmed);
    if (nameCollision) {
      TinyNotify({
        type: 'warning',
        message: t('openApi.duplicateName', { name: nameTrimmed }),
        position: 'top-right',
      });
      return;
    }

    const enabledValue = index > -1 ? (services[index]?.enabled ?? true) : true;
    const parsedApiHeaders = parseApiHeadersText(apiHeaders);
    const nextService = {
      name: nameTrimmed,
      openapi: openApiTrimmed,
      baseUrl: previewData.value.baseUrl,
      toolNamePrefix: slugifyName(nameTrimmed),
      openapiFileName: (openapiFileName || '').trim() || undefined,
      toolCount: previewData.value.toolCount,
      toolNames: previewData.value.toolNames,
      tools: previewData.value.tools || [],
      enabled: enabledValue,
      ...(Object.keys(parsedApiHeaders).length > 0 ? { apiHeaders: parsedApiHeaders } : {}),
    };

    if (index > -1) {
      services[index] = nextService;
    } else {
      services.push(nextService);
    }

    llmConfig.openApiTools = services;
    closeServiceDialog();
  } finally {
    confirmLoading.value = false;
  }
};
</script>

<template>
  <tiny-collapse-item name="openApiTools" :title="t('openApi.title')">
    <template #title-right>
      <tiny-button type="text" :icon="IconPlus" @click.stop="addOpenApiService"> </tiny-button>
    </template>
    <div class="mcp-server-list">
      <div
        class="mcp-server-item"
        v-for="(service, index) in llmConfig.openApiTools || []"
        :key="service.name"
      >
        <div class="mcp-server-item-header">
          <div class="mcp-server-item-name" :title="service.name">{{ service.name }}</div>
          <div>
            <tiny-switch
              :model-value="service.enabled !== false"
              @update:model-value="updateOpenApiServiceEnabled(service, $event)"
              class="mcp-server-item-enabled"
            ></tiny-switch>
            <tiny-popover
              trigger="hover"
              popper-class="mcp-server-item-actions-popover"
              :visible-arrow="false"
              :append-to-body="false"
            >
              <template #default>
                <div class="mcp-server-item-actions">
                  <div @click="editOpenApiService(service, index)">
                    <component :is="IconEdit" />
                    <span>{{ t('common.edit') }}</span>
                  </div>
                  <div @click="deleteOpenApiService(service)">
                    <component :is="IconDel" />
                    <span>{{ t('common.remove') }}</span>
                  </div>
                </div>
              </template>
              <template #reference>
                <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
              </template>
            </tiny-popover>
          </div>
        </div>
        <div class="mcp-server-item-description">{{ formatOpenApiSourceLabel(service) }}</div>
      </div>
    </div>
    <div v-show="llmConfig?.openApiTools.length === 0" class="mcp-server-list-empty">
      <div class="mcp-server-item-empty">
        <div class="mcp-server-item-empty-icon">
          {{ t('common.emptyHintPrefix') }}
          <component :is="IconPlus" class="mcp-server-item-empty-plus-icon" />
          {{ t('openApi.emptyAction') }}
        </div>
      </div>
    </div>
    <OpenApiServiceDialog
      :visible="showServiceFormDialog"
      :service-form-data="serviceFormData"
      :preview-data="previewData"
      :preview-status="previewStatus"
      :preview-error="previewError"
      :preview-loading="previewLoading"
      :confirm-loading="confirmLoading"
      @update:visible="
        (val) => {
          if (!val) closeServiceDialog();
          else showServiceFormDialog = val;
        }
      "
      @update:serviceFormData="onUpdateServiceFormData"
      @parseOpenApi="parseOpenApi"
      @confirmOpenApiService="confirmOpenApiService"
    />
  </tiny-collapse-item>
</template>

<style scoped lang="less">
.mcp-server-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .mcp-server-item {
    border: none;
    border-radius: 6px;
    padding: 10px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(246, 246, 246, 1);
    }

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;

      > div:last-child {
        flex-shrink: 0;
      }
    }

    &-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      font-weight: 600;
      color: #191919;
    }

    &-description {
      font-size: 12px;
      color: #999;
      overflow-wrap: break-word;
      margin-top: 4px;
    }

    &-enabled {
      margin-left: 4px;
    }
  }
}

.mcp-server-list-empty {
  margin-top: 12px;
}

.mcp-server-item-empty {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.mcp-server-item-empty-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  letter-spacing: 0.2px;
}

.mcp-server-item-empty-plus-icon {
  width: 12px;
  height: 12px;
  color: #595959;
}

:deep(.mcp-server-item-actions-popover) {
  padding: 0;
  border: none;
}

.mcp-server-item-actions {
  & > div {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 16px;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}
</style>
