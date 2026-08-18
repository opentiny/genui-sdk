import TinyConfigProvider from '@opentiny/vue-config-provider';
import { defineComponent, h, onMounted, ref } from 'vue';

export const OpenTinyThemeRoot = defineComponent({
  name: 'OpenTinyThemeRoot',
  inheritAttrs: false,
  expose: ['setColorScheme'],
  setup(_, { slots, attrs, expose }) {
    const providerRef = ref<{ $el?: HTMLElement } | null>(null);

    onMounted(() => {
      providerRef.value?.$el?.classList.remove('tiny-config-provider');
    });

    function setColorScheme(scheme: 'light' | 'dark') {
      providerRef.value?.$el?.setAttribute('data-color-scheme', scheme);
    }

    expose({ setColorScheme });

    return () =>
      h(
        TinyConfigProvider,
        {
          ref: providerRef,
          style: { height: '100%' },
          ...attrs,
        },
        slots,
      );
  },
});
