<script setup lang="ts">
import { onMounted, ref, type ComponentPublicInstance } from 'vue';

const props = defineProps<{
  /**
   * 真实的图标组件，例如 IconAi / IconUser
   */
  icon: any;
}>();

const wrapperRef = ref<ComponentPublicInstance | null>(null);

const updateSvgIds = () => {
  const root = (wrapperRef.value as any)?.$el as HTMLElement | null;
  if (!root) return;

  let svg: SVGSVGElement | null = null;

  if (root instanceof SVGSVGElement) {
    svg = root as SVGSVGElement;
  } else {
    svg = root.querySelector('svg');
  }

  if (!svg) return;

  const prefix = 'genui-template-svg-';

  const idMap = new Map<string, string>();

  const getNewId = (oldId: string) => {
    if (!idMap.has(oldId)) {
      idMap.set(oldId, `${prefix}${oldId}`);
    }
    return idMap.get(oldId)!;
  };

  svg.querySelectorAll<HTMLElement>('[id]').forEach((el) => {
    const oldId = el.getAttribute('id');
    if (!oldId) return;
    const newId = getNewId(oldId);
    el.setAttribute('id', newId);
  });

  const replaceIdRefs = (value: string | null) => {
    if (!value) return value;
    // 只处理 url(#id) / #id 这种形式
    return value.replace(/url\(#([^)]+)\)|#([A-Za-z_][\w:-]*)/g, (match, g1, g2) => {
      const id = g1 || g2;
      if (!idMap.has(id)) return match;
      const newId = getNewId(id);
      if (match.startsWith('url(')) {
        return `url(#${newId})`;
      }
      if (match.startsWith('#')) {
        return `#${newId}`;
      }
      return match;
    });
  };

  const attrNames = ['fill', 'stroke', 'filter', 'mask', 'clip-path'];

  svg.querySelectorAll<HTMLElement>('*').forEach((el) => {
    attrNames.forEach((name) => {
      const val = el.getAttribute(name);
      const next = replaceIdRefs(val);
      if (next !== val && next != null) {
        el.setAttribute(name, next);
      }
    });

    ['href', 'xlink:href'].forEach((name) => {
      const val = el.getAttribute(name);
      const next = replaceIdRefs(val);
      if (next !== val && next != null) {
        el.setAttribute(name, next);
      }
    });
  });
};

onMounted(() => {
  updateSvgIds();
});
</script>

<template>
  <component ref="wrapperRef" :is="icon" />
</template>

