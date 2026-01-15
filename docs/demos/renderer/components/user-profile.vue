<template>
  <div class="user-profile">
    <div class="avatar">
      <img v-if="avatar" :src="avatar" :alt="name" />
      <div v-else class="avatar-placeholder">{{ name?.[0] || 'U' }}</div>
    </div>
    <div class="user-info">
      <div class="user-name">{{ name }}</div>
      <div v-if="email" class="user-email">{{ email }}</div>
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

