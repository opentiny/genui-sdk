<script setup lang="ts">
import { computed } from 'vue';
import { buildBuilderCardProps } from '../../builder';
import BuilderCard from '../BuilderCard.vue';

const props = defineProps<{
  id?: string;
  title?: string;
  input?: string;
  schema?: string;
  content?: unknown;
  createdTime?: string;
  type?: string;
}>();

const cardProps = computed(() => buildBuilderCardProps(props));
</script>

<template>
  <BuilderCard v-bind="cardProps" />
</template>
