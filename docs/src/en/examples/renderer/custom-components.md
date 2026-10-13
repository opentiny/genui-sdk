# Renderer - Custom Components

Custom components let you register your own components. With the right prompts, the LLM can output matching `componentName` values in schema JSON for `GenuiRenderer` to render.

## Passing customComponents to the Renderer

Pass a component map via `customComponents` on `GenuiRenderer`.

### Example: Register a Custom Component

```vue {8,13-15}
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
const content = ref({});

const customComponents = {
  UserProfile: UserProfile,
};
</script>
```

### Create the Custom Component

Use a standard Vue component:

```vue
<!-- user-profile.vue -->
<template>
  <div class="user-profile">
    <div class="avatar">
      <img v-if="avatar" :src="avatar" :alt="name" />
      <div v-else class="avatar-placeholder">{{ name?.[0] || 'U' }}</div>
    </div>
    <div class="user-info">
      <div class="user-name">{{ name }}</div>
      <div class="user-email">{{ email }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name?: string;
  email?: string;
  avatar?: string;
}>();
</script>

<style scoped>
.user-profile {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 16px 0;
  background: #fff;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 16px;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1890ff;
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.user-email {
  font-size: 14px;
  color: #666;
}
</style>
```

### Use Custom Components in Schema

Generated schema can reference registered components:

```json
{
  "componentName": "UserProfile",
  "props": {
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

#### Full Example

<demo vue="../../../../demos/renderer/custom-components.vue" :vueFiles="['../../../../demos/renderer/custom-components.vue', '../../../../demos/renderer/components/user-profile.vue']" />
