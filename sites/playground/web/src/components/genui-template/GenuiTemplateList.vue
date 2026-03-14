<script setup lang="ts">
import type { Conversation } from '@opentiny/tiny-robot-kit';
import useTemplate from './useTemplate';
import TemplateList from './TemplateList.vue';

const emit = defineEmits(['switch-template']);

const { templateConversationState, switchTemplate, deleteTemplate, updateTemplateTitle, createTemplate } = useTemplate();

const handleItemClick = (item: Conversation) => {
  switchTemplate(item.id);

  emit('switch-template', item);
};

const handleItemAction = (action: { id: string }, item: Conversation) => {
  if (action.id === 'delete') {
    deleteTemplate(item.id);
  }
};

const handleItemTitleChange = (id: string, title: string) => {
  updateTemplateTitle(id, title);
};

const handleAddItem = () => {
  createTemplate();
};
</script>

<template>
  <div>
    <template-list :list-data="templateConversationState.conversations"
      :current-id="templateConversationState.currentId" @item-click="handleItemClick" @item-action="handleItemAction"
      @item-title-change="handleItemTitleChange" @add-item="handleAddItem" />
  </div>
</template>

<style scoped>
.template-schema-card {
  cursor: pointer;
}

.template-schema-card:hover {
  background-color: #fff;
  border-color: #808080;
}

.template-schema-card-active {
  background-color: #fff;
  border-color: #808080;
}
</style>
