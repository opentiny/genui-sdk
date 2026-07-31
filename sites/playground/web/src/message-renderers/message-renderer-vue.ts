import { defineComponent, h, provide } from 'vue';
import { GenuiRenderer, GENUI_MATERIALS, type GenuiChat } from '@opentiny/genui-sdk-vue';
import type { IMaterials } from '@opentiny/genui-sdk-core';

const MaterialsScope = defineComponent({
  name: 'MaterialsScope',
  props: {
    materials: { type: Object, required: true },
  },
  setup(props, { slots }) {
    provide(GENUI_MATERIALS, props.materials as IMaterials);
    return () => slots.default?.();
  },
});

export function getMessageRendererVue(
  instance: InstanceType<typeof GenuiChat>,
  materials: IMaterials,
) {
  return (schemaCardProps: Record<string, any>) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;

    return h(
      MaterialsScope,
      { materials },
      {
        default: () =>
          h('div', [
            h(GenuiRenderer, {
              ...schemaCardProps,
              content: schemaCardProps.content,
              requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
              generating:
                instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false,
              customActions: {
                continueChat: continueChatAction,
                saveState: saveStateAction,
              },
              key: `${schemaCardProps.id}`,
            }),
          ]),
      },
    );
  };
}