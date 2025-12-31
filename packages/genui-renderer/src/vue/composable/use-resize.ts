import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';

export interface IElementSize {
  width: number;
  height: number;
}

export function useResize(targetRef: Ref<HTMLElement | undefined>) {
  const width = ref(0);
  const height = ref(0);

  let resizeObserver: ResizeObserver | null = null;
  let frameId: number | null = null;

  const updateSize = (element: HTMLElement | undefined) => {
    if (!element) {
      width.value = 0;
      height.value = 0;
      return;
    }
    const rect = element.getBoundingClientRect();
    width.value = rect.width;
    height.value = rect.height;
  };

  const scheduleUpdate = (element: HTMLElement) => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
    frameId = requestAnimationFrame(() => {
      updateSize(element);
      frameId = null;
    });
  };

  const cleanupObserver = () => {
    if (resizeObserver && targetRef.value) {
      resizeObserver.unobserve(targetRef.value);
    }
    resizeObserver = null;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined' || !targetRef.value) {
      return;
    }

    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const target = entry.target as HTMLElement;

      scheduleUpdate(target);
    });
    resizeObserver.observe(targetRef.value);
    updateSize(targetRef.value);
  });


  onBeforeUnmount(() => {
    cleanupObserver();
  });

  return {
    width,
    height
  };
}

