<template>
  <div class="product-card">
    <img v-if="image" :src="image" :alt="name" class="product-image" />
    <div class="product-info">
      <h3 class="product-name">{{ name }}</h3>
      <p class="product-price">¥{{ price }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  price: number;
  image?: string;
}>();
</script>

<style scoped>
.product-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  background: #fff;
}
.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}
.product-info {
  padding: 16px;
}
.product-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 500;
}
.product-price {
  margin: 0;
  color: #f56c6c;
  font-size: 20px;
  font-weight: bold;
}
</style>

