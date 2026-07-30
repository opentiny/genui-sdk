<script setup lang="ts">
import { IconArrowDown, IconCancelled, IconError, IconLoading, IconPlugin } from '@opentiny/tiny-robot-svgs';
import { computed, ref, useCssModule, type Component } from 'vue';
import { useI18n } from '../i18n';

const MAX_HIGHLIGHT_JSON_FIELD_COUNT = 100;

/**
 * 判断 JSON 对象的字段总数是否超过指定阈值（含嵌套 object 的 key 与 array 内 object 的 key）。
 * 超过阈值时提前终止递归，避免对大 payload 做全量遍历。
 *
 * @param value - 待统计的值
 * @param limit - 字段数上限
 * @returns 字段总数是否超过 limit
 */
const exceedsFieldCountLimit = (value: unknown, limit: number): boolean => {
  let count = 0;

  const traverse = (val: unknown): boolean => {
    if (!val || typeof val !== 'object') {
      return false;
    }

    if (Array.isArray(val)) {
      for (const item of val) {
        if (traverse(item)) {
          return true;
        }
      }
      return false;
    }

    for (const item of Object.values(val)) {
      count += 1;
      if (count > limit) {
        return true;
      }
      if (traverse(item)) {
        return true;
      }
    }
    return false;
  };

  return traverse(value);
};

/**
 * 转义 HTML 特殊字符，防止 v-html 注入 XSS。
 *
 * @param text - 待转义的文本
 * @returns 转义后的安全 HTML 文本
 */
const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const props = defineProps<{
  name: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  content?: string | { params?: object; result?: object; [x: string]: unknown };
  formatPretty?: boolean;
  defaultOpen?: boolean;
}>();
const { t } = useI18n();
const opened = ref(props.defaultOpen ?? false);

const textAndIconMap = new Map<string, { text: string; icon: Component }>([
  ['running', { text: t('toolStatus.running'), icon: IconLoading }],
  ['success', { text: t('toolStatus.success'), icon: IconPlugin }],
  ['failed', { text: t('toolStatus.failed'), icon: IconError }],
  ['cancelled', { text: t('toolStatus.cancelled'), icon: IconCancelled }],
]);

const textAndIcon = computed(() => {
  return textAndIconMap.get(props.status) || { text: '', icon: IconPlugin };
});

const classes = useCssModule();

const highlightJSON = <T extends string | object>(json?: T): string => {
  if (!json) {
    return '';
  }

  let prettyJson = '';
  let parsedValue: unknown = json;
  const space = props.formatPretty ? 2 : 0;

  try {
    if (typeof json === 'string') {
      parsedValue = JSON.parse(json);
      prettyJson = JSON.stringify(parsedValue, null, space);
    } else {
      parsedValue = json;
      prettyJson = JSON.stringify(json, null, space);
    }
  } catch (error) {
    console.warn(error);
  }

  const shouldSkipHighlight = exceedsFieldCountLimit(parsedValue, MAX_HIGHLIGHT_JSON_FIELD_COUNT);

  if (shouldSkipHighlight) {
    return escapeHtml(prettyJson);
  }

  prettyJson = prettyJson.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let className = 'number';
      if (/^"/.test(match)) {
        className = /:$/.test(match) ? 'key' : 'string';
      } else if (/true|false/.test(match)) {
        className = 'boolean';
      } else if (/null/.test(match)) {
        className = 'null';
      }
      return `<span class="${classes[className]}">${escapeHtml(match)}</span>`;
    },
  );

  return prettyJson;
};
</script>

<template>
  <div class="tr-bubble__step-tool">
    <div class="tr-bubble__step-tool-header">
      <div class="tr-bubble__step-tool-left">
        <component :is="textAndIcon.icon" class="tr-bubble__step-tool-icon" :class="`icon-${props.status}`" />
        <span class="tr-bubble__step-tool-title">
          {{ textAndIcon.text }}
          <span class="tr-bubble__step-tool-name">{{ props.name }}</span>
        </span>
      </div>
      <div class="tr-bubble__step-tool-expand">
        <IconArrowDown class="expand-icon" :class="{ '-rotate-90': !opened }" @click="opened = !opened" />
      </div>
    </div>
    <div class="tr-bubble__step-tool-params" v-if="opened">
      <hr class="tr-bubble__step-tool-hr" />
      <div class="tr-bubble__step-tool-params-content" v-html="highlightJSON(props.content)"></div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.tr-bubble__step-tool {
  font-size: 14px;
  line-height: 24px;
  padding: 12px;
  color: var(--tr-text-secondary);
  background-color: var(--tr-container-bg-default-2);
  border-radius: 12px;

  .tr-bubble__step-tool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tr-bubble__step-tool-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .tr-bubble__step-tool-icon {
      font-size: 20px;
      flex-shrink: 0;

      &.icon-running {
        color: #898989;
        animation: spin 1s linear infinite;
      }

      &.icon-success {
        color: #898989;
      }

      &.icon-failed,
      &.icon-cancelled {
        color: var(--tr-color-error);
      }
    }

    .tr-bubble__step-tool-title {
      word-break: break-word;
    }

    .tr-bubble__step-tool-name {
      color: var(--tr-text-primary);
      font-weight: 600;
    }
  }

  .tr-bubble__step-tool-expand {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;

    .expand-icon {
      font-size: 16px;

      &.-rotate-90 {
        transform: rotate(-90deg);
      }
    }
  }

  .tr-bubble__step-tool-hr {
    margin: 12px 0;
    color: rgb(219, 219, 219);
  }

  .tr-bubble__step-tool-params-content {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: monospace;
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>

<style module>
.key {
  color: var(--tr-bubble-tool-key-color);
}

.number {
  color: var(--tr-bubble-tool-number-color);
}

.string {
  color: var(--tr-bubble-tool-string-color);
}

.boolean {
  color: var(--tr-bubble-tool-boolean-color);
}

.null {
  color: var(--tr-bubble-tool-null-color);
}
</style>
