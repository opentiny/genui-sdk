<script setup lang="ts">
import { ref } from 'vue';
import HomeAbility from './HomeAbility.vue';
import genuiFlowVedioCover from '@/assets/genui_flow_vedio_cover.svg';
import genuiFlowVedio from '@/assets/genui_flow_vedio.mov';
import { useLazyVideo } from '@/composables/useLazyVideo';

const videoRef = ref<HTMLVideoElement | null>(null);
const { videoSrc } = useLazyVideo(videoRef, genuiFlowVedio);
</script>

<template>
  <home-ability
    class="home-ability-4"
    title="界面混排与流式渲染"
    subtitle="生成式UI无侵入接入，支持混排，并实现UI流式渲染，界面无需漫长等待生成"
  >
    <video
      ref="videoRef"
      class="cover-image ability-image"
      id="genui-flow-vedio"
      controls
      preload="none"
      :poster="genuiFlowVedioCover"
    >
      <source v-if="videoSrc" :src="videoSrc" type="video/mp4" />
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

