import { defineComponent, h, markRaw, ref, type Ref } from 'vue';

// 解决同个svg引用形状id冲突，不能解决不同svg引用id冲突

const iconMap: Ref<Array<any>> = ref([]);
export default function useIcon() {
  function addIcons(...icons: Array<ReturnType<typeof defineComponent>>) {
    iconMap.value.push(...icons.map((icon) => markRaw(icon)));
  }
  function topRenderer() {
    return () =>
      h(
        'div',
        iconMap.value.map((icon) => h(icon, { style: { width: 0, height: 0 } })),
      );
  }

  return {
    addIcons,
    topRenderer,
  };
}
