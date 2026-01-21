<script setup lang="ts">
import { computed, PropType } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  background: {
    type: String as PropType<'default' | 'morandi'>,
    required: false,
    default: 'default',
  },
});

const backgroundClass = computed(() => props.background === 'default' ? 'default-background' : 'morandi-background');
</script>

<template>
  <section class="home-ability home-ability-2" :class="backgroundClass">
    <div class="home-ability-title">
      <div class="home-ability-title-text genui-title">{{ title }}</div>
      <div class="home-ability-title-subtitle genui-subtitle">{{ subtitle }}</div>
    </div>
    <div class="home-ability-content">
      <slot></slot>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '../style/index.less';

.home-ability {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: calc(100vh-64px);
  padding: 110px 12.5%;
  max-height: calc(100vh - 64px);

  @media (max-width: 1280px) {
    padding: 80px 10% 80px 10%;
  }

  &-title {
    display: flex;
    flex-direction: column;

    @media (max-width: 1280px) {
      &-text {
        font-size: 32px;
        line-height: 42px;
      }
    }

    @media (max-width: 1280px) {
      &-subtitle {
        margin-bottom: 40px;
      }
    }
  }

  &-content {
    flex: 1;
    height: 80%;
  }
}

.morandi-background {
  background: rgba(248, 248, 248, 1);
}
</style>