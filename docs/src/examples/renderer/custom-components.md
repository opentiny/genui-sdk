# Renderer 组件 - 自定义 Components

自定义 Components 允许你注册自己的 Vue 组件，让 AI 可以在生成的 Schema 中使用这些组件。

## 给组件传递自定义 Components

通过 `customComponents` prop 向 `SchemaRenderer` 组件传递自定义组件映射表。每个自定义组件需要是一个标准的 Vue 组件。

### 示例：注册自定义组件

```vue
<template>
  <SchemaRenderer :content="content" :generating="generating" :customComponents="customComponents" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';
import UserProfile from './components/UserProfile.vue';

const generating = ref(false);
const content = ref({});

const customComponents = {
  UserProfile: UserProfile,
};
</script>
```

### 创建自定义组件

自定义组件需要是一个标准的 Vue 组件：

```vue
<!-- UserProfile.vue -->
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

### 在 Schema 中使用自定义组件

AI 生成的 Schema 可以直接使用你注册的自定义组件：

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

#### 完整示例：

<demo vue="../../../demos/renderer/custom-components.vue" :vueFiles="['../../../demos/renderer/custom-components.vue', '../../../demos/renderer/components/UserProfile.vue']"" />
