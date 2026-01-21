<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="home-guide-card" :class="{ 'home-guide-card-active': active }">
    <div class="home-guide-card-left">
      <img :src="img" alt="home-guide-card-img" />
    </div>
    <div class="home-guide-card-right">
      <div class="home-guide-card-right-title">
        {{ title }}
      </div>
      <div class="home-guide-card-right-description">
        {{ description }}
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import '../style/index.less';

.home-guide-card {
  display: flex;
  padding: 5%;

  &-active {
    background-color: rgba(246, 246, 246, 1);
    border-radius: 20px;
  }

  &-left {
    margin-right: 16px;

    img {
      width: 32px;
      height: 32px;
    }
  }

  &-right {
    &-title {
      font-size: var(--font-size-body-md);
      line-height: var(--line-height-body-md);
      font-weight: 600;
      letter-spacing: 0px;
      margin-bottom: 12px;
    }

    &-description {
      color: rgba(128, 128, 128, 1);
      font-size: var(--font-size-body-sm-sm);
      font-weight: 400;
      line-height: var(--line-height-body-xs);
      letter-spacing: 0px;
    }
  }
}
</style>