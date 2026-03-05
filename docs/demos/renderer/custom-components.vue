<template>
  <GenuiRenderer :content="content" :generating="generating" :customComponents="customComponents" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import UserProfile from './components/user-profile.vue';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'UserProfile',
      props: {
        name: 'John Doe',
        email: 'john@example.com'
      },
    },
  ],
});

const customComponents = {
  UserProfile: UserProfile,
};
</script>
