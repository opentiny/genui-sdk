<script setup lang="ts">
import HomeAbility from './HomeAbility.vue';
import genuiFlowVedioCover from '@/assets/genui_flow_vedio_cover.svg';
import genuiFlowVedio from '@/assets/genui_flow_vedio.mov';
</script>

<template>
  <home-ability
    class="home-ability-4"
    title="界面混排与流式渲染"
    subtitle="生成式UI无侵入接入，支持混排，并实现UI流式渲染，界面无需漫长等待生成"
  >
    <video
      class="cover-image ability-image"
      id="genui-flow-vedio"
      controls
      :poster="genuiFlowVedioCover"
    >
      <source :src="genuiFlowVedio" type="video/mp4" />
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

