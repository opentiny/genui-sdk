<script setup lang="ts">
import { ref } from 'vue';
import { TinyButtonGroup, TinyButton } from '@opentiny/vue';

const emit = defineEmits(['change']);
const GUIDE_STEP_ONE = 0;
const GUIDE_STEP_TWO = 1;
const GUIDE_STEP_THREE = 2;

const activeGuide = ref(0);
const handleGuideChange = (index: number) => {
  activeGuide.value = index;
  emit('change', index);
};
</script>

<template>
  <div class="home-guide-step-mobile">
    <tiny-button-group class="home-guide-step-mobile-button-group" v-model="activeGuide">
      <tiny-button
        class="home-guide-step-mobile-button"
        :class="{ 'home-guide-step-mobile-button-active': activeGuide === GUIDE_STEP_ONE }"
        :value="GUIDE_STEP_ONE"
        @click="handleGuideChange(GUIDE_STEP_ONE)"
      >
        引入组件
      </tiny-button>
      <tiny-button
        class="home-guide-step-mobile-button"
        :class="{ 'home-guide-step-mobile-button-active': activeGuide === GUIDE_STEP_TWO }"
        :value="GUIDE_STEP_TWO"
        @click="handleGuideChange(GUIDE_STEP_TWO)"
      >
        使用chat组件
      </tiny-button>
      <tiny-button
        class="home-guide-step-mobile-button"
        :class="{ 'home-guide-step-mobile-button-active': activeGuide === GUIDE_STEP_THREE }"
        :value="GUIDE_STEP_THREE"
        @click="handleGuideChange(GUIDE_STEP_THREE)"
      >
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
    background-color: rgb(242, 242, 242);
    display: flex;
    align-items: center;
    padding: 2px;
  }

  .home-guide-step-mobile-button-group {
    .home-guide-step-mobile-button {
      background-color: rgb(242, 242, 242);
      &-active {
        background-color: #fff;
      }
    }
  }

  &-button {
    height: 100%;
    width: 70px;
    margin-left: 0;
    border-radius: 0;
    border: none;
    border-radius: 382px;

    &-active {
      font-weight: 700;
    }
  }
}
</style>
