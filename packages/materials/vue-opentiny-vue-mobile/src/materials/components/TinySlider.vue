<script setup lang="ts">
import TinySliderBase from '@opentiny/vue-slider';
import { onBeforeUnmount, onMounted, ref } from 'vue';

// TinyVue 3.31 mobile-first 模板给滑块写 role="slider"、给滑槽不写 role，
// 但 renderless 的 bindMouseDown 只认 PC 那套 role 值（tiny-slider__handle / tiny-slider__range），
// 于是所有 mousedown 都被判成点错地方直接 return，滑块拖不动。
// 在捕获阶段临时换成它认的值，事件派发完再还原，不破坏 aria。
// 必须用宏任务还原：真实事件里浏览器在每个监听器之后就会清空微任务队列，
// 微任务会赶在目标元素的 mousedown 监听器之前把 role 改回去。
const ROLE_BY_TAG: Record<string, string> = {
  'tiny-slider-handle': 'tiny-slider__handle',
  'tiny-slider-range': 'tiny-slider__range',
};

defineOptions({ inheritAttrs: false });

const slider = ref<InstanceType<typeof TinySliderBase>>();
let rootEl: HTMLElement | null = null;
const pending = new Map<HTMLElement, string | null>();
let restoreQueued = false;

const patch = (el: Element | null | undefined) => {
  if (!(el instanceof HTMLElement) || pending.has(el)) {
    return;
  }
  const role = ROLE_BY_TAG[el.dataset.tag as string] ?? 'tiny-slider__range';
  pending.set(el, el.getAttribute('role'));
  el.setAttribute('role', role);
};

const restore = () => {
  pending.forEach((role, el) => (role === null ? el.removeAttribute('role') : el.setAttribute('role', role)));
  pending.clear();
  restoreQueued = false;
};

const onPointerDown = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !rootEl?.contains(target)) {
    return;
  }
  patch(target);
  // renderless 用 previousElementSibling 的 role 判断拖的是双滑块里的哪一个
  if (target.dataset.tag === 'tiny-slider-handle') {
    patch(target.previousElementSibling);
  }
  if (!restoreQueued) {
    restoreQueued = true;
    setTimeout(restore, 0);
  }
};

onMounted(() => {
  rootEl = slider.value?.$el as HTMLElement;
  rootEl?.addEventListener('mousedown', onPointerDown, true);
  rootEl?.addEventListener('touchstart', onPointerDown, true);
  rootEl?.addEventListener('mouseenter', onPointerDown, true);
});

onBeforeUnmount(() => {
  rootEl?.removeEventListener('mousedown', onPointerDown, true);
  rootEl?.removeEventListener('touchstart', onPointerDown, true);
  rootEl?.removeEventListener('mouseenter', onPointerDown, true);
  rootEl = null;
});
</script>

<template>
  <TinySliderBase ref="slider" v-bind="$attrs" />
</template>
