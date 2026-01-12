<template>
  <div class="attachments-renderer">
    <!-- 图片缩略图 -->
    <div
      v-for="(attachment, index) in imageAttachments"
      :key="attachment.name"
      class="image-thumbnail"
      @click="openFullscreen(attachment)"
    >
      <div class="image-wrapper">
        <img :src="attachment.base64" :alt="attachment.name" />
      </div>
      <!-- 删除按钮 -->
      <button class="delete-btn" @click.stop="handleRemove(attachment)" type="button">
        <IconFileRemove class="delete-btn-icon" />
      </button>
      <!-- Hover 蒙层 -->
      <div class="hover-overlay">
        <span class="preview-text">预览</span>
      </div>
    </div>
    <!-- 非图片文件显示文件名 -->
    <div v-for="attachment in nonImageAttachments" :key="attachment.name" class="file-item">
      <span class="file-name">{{ attachment.name }}</span>
    </div>
    <!-- 全屏预览 -->
    <Transition name="fullscreen-fade">
      <div v-if="fullscreenImage" class="fullscreen-overlay" @click="closeFullscreen">
        <Transition name="image-scale">
          <img
            v-if="fullscreenImage"
            :src="fullscreenImage.base64"
            :alt="fullscreenImage.name"
          />
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { IconFileRemove } from '@opentiny/tiny-robot-svgs';

import type { FileMeta } from '../file-upload/file-utils';
import { IMAGE_MIME_TYPES } from '../file-upload/file-utils';
import { computed, ref } from 'vue';

interface Props {
  attachments: FileMeta[];
}

interface Emits {
  (e: 'remove', attachment: FileMeta | undefined): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fullscreenImage = ref<FileMeta | null>(null);

const isImage = (fileMeta: FileMeta): boolean => {
  return IMAGE_MIME_TYPES.includes(fileMeta.type as any);
};

const imageAttachments = computed(() => {
  return props.attachments.filter((fileMeta) => isImage(fileMeta));
});

const nonImageAttachments = computed(() => {
  return props.attachments.filter((fileMeta) => !isImage(fileMeta));
});

const handleRemove = (attachment: FileMeta) => {
  // 找到在原数组中的实际索引
  emit('remove', attachment);
};

const openFullscreen = (fileMeta: FileMeta) => {
  fullscreenImage.value = fileMeta;
  // 禁止 body 滚动
  document.body.style.overflow = 'hidden';
};

const closeFullscreen = () => {
  fullscreenImage.value = null;
  // 恢复 body 滚动
  document.body.style.overflow = '';
};
</script>

<style scoped lang="less">
.attachments-renderer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.image-thumbnail {
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;
  flex-shrink: 0;

  .image-wrapper {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .delete-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    background-color: transparent;
    .delete-btn-icon {
      width: 14px;
      height: 14px;
    }
  }

  .hover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.2s,
      visibility 0.2s;

    .preview-text {
      color: #fff;
      font-size: 12px;
      font-weight: 500;
    }
  }

  &:hover .hover-overlay {
    opacity: 1;
    visibility: visible;
  }
}

.file-item {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;

  .file-name {
    font-size: 14px;
    color: #333;
    word-break: break-all;
  }
}

.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  padding: 20px;

  img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    cursor: default;
    border-radius: 8px;
  }
}

// 全屏蒙层淡入淡出动画
.fullscreen-fade-enter-active {
  transition: opacity 0.3s ease;
}

.fullscreen-fade-leave-active {
  transition: opacity 0.25s ease;
}

.fullscreen-fade-enter-from,
.fullscreen-fade-leave-to {
  opacity: 0;
}

// 图片放大动画
.image-scale-enter-active {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.4s ease;
}

.image-scale-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19),
    opacity 0.3s ease;
}

.image-scale-enter-from {
  transform: scale(0.2);
  opacity: 0;
}

.image-scale-leave-to {
  transform: scale(0.9);
  opacity: 0;
}
</style>
