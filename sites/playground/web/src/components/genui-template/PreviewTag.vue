<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';

interface Props {
  title?: string;
  /** 组件 id，存在时 hover/leave 时向外派发事件，供渲染器联动高亮对应组件 */
  componentId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  componentId: '',
});

const emit = defineEmits<{
  (e: 'hover', id: string): void;
  (e: 'leave'): void;
}>();

const handleMouseEnter = () => {
  if (props.componentId) {
    emit('hover', props.componentId);
  }
};

const handleMouseLeave = () => {
  emit('leave');
};

const fullscreenOpen = ref(false);

const openFullscreen = () => {
  fullscreenOpen.value = true;
  document.body.style.overflow = 'hidden';
};

const closeFullscreen = () => {
  fullscreenOpen.value = false;
  document.body.style.overflow = '';
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeFullscreen();
  }
};

watch(fullscreenOpen, (open) => {
  if (open) {
    document.body.addEventListener('keydown', handleKeydown);
  } else {
    document.body.removeEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  document.body.removeEventListener('keydown', handleKeydown);
  if (fullscreenOpen.value) {
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <span
    class="preview-tag"
    @click="openFullscreen"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot>{{ title }}</slot>

    <Teleport to="body">
      <Transition name="preview-fade">
        <div v-if="fullscreenOpen" class="preview-tag__overlay" @click="closeFullscreen">
          <Transition name="preview-zoom" appear>
            <div class="preview-tag__overlay-body" @click.stop>
              <slot name="fullscreen">{{ title }}</slot>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped lang="less">
.preview-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  vertical-align: baseline;
  cursor: pointer;
}

.preview-tag__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  cursor: pointer;

  .preview-tag__overlay-body {
    max-width: 90%;
    max-height: 90%;
    overflow: auto;
    padding: 16px 20px;
    border-radius: 8px;
    background: #fff;
    cursor: default;
  }
}

.preview-fade-enter-active {
  transition: opacity 0.3s ease;
}

.preview-fade-leave-active {
  transition: opacity 0.25s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.preview-zoom-enter-active {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.4s ease;
}

.preview-zoom-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19),
    opacity 0.3s ease;
}

.preview-zoom-enter-from {
  transform: scale(0.2);
  opacity: 0;
}

.preview-zoom-leave-to {
  transform: scale(0.9);
  opacity: 0;
}
</style>
