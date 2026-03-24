<script setup>
import { ref, watch } from 'vue';
import useTemplate from '../genui-template/useTemplate';
import { TinyDialogBox, TinyButton, TinyCheckboxGroup, TinyCheckbox } from '@opentiny/vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  customExamples: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:visible', 'confirmSelectExample', 'createNewTemplate']);

const { templateSchemaList } = useTemplate();
const showSelectExampleBox = ref(false);
const selectedExamples = ref([]);

const cancel = () => {
  emit('update:visible', false);
};

const confirmSelectExample = () => {
  const selectedTemplateSchemas = templateSchemaList.value.filter((item) => selectedExamples.value.includes(item.id));

  emit('confirmSelectExample', selectedTemplateSchemas);
  cancel()
};

// 创建新模板
const createNewTemplate = () => {
  emit('createNewTemplate');
  cancel();
};

watch(() => props.visible, (newVal) => {
  showSelectExampleBox.value = newVal;

  if (newVal) {
    selectedExamples.value = props.customExamples.map((item) => item.id);
  }
});
</script>

<template>
  <tiny-dialog-box v-model:visible="showSelectExampleBox" @close="cancel" title="选择示例模板" width="40%">
    <template #footer>
      <tiny-button @click="cancel">取 消</tiny-button>
      <tiny-button type="primary" @click="createNewTemplate">创建新模板</tiny-button>
      <tiny-button type="primary" @click="confirmSelectExample">确 定</tiny-button>
    </template>
    <template #default>
      <tiny-checkbox-group v-model="selectedExamples" class="template-checkbox-group">
        <div v-for="item in templateSchemaList" :key="item.id" class="template-checkbox-item">
          <tiny-checkbox :label="item.id" :value="item.id">
            <div class="template-checkbox-item__content">
              <span class="template-checkbox-item__title">
                {{ item.name }}
              </span>
            </div>
          </tiny-checkbox>
        </div>
      </tiny-checkbox-group>
    </template>
  </tiny-dialog-box>
</template>

<style scoped>
.template-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow: auto;
  flex-wrap: nowrap;
}

.template-checkbox-item {
  --template-item-radius: 6px;
}

.template-checkbox-item__content {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--template-item-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.template-checkbox-item__title {
  flex: 1;
}

.template-checkbox-item__content:hover {
  background-color: var(--tv-color-bg, rgba(0, 0, 0, 0.03));
  box-shadow: 0 0 0 1px var(--tv-color-border, rgba(0, 0, 0, 0.06));
}
</style>