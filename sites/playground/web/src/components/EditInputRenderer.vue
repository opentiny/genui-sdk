<template>
  <Transition name="slide-in-right" appear>
    <div class="edit-input-container">
      <tiny-input
        v-model="localContent"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 10 }"
        placeholder="编辑消息内容..."
        @keydown="handleKeydown"
        autofocus
      />
      <div class="edit-input-actions">
        <tiny-button size="small" @click="handleCancel">取消</tiny-button>
        <tiny-button type="primary" size="small" :loading="isSaving" @click="handleSave"> 保存 </tiny-button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { TinyInput, TinyButton } from '@opentiny/vue';

interface Props {
  modelValue?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save'): void;
  (e: 'cancel'): void;
}>();

const localContent = computed({
  get: () => props.modelValue || '',
  set: (value: string) => emit('update:modelValue', value),
});

const isSaving = ref(false);

const handleSave = async () => {
  if (!localContent.value.trim()) {
    console.warn('消息内容不能为空');
    return;
  }

  isSaving.value = true;
  try {
    emit('save');
  } finally {
    isSaving.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    handleSave();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    handleCancel();
  }
};
</script>

<style scoped lang="less">
.edit-input-container {
  position: relative;
  background: #ffffff;
  border: 1px solid #1890ff;
  border-radius: 8px;
  padding: 14px 24px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  width: 100%;
  min-width: 200px;
  max-width: 90%;

  :deep(.tiny-textarea) {
    margin-bottom: 8px;
    overflow: hidden;
    textarea {
      border: none;
      padding: 0;
    }
  }

  .edit-input-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
  }
}

// 弹出动画效果
.slide-in-right-enter {
  &-active {
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  &-from {
    transform: translateY(-10px) scale(0.95);
    opacity: 0;
  }

  &-to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.slide-in-right-leave {
  &-active {
    transition: all 0.2s ease;
  }

  &-from {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  &-to {
    transform: translateY(-10px) scale(0.95);
    opacity: 0;
  }
}
</style>
