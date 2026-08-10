<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconRichTextCodeView } from '@opentiny/vue-icon';
import JsonPatchDev from './JsonPatchDev.vue';
import {
  formatJsonPatch,
  parseSchemaJson,
  parseJsonPatchOperations,
  resolveJsonPatchPrevSchemaString,
} from './template-chat-utils';
import { resolveManualEditSaveTitle } from './template-chat-utils/schema-input-ids';
import type { SchemaManualInputType } from './chat.types';
import { useTemplateContext } from './composables';
import { useIsMobile } from '../../use-mobile';
import docCardIcon from '../../assets/images/card.svg';
import docEditIcon from '../../assets/images/card-edit.svg';
import docIncrementalEditorIcon from '../../assets/images/card-manual-editor.svg';
import { t } from '../../i18n';

const TinyIconRichTextCodeView = iconRichTextCodeView();

export interface IRendererProps {
  type: 'json-patch' | 'schema-card' | 'schema-manual';
  cardId: string;
  input: string;
  inputType?: SchemaManualInputType;
  content: string;
  generatedTime: string;
  schema: string;
  prevSchema: string;
  applyFailed?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = defineProps<IRendererProps>();
const emit = defineEmits(['card-select']);

const { conversation, versionControl } = useTemplateContext();

const generatedTime = computed(() => props.generatedTime ?? '');
const generating = computed(() => !generatedTime.value);

const cardTitle = computed(() => {
  const title =
    props.type === 'schema-manual'
      ? resolveManualEditSaveTitle(props)
      : props.input?.trim() || '';
  return title.length > 20 ? `${title.substring(0, 20)}...` : title;
});

const docIcon = computed(() => {
  if (props.type === 'schema-card') {
    return docCardIcon;
  }
  if (props.type === 'schema-manual') {
    return docIncrementalEditorIcon;
  }
  return docEditIcon;
});

const isDev = import.meta.env.MODE === 'development';
const { isMobile } = useIsMobile();

const visible = ref(false);
const currentSchema = ref<string>('');
const jsonPatch = ref<string>('');
const prevSchema = ref<string>('');
const errorMessage = computed(() =>
  props.applyFailed ? 'jsonPatch apply failed' : ''
);

const handleClick = () => {
  emit('card-select', props.cardId);
};

const handleDev = () => {
  const cardMessage = versionControl.getMessageByCardId(props.cardId);
  if (!cardMessage || cardMessage.type !== 'json-patch') {
    return;
  }

  const prevSchemaStr = resolveJsonPatchPrevSchemaString(cardMessage, conversation.messages);
  const baseline = parseSchemaJson(prevSchemaStr);
  const operations = parseJsonPatchOperations(cardMessage.content);
  if (!baseline || !operations) {
    return;
  }

  try {
    jsonPatch.value = JSON.stringify(formatJsonPatch(baseline, operations), null, 2);
  } catch (error) {
    console.error(error);
    jsonPatch.value = JSON.stringify(operations, null, 2);
  }
  prevSchema.value = prevSchemaStr;
  currentSchema.value = cardMessage.schema ?? '';
  visible.value = true;
};
</script>

<template>
  <div class="schema-version-card-root">
  <div :class="['schema-version-card', isMobile ? 'is-mobile' : '']" @click="handleClick">
    <div class="schema-version-card-main">
      <div class="schema-version-card-icon">
        <img :src="docIcon" alt="schema card" class="schema-version-card-icon-image" />
      </div>
      <div class="schema-version-card-content">
        <div class="schema-version-card-content-title">
          {{ cardTitle }}
        </div>
        <div class="schema-version-card-content-time">
          <template v-if="generating">{{ t('templateEditor.generating') }}</template>
          <template v-else>{{ t('templateEditor.createdAt', { time: generatedTime }) }}</template>
        </div>
      </div>
    </div>
    <div class="schema-version-card-footer">
      <div v-if="isDev && props.type === 'json-patch' && !generating && !isMobile" class="icons-wrap">
        <div class="icon-item" :title="t('templateEditor.debugJsonPatch')" @click.stop="handleDev">
          <TinyIconRichTextCodeView />
        </div>
      </div>
      <div v-if="errorMessage" class="error-message">{{ t('templateEditor.parseFailed') }}</div>
    </div>
  </div>
  <JsonPatchDev
    v-model:visible="visible"
    :currentSchema="currentSchema"
    :jsonPatch="jsonPatch"
    :prevSchema="prevSchema"
  />
  </div>
</template>

<style scoped lang="less">
.schema-version-card-root {
  display: contents;
}

.schema-version-card {
  width: 330px;
  max-width: 330px;
  box-sizing: border-box;
  border-radius: 12px;
  position: relative;
  cursor: pointer;

  background-color: var(--tr-bubble-content-bg, #fff);
  display: flex;
  flex-direction: column;
  padding: 16px;

  &.is-mobile {
    width: 100%;
    max-width: 300px;
  }

  &-main {
    display: flex;
    align-items: center;
  }

  &-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
  }

  &-icon-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  &-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-left: 8px;
    height: 40px;
    min-width: 0;

    &-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 22px;
      color: var(--tr-text-primary, rgb(25, 25, 25));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &-time {
      font-size: 12px;
      line-height: 18px;
      color: var(--tr-text-secondary, rgb(128, 128, 128));
    }
  }

  &-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .error-message {
      color: #f00;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
    }

    .icons-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .icon-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      text-align: right;
      cursor: pointer;
      color: var(--tr-text-secondary, rgb(128, 128, 128));

      :deep(svg),
      :deep(svg path) {
        fill: currentColor;
      }

      &:hover {
        color: var(--tr-text-primary, rgb(25, 25, 25));
        background-color: var(--tr-container-bg-default-2, #f0f0f0);
      }
    }
  }
}
</style>
