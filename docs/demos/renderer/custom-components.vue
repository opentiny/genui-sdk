<template>
  <SchemaRenderer :content="content" :generating="generating" :customComponents="customComponents" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';
import UserProfile from './components/user-profile.vue';
import logo from '../../src/public/logo.svg?url';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'UserProfile',
      props: {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: logo,
      },
    },
  ],
});

const customComponents = {
  UserProfile: UserProfile,
};
</script>
