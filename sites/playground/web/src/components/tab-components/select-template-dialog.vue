<script setup>
import { ref } from 'vue';
import useTemplate from '../genui-template/useTemplate';

const { templateConversationState } = useTemplate();
const showSelectExampleBox = ref(false);
// 从模板页签中获取的示例模板列表，用于多选
const exampleTemplates = computed(() => templateConversationState.conversations);
const selectedExamples = ref([]);

const cancel = () => {
  showSelectExampleBox.value = false;
};

const confirmSelectExample = () => {
  emit('confirmSelectExample', selectedExamples.value);
  showSelectExampleBox.value = false;
};
</script>

<template>
  <tiny-dialog-box v-model:visible="showSelectExampleBox" title="选择示例模板" width="30%">
    <template #footer>
      <tiny-button @click="cancel" round>取 消</tiny-button>
      <tiny-button type="primary" @click="confirmSelectExample" round>确 定</tiny-button>
    </template>
    <template #default>
      <!-- 可多选的模板示例列表 -->
      <tiny-checkbox-group v-model="selectedExamples">
        <tiny-checkbox v-for="item in exampleTemplates" :key="item.id" :label="item.title" :value="item.id">
          {{ item.title }}
        </tiny-checkbox>
      </tiny-checkbox-group>
    </template>
  </tiny-dialog-box>
</template>