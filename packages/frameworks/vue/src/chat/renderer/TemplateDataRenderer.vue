<template>
  <div class="template-data-renderer">
    <template v-for="(item, index) in templateData" :key="index">
      <!-- text 类型：直接渲染文字 -->
      <span v-if="item.type === 'text'" class="text-item">{{ item.content }}</span>

      <!-- template 类型：渲染文字，如果是图片则 hover 显示预览 -->
      <span v-else-if="item.type === 'template'" class="template-item">
        <tiny-popover width="200" trigger="hover" :content="item.content" placement="top">
          <template #reference>
            <span class="template-text" @click="handleImageClick(item)">{{ item.content }}</span>
          </template>
          <div v-if="isImageTemplate(item)" class="image-preview">
            <img
              class="image-preview-img"
              :src="getImageBase64(item)"
              :alt="item.content"
              @click="handleImageClick(item)"
            />
          </div>
        </tiny-popover>
      </span>
    </template>
    <!-- 全屏预览 -->
    <Transition name="fullscreen-fade">
      <div v-if="fullscreenImage" class="fullscreen-overlay" @click="closeFullscreen">
        <Transition name="image-scale">
          <img v-if="fullscreenImage" :src="fullscreenImage.base64" :alt="fullscreenImage.name" />
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { UserItem } from '@opentiny/tiny-robot';
import type { FileMeta } from '../file-upload/file-utils';
import { IMAGE_MIME_TYPES } from '../file-upload/file-utils';
import { ref } from 'vue';
import { TinyPopover } from '@opentiny/vue';

interface Props {
  templateData?: UserItem[];
  attachments?: FileMeta[];
}

const props = withDefaults(defineProps<Props>(), {
  templateData: () => [],
  attachments: () => [],
});

const fullscreenImage = ref<FileMeta | null>(null);

// 判断是否为图片类型
const isImageTemplate = (item: UserItem): boolean => {
  if (item.type !== 'template' || !item.content) {
    return false;
  }

  // 从 attachments 中找到对应的文件
  const attachment = props.attachments.find((fileMeta) => fileMeta.name === item.content);

  if (!attachment) {
    return false;
  }

  // 判断文件类型是否为图片
  return IMAGE_MIME_TYPES.includes(attachment.type as any);
};

// 获取图片的 base64 数据
const getImageBase64 = (item: UserItem): string => {
  if (item.type !== 'template' || !item.content) {
    return '';
  }

  const attachment = props.attachments.find((fileMeta) => fileMeta.name === item.content);

  return attachment?.base64 || '';
};

// 获取对应的 attachment
const getAttachment = (item: UserItem): FileMeta | undefined => {
  if (item.type !== 'template' || !item.content) {
    return undefined;
  }

  return props.attachments.find((fileMeta) => fileMeta.name === item.content);
};

// 处理图片点击事件
const handleImageClick = (item: UserItem) => {
  const fileMeta = getAttachment(item);
  if (!fileMeta) {
    return;
  }
  openFullscreen(fileMeta);
};

// 打开全屏预览
const openFullscreen = (fileMeta: FileMeta) => {
  fullscreenImage.value = fileMeta;
  // 禁止 body 滚动
  document.body.style.overflow = 'hidden';
};

// 关闭全屏预览
const closeFullscreen = () => {
  fullscreenImage.value = null;
  // 恢复 body 滚动
  document.body.style.overflow = '';
};
</script>

<style scoped lang="less">
.template-data-renderer {
  display: inline;
  word-break: break-word;
}

.text-item {
  display: inline;
}

.template-item {
  position: relative;
  display: inline;

  .template-text {
    display: inline;
    cursor: pointer;
    color: #1476ff;
    background-color: rgba(20, 118, 255, 0.1);
    padding: 2px 4px;
    border-radius: 4px;
  }
}
.image-preview {
  max-width: 200px;
  cursor: pointer;
  .image-preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
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
