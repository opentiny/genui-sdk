<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconRichTextCodeView } from '@opentiny/vue-icon';
import JsonPatchDev from './JsonPatchDev.vue';
import { formatJsonPatch } from './template-chat-utils';
import useTemplate from './useTemplate';
import { useIsMobile } from '../../use-mobile';
import docCardIcon from '../../assets/images/card.svg';
import docEditIcon from '../../assets/images/card-edit.svg';

const TinyIconRichTextCodeView = iconRichTextCodeView();

export interface IRendererProps {
  type: 'json-patch' | 'schema-card';
  cardId: string;
  input: string;
  content: string;
  generatedTime: string;
  schema: string;
  prevSchema: string;
  errorMessagesMap?: Map<string, string>;
}

const props = defineProps<IRendererProps>();
const emit = defineEmits(['click']);

const { getMessageByCardId } = useTemplate();

const generatedTime = computed(() => props.generatedTime ?? '');
const generating = computed(() => !generatedTime.value);

const docIcon = computed(() => (props.type === 'schema-card' ? docCardIcon : docEditIcon));

// 判断当前为开发环境
const isDev = import.meta.env.MODE === 'development';
const { isMobile } = useIsMobile();

const visible = ref(false);
const currentSchema = ref<string>('');
const jsonPatch = ref<string>('');
const prevSchema = ref<string>('');
const errorMessage = computed(() => props.errorMessagesMap?.get(props.cardId) ?? '');

const handleClick = () => {
  emit('click', props.cardId);
};

const handleDev = () => {
  const cardMessage = getMessageByCardId(props.cardId);
  const { prevSchema: prevSchemaStr, content: contentStr, schema: schemaStr } = cardMessage;
  const formattedJsonPatch = formatJsonPatch(JSON.parse(prevSchemaStr), JSON.parse(contentStr));
  jsonPatch.value = JSON.stringify(formattedJsonPatch, null, 2);
  prevSchema.value = prevSchemaStr;
  currentSchema.value = schemaStr;
  visible.value = true;
};
</script>

<template>
  <div :class="['schema-version-card', isMobile ? 'is-mobile' : '']" @click="handleClick">
    <div class="schema-version-card-main">
      <div class="schema-version-card-icon">
        <img :src="docIcon" alt="schema card" class="schema-version-card-icon-image" />
      </div>
      <div class="schema-version-card-content">
        <div class="schema-version-card-content-title">
          {{ props.input.substring(0, 20) }}{{ props.input.length > 20 ? '...' : '' }}
        </div>
        <div class="schema-version-card-content-time">
          <template v-if="generating">生成中...</template>
          <template v-else>创建时间：{{ generatedTime }}</template>
        </div>
      </div>
    </div>
    <div class="schema-version-card-footer">
      <div v-if="isDev && props.type === 'json-patch' && !generating && !isMobile" class="icons-wrap">
        <div class="icon-item" title="调试 jsonPatch" @click.stop="handleDev">
          <TinyIconRichTextCodeView />
        </div>
      </div>
      <div v-if="errorMessage" class="error-message">解析失败</div>
    </div>
  </div>
  <JsonPatchDev
    v-model:visible="visible"
    :currentSchema="currentSchema"
    :jsonPatch="jsonPatch"
    :prevSchema="prevSchema"
  />
</template>

<style scoped lang="less">
.schema-version-card {
  width: 330px;
  max-width: 330px;
  box-sizing: border-box;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  /* 与主 chat 助手气泡等内容区一致（由 GenuiConfigProvider / ThemeProvider 注入 --tr-*） */
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
