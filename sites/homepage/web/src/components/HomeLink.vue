<script setup lang="ts">
import { Button as TinyButton } from "@opentiny/vue";
</script>

<template>
  <section class="home-link">
    <div class="home-link-content">
      <div class="home-link-title genui-title">即刻体验OpenTiny生成式UI</div>
      <div class="home-link-description genui-subtitle">
        增强大模型对话显示与交互，打造极致顺滑的智能体验
      </div>
      <div class="home-link-button-group">
        <tiny-button type="primary" round>立即体验</tiny-button>
        <tiny-button round>产品文档</tiny-button>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
.home-link {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 102px 12.5%;
  background-image: url("@/assets/genui_ability_bg_3.svg");
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
    color: rgba(128, 128, 128, 1);
    font-size: 18px;
    font-weight: 400;
    line-height: 26px;
    text-align: center;
    margin-bottom: 36px;
  }
}
</style>
