<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiRenderer :content="content" :generating="generating" :customComponents="customComponents" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { ref } from 'vue';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-vue';
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
