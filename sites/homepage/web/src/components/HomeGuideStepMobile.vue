<script setup lang="ts">
import { ref } from 'vue';
import { TinyButtonGroup, TinyButton } from '@opentiny/vue';

const emit = defineEmits(['change']);

const activeGuide = ref(0);
const handleGuideChange = (index: number) => {
  activeGuide.value = index;
  emit('change', index);
};
</script>

<template>
  <div class="home-guide-step-mobile">
    <tiny-button-group
      class="home-guide-step-mobile-button-group"
      v-model="activeGuide"
    >
      <tiny-button class="home-guide-step-mobile-button" :class="{ 'home-guide-step-mobile-button-active': activeGuide === 0 }" :value="0" @click="handleGuideChange(0)">
        引入组件
      </tiny-button>
      <tiny-button class="home-guide-step-mobile-button" :class="{ 'home-guide-step-mobile-button-active': activeGuide === 1 }" :value="1" @click="handleGuideChange(1)">
        使用chat组件
      </tiny-button>
      <tiny-button class="home-guide-step-mobile-button" :class="{ 'home-guide-step-mobile-button-active': activeGuide === 2 }" :value="2" @click="handleGuideChange(2)">
        自定义配置
      </tiny-button>
    </tiny-button-group>
  </div>
</template>

<style lang="less" scoped>
.home-guide-step-mobile {
  display: flex;
  justify-content: center;

  &-button-group {
    border-radius: 382px;
    width: fit-content;
    height: 28px;
    background-color: rgba(242, 242, 242, 1);
    display: flex;
    align-items: center;
    padding: 2px;
  }

  &-button {
    height: 100%;
    width: 70px;
    margin-left: 0;
    border-radius: 0;
    border: none;
    background-color: rgba(242, 242, 242, 1) !important;
    border-radius: 382px;

    &-active {
      background-color: #fff !important;
      font-weight: 700;
    }
  }
}
</style>
