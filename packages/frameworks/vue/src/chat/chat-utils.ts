import { nextTick, onMounted, onUnmounted, type Ref, ref, h } from 'vue';
import type { Component, VNode } from 'vue';

function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastTime = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const elapsed = now - lastTime;

    // 如果距离上次执行时间超过 delay，立即执行
    if (elapsed >= delay) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else {
      // 否则，清除之前的定时器，设置新的定时器，确保最后一次调用也会执行
      if (timer) {
        clearTimeout(timer);
      }
      const remaining = delay - elapsed;
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

const scrollEnd = (container: Ref<HTMLElement | undefined>) => {
  const isLastMessageInBottom = ref(false);
  const isScrollByUser = ref(false);
  let scrollByUserTimer: ReturnType<typeof setTimeout> | null = null;

  const updateIsLastMessageInBottom = () => {
    if (container.value) {
      isLastMessageInBottom.value =
        container.value.scrollTop + container.value.clientHeight + 130 >= container.value.scrollHeight;
    }
  };
  const scrollToBottom = () => {
    if (container.value) {
      nextTick(() => {
        container.value?.scrollTo({
          top: container.value.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  };

  // 用于切换会话时的滚动，带重试机制，确保在 DOM 完全渲染后滚动到底部
  const scrollToBottomWithRetry = (maxRetries = 10, retryDelay = 150) => {
    if (!container.value) return;

    let retryCount = 0;
    let lastScrollHeight = 0;
    let stableCount = 0; // 用于记录 scrollHeight 稳定的次数

    const attemptScroll = () => {
      if (!container.value) return;

      const currentScrollHeight = container.value.scrollHeight;
      const scrollTop = container.value.scrollTop;
      const clientHeight = container.value.clientHeight;
      const isAtBottom = scrollTop + clientHeight + 10 >= currentScrollHeight;

      // 如果 scrollHeight 还在变化，说明内容还在渲染，重置稳定计数
      if (currentScrollHeight !== lastScrollHeight) {
        lastScrollHeight = currentScrollHeight;
        stableCount = 0;
        retryCount = 0; // 重置重试计数，因为内容还在变化
      } else {
        stableCount++;
      }

      // 如果已经在底部，不需要滚动
      if (isAtBottom) {
        return;
      }

      // 等待 scrollHeight 稳定（连续两次相同）后再滚动，或者已经重试了多次
      if (stableCount >= 2 || retryCount >= 2) {
        scrollToBottom();
      }

      // 如果还没到底部且还有重试次数，继续重试
      if (!isAtBottom && retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
          requestAnimationFrame(() => {
            attemptScroll();
          });
        }, retryDelay);
      }
    };

    setTimeout(() => {
      attemptScroll();
      updateIsLastMessageInBottom();
    }, 50);
  };
  const autoScrollToBottom = () => {
    // 当内容不在底部时，或者用户手动滚动时，不会触发自动滚动

    if (!isLastMessageInBottom.value || isScrollByUser.value) {
      return;
    }
    scrollToBottom();
  };
  const handleUserScroll = () => {
    isScrollByUser.value = true;
    if (scrollByUserTimer) {
      clearTimeout(scrollByUserTimer);
    }
    scrollByUserTimer = setTimeout(() => {
      isScrollByUser.value = false;
      scrollByUserTimer = null;
    }, 100);
  };

  onMounted(() => {
    updateIsLastMessageInBottom();
    if (container.value) {
      container.value.addEventListener('scroll', updateIsLastMessageInBottom, { passive: true });
      container.value.addEventListener('wheel', handleUserScroll, { passive: true });
      container.value.addEventListener('touchmove', handleUserScroll, { passive: true });
    }
  });
  onUnmounted(() => {
    if (container.value) {
      container.value.removeEventListener('scroll', updateIsLastMessageInBottom);
      container.value.removeEventListener('wheel', handleUserScroll);
      container.value.removeEventListener('touchmove', handleUserScroll);
    }
  });

  return {
    scrollToBottom,
    scrollToBottomWithRetry,
    autoScrollToBottom,
    isLastMessageInBottom,
    updateIsLastMessageInBottom,
  };
};

type ISlotProps = any;

// 将组件或函数转换为插槽函数
export const toSlotFunction = (slot: Component<ISlotProps> | ((props: ISlotProps) => VNode | VNode[]) | undefined) => {
  if (!slot) return undefined;
  // 检查是否是函数形式的插槽（函数插槽通常没有 __name 等组件属性）
  if (typeof slot === 'function' && !('__name' in slot || 'setup' in slot || 'render' in slot)) {
    return slot as (props: ISlotProps) => VNode | VNode[];
  }
  // 如果是组件，转换为插槽函数
  return (props: ISlotProps) => h(slot as Component<ISlotProps>, props);
};

export { scrollEnd, throttle };
