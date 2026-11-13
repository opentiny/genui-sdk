<!-- 修复 mobile-first 的滑块划不动的问题 -->
<script setup lang="ts">
import TinySliderBase from '@opentiny/vue-slider';
import { onBeforeUnmount, onMounted, ref } from 'vue';

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
  <TinySliderBase ref="slider" v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </TinySliderBase>
</template>
