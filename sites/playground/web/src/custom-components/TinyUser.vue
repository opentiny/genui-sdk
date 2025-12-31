<template>
  <div>TinyUser组件测试：用户名：{{ name }}, 工号是xxxxx</div>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
});
</script>
