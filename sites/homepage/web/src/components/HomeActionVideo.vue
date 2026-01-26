<script setup lang="ts">
import HomeAbility from './HomeAbility.vue';
import genuiActionVedioCover from '@/assets/genui_action_vedio_cover.webp';
import genuiActionVedio from '@/assets/genui_action_vedio.mov';
</script>

<template>
  <home-ability
    class="home-ability-2"
    title="更加流畅的交互方式"
    subtitle="打破两步交互，实现界面到对话的一站式流转"
  >
    <video
      class="cover-image ability-image"
      id="genui-action-vedio"
      controls
      :poster="genuiActionVedioCover"
    >
      <source :src="genuiActionVedio" type="video/mp4" />
    </video>
  </home-ability>
</template>

<style lang="less" scoped>
.ability-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.cover-image {
  border-radius: 32px;
  cursor: pointer;
}
</style>


