<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { LinkKey, linkMap } from '@/utils/link';
import { TinyButton } from '@opentiny/vue';
import { useMobile } from '@/composables/useMobile';

type ButtonSize = 'medium' | 'large';

const buttonSize = ref<ButtonSize>('medium');
const { isMobile } = useMobile();

const updateButtonSize = () => {
  if (typeof window === 'undefined') return;

  buttonSize.value = window.innerWidth >= 1920 ? 'large' : 'medium';
};

onMounted(() => {
  updateButtonSize();
  window.addEventListener('resize', updateButtonSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateButtonSize);
});
</script>

<template>
  <section class="home-link">
    <div class="home-link-content">
      <div class="home-link-title genui-title">即刻体验OpenTiny生成式UI</div>
      <div v-if="!isMobile" class="home-link-description genui-subtitle">
        增强大模型对话显示与交互，打造极致顺滑的智能体验
      </div>
      <div v-else class="home-link-description genui-subtitle">
        <div>增强大模型对话显示与交互</div>
        <div>打造极致顺滑的智能体验</div>
      </div>
      <div class="home-link-button-group">
        <a :href="linkMap[LinkKey.Playground]" target="_blank" class="btn-link">
          <tiny-button type="primary" :size="buttonSize" round>立即体验</tiny-button>
        </a>
        <a :href="linkMap[LinkKey.DevDoc]" target="_blank" class="btn-link">
          <tiny-button :size="buttonSize" round ghost>产品文档</tiny-button>
        </a>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>

.btn-link {
  + .btn-link {
    margin-left: 16px;
  }
}

.home-link {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 102px 12.5%;
  background-image: url('@/assets/genui_ability_bg_3.svg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;

  &-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  &-description {
    color: rgba(89, 89, 89, 1);
    font-size: 16px;
    font-weight: 400;
    line-height: 26px;
    text-align: center;
    margin-bottom: 36px;
  }

  @media (min-width: 1920px) {
    &-description {
      font-size: 18px;
    }

    &-button-group {
      display: flex;
      gap: 20px;
    }
  }
}
</style>
  