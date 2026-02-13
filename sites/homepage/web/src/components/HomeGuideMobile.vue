<script setup lang="ts">
import { ref } from 'vue';
import { TinyButtonGroup, TinyButton } from '@opentiny/vue';

const emit = defineEmits(['change']);

const activeGuide = ref(0);
const handleGuideChange = (index: number) => {
  emit('change', index);
};
</script>

<template>
  <div class="home-guide-mobile">
    <tiny-button-group
      class="home-guide-mobile-button-group"
      v-model="activeGuide"
    >
      <tiny-button :value="0" @click="handleGuideChange(0)">
        引入组件
      </tiny-button>
      <tiny-button :value="1" @click="handleGuideChange(1)">
        使用chat组件
      </tiny-button>
      <tiny-button :value="2" @click="handleGuideChange(2)">
        自定义配置
      </tiny-button>
    </tiny-button-group>
  </div>
</template>

<style lang="less" scoped>
.home-guide-mobile {
  &-button-group {
    display: flex;
  }
}
</style>
