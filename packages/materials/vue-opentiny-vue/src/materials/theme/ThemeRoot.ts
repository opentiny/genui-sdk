import TinyConfigProvider from '@opentiny/vue-config-provider';
import { defineComponent, h, onMounted, ref } from 'vue';

export const OpenTinyThemeRoot = defineComponent({
  name: 'OpenTinyThemeRoot',
  inheritAttrs: false,
  setup(_, { slots }) {
    const providerRef = ref<{ $el?: HTMLElement } | null>(null);

    onMounted(() => {
      providerRef.value?.$el?.classList.remove('tiny-config-provider');
    });

    return () =>
      h(
        TinyConfigProvider,
        {
          ref: providerRef,
          style: { height: '100%' },
        },
        slots,
      );
  },
});
