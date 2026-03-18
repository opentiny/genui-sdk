<script setup>
import { TinyTabs, TinyTabItem, TinyButtonGroup } from '@opentiny/vue';
import { iconPlus } from '@opentiny/vue-icon';
import { ref, watch, computed, inject, defineAsyncComponent } from 'vue';
import NewSvg from '../assets/images/new.svg?raw';
import OpenSvg from '../assets/images/open.svg?raw';
import CloseSvg from '../assets/images/close.svg?raw';
import MenuSvg from '../assets/images/menu.svg?raw';
import ModelConfig from './tab-components/ModelConfig.vue';
import McpTools from './tab-components/mcpTools.vue';
import GenuiHistory from './tab-components/GenuiHistory.vue';
import { useIsMobile } from '../hooks';
import useTemplate from './genui-template/useTemplate';

const props = defineProps({
  expanded: { type: Boolean, default: true },
  theme: { type: String, default: 'light' },
});

const emit = defineEmits(['update:expanded', 'new-task', 'update:theme']);

const { isTemplateInit } = useTemplate();

const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';
// 条件异步加载 genui-template 组件，不启用时完全不导入，构建时不会被打包
const GenuiTemplateList = ENABLE_TEMPLATE
  ? defineAsyncComponent(() => import('./genui-template/GenuiTemplateList.vue'))
  : shallowRef(null);
// 从上层注入共享的 playground 上下文（这里只需要主题&会话相关）
const playgroundContext = inject('playgroundContext');
const { themeData, conversation } = playgroundContext;

const TinyIconPlus = iconPlus();
const activeName = ref('model');

const { isMobile } = useIsMobile();

const currentConversationTitle = computed(() => {
  const current = conversation.value?.getCurrentConversation?.();
  return current?.title || '新会话';
});

// 侧边栏宽度（使用样式中定义的 CSS 变量，避免重复）
const sidebarWidth = computed(() => (props.expanded ? 'var(--config-tas-width)' : 'var(--config-tas-width-collapsed)'));

watch(isMobile, (mobile) => {
  if (mobile) emit('update:expanded', false);
});

const handleOverlayClick = () => {
  if (isMobile.value) emit('update:expanded', false);
};

const toggleExpanded = () => {
  emit('update:expanded', !props.expanded);
};

const handleNewTask = () => {
  emit('new-task');
  if (isMobile.value) emit('update:expanded', false);
};

const handleCreateNewTemplate = () => {
  activeName.value = 'template';
  if (isMobile.value) emit('update:expanded', false);
};
</script>

<template>
  <div class="playground-sidebar-root">
    <!-- 顶部栏（仅移动端） -->
    <div v-if="isMobile" class="playground-topbar">
      <button
        type="button"
        class="playground-topbar__icon-btn"
        aria-label="打开菜单"
        @click="emit('update:expanded', true)"
      >
        <span class="svg-icon" :innerHTML="MenuSvg"></span>
      </button>
      <div class="playground-topbar__title">
        {{ currentConversationTitle }}
      </div>
      <button type="button" class="playground-topbar__icon-btn" aria-label="新建会话" @click="handleNewTask">
        <span class="svg-icon" :innerHTML="NewSvg"></span>
      </button>
    </div>

    <div
      class="playground-sidebar"
      :class="{
        'playground-sidebar--collapsed': !expanded && !isMobile,
        'playground-sidebar--mobile': isMobile,
        'playground-sidebar--mobile-open': isMobile && expanded,
      }"
      :style="{ width: isMobile ? 'var(--config-tas-width)' : sidebarWidth }"
    >
      <header
        class="playground-sidebar__header"
        :class="{ 'playground-sidebar__header--collapsed': !expanded && !isMobile }"
      >
        <div class="playground-sidebar__brand">
          <img src="/logo.svg" alt="logo" />
          <span v-if="expanded">GenUI</span>
        </div>

        <div class="playground-sidebar__actions">
          <div class="playground-sidebar__actions-inner">
            <span
              v-if="expanded"
              class="svg-icon"
              :innerHTML="CloseSvg"
              :title="isMobile ? '关闭' : '收起'"
              @click="emit('update:expanded', false)"
            ></span>
            <span v-else class="svg-icon" :innerHTML="OpenSvg" title="展开" @click="toggleExpanded"></span>
          </div>
          <span
            v-if="!expanded && !isMobile"
            class="svg-icon"
            :innerHTML="NewSvg"
            title="新建会话"
            @click="handleNewTask"
          ></span>
        </div>
      </header>

      <div class="playground-sidebar__new-task">
        <div v-if="expanded" class="new-task-btn" type="button" @click="handleNewTask">
          <TinyIconPlus :size="16" />
          <span class="new-task-btn__text">新建会话</span>
          <div class="new-task-btn__shortcut">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>
      </div>

      <tiny-tabs class="playground-sidebar__tabs" v-model="activeName" v-show="expanded">
        <tiny-tab-item title="模型配置" name="model">
          <ModelConfig @createNewTemplate="handleCreateNewTemplate" />
        </tiny-tab-item>
        <tiny-tab-item title="工具" name="tools">
          <McpTools />
        </tiny-tab-item>
        <tiny-tab-item title="主题" name="theme">
          <div class="config-title">切换主题</div>
          <tiny-button-group
            size="small"
            :data="themeData"
            :model-value="theme"
            @update:model-value="emit('update:theme', $event)"
          />
        </tiny-tab-item>
        <tiny-tab-item title="历史会话" name="history" class="history-tab">
          <GenuiHistory v-if="conversation" :conversation="conversation" />
        </tiny-tab-item>
        <tiny-tab-item v-if="ENABLE_TEMPLATE" title="模板（实验特性）" name="template">
          <component v-if="GenuiTemplateList && isTemplateInit" :is="GenuiTemplateList"/>
        </tiny-tab-item>
      </tiny-tabs>
    </div>

    <!-- 移动端遮罩层 -->
    <div v-if="isMobile && expanded" class="playground-sidebar__overlay" @click="handleOverlayClick" />

    <!-- 主内容区 -->
    <div class="playground-sidebar__main">
      <slot :activeName="activeName" />
    </div>
  </div>
</template>

<style scoped lang="less">
.playground-sidebar-root {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.playground-sidebar {
  --config-tas-width: 370px;
  --config-tas-width-collapsed: 48px;
  position: relative;
  height: 100%;
  box-sizing: border-box;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  z-index: 1001;
  background: var(--ti-base-color-bg, #fff);

  &--mobile {
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    height: 100dvh;
    transform: translateX(-100%);
    z-index: 1002;

    &.playground-sidebar--mobile-open {
      transform: translateX(0);
      box-shadow: 4px 0 16px rgba(0, 0, 0, 0.12);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 24px 0;

    &--collapsed {
      flex-direction: column;
      gap: 20px;
      padding: 12px 8px 0;
    }
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 16px;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 20px;

    &-inner {
      display: flex;
      align-items: center;
    }
  }

  &__new-task {
    padding: 20px 24px 10px;
  }

  &__tabs {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    .config-title {
      font-size: 14px;
      color: #595959;
      margin-bottom: 12px;
      line-height: 32px;
    }

    :deep(.tiny-tabs__header.is-top) {
      padding: 0 24px;
    }

    :deep(.tiny-tabs__content) {
      height: 100%;
      overflow: auto;
      padding: 0 24px 90px;
    }
  }

  .svg-icon {
    cursor: pointer;
  }
}

.new-task-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 36px;
  border: 1px solid #c2c2c2;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;

  &__text {
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    text-align: justify;
  }

  &__shortcut {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;

    span {
      font-size: 10px;
      line-height: 14px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      padding: 0 6px;
      background: #fafafa;
    }
  }

  &:hover {
    background: #0000000a;
  }

  &.collapsed {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
  }
}

.playground-sidebar__main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.playground-topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f0f0;
  padding: 8px 12px;
  z-index: 2;
}

.playground-topbar:after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -16px;
  height: 16px;
  background: linear-gradient(to bottom, #f0f0f0, transparent);
  pointer-events: none;
}

.playground-topbar__title {
  flex: 1;
  padding: 0 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #191919;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playground-topbar__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;

  .svg-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.playground-sidebar__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1001;
  opacity: 0;
  animation: sidebar-fade-in 0.3s ease forwards;
  cursor: pointer;
}

@keyframes sidebar-fade-in {
  to {
    opacity: 1;
  }
}

@media (min-width: 769px) {
  .playground-sidebar-root {
    flex-direction: row;
  }
}
</style>
