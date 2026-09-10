<script setup lang="ts">
import { ref } from 'vue';
import { TinyButtonGroup, TinyButton } from '@opentiny/vue';
import { t } from '@/i18n';

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
        :reset-time="0"
        @click="handleGuideChange(GUIDE_STEP_ONE)"
      >
        {{ t('guide.step1.mobile') }}
      </tiny-button>
      <tiny-button
        class="home-guide-step-mobile-button"
        :class="{ 'home-guide-step-mobile-button-active': activeGuide === GUIDE_STEP_TWO }"
        :value="GUIDE_STEP_TWO"
        :reset-time="0"
        @click="handleGuideChange(GUIDE_STEP_TWO)"
      >
        {{ t('guide.step2.mobile') }}
      </tiny-button>
      <tiny-button
        class="home-guide-step-mobile-button"
        :class="{ 'home-guide-step-mobile-button-active': activeGuide === GUIDE_STEP_THREE }"
        :value="GUIDE_STEP_THREE"
        :reset-time="0"
        @click="handleGuideChange(GUIDE_STEP_THREE)"
      >
        {{ t('guide.step3.mobile') }}
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
    width: 100%;
    height: 32px;
    background-color: rgb(242, 242, 242);
    display: flex;
    align-items: center;
    padding: 2px;
  }

  .home-guide-step-mobile-button-group {
    display: flex;
    justify-content: space-between;
    .home-guide-step-mobile-button {
      background-color: rgb(242, 242, 242);
      &-active {
        background-color: #fff;
      }
    }
    @media (min-width: 768px) and (max-width: 1280px) {
      width: 53%;
      height: 56px;
    }
  }

  &-button {
    height: 100%;
    width: 110px;
    margin-left: 0;
    border-radius: 0;
    border: none;
    border-radius: 382px;

    &-active {
      font-weight: 700;
    }

    @media (min-width: 768px) and (max-width: 1280px) {
      width: 157px;
    }
  }
}
</style>
