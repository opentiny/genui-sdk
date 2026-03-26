<script setup lang="ts">
import { ref, computed } from 'vue';
import { iconRichTextCodeView } from '@opentiny/vue-icon';
import JsonPatchDev from './JsonPatchDev.vue';
import { formatJsonPatch } from './template-chat-utils';
import useTemplate from './useTemplate';

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

// 判断当前为开发环境
const isDev = import.meta.env.MODE === 'development';

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
  <div class="schema-version-card" @click="handleClick">
    <div class="schema-version-card-title">
      {{ props.input.substring(0, 20) }}{{ props.input.length > 20 ? '...' : '' }}
    </div>
    <div v-if="generating" class="schema-version-card-loading">生成中...</div>
    <div v-else class="schema-version-card-time">创建时间：{{ generatedTime }}</div>
    <div class="schema-version-card-footer">
      <div v-if="isDev && type === 'json-patch' && !generating" class="icons-wrap">
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
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 344px;
  min-width: 280px;
  overflow: hidden;
  padding: 14px;
  position: relative;

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
      padding: 12px;
      text-align: right;

      &:hover {
        background-color: #f0f0f0;
      }
    }
  }
}
</style>
