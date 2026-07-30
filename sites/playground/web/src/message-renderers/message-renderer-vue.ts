import { defineComponent, h, provide } from 'vue';
import { GenuiRenderer, GENUI_MATERIALS, type GenuiChat } from '@opentiny/genui-sdk-vue';
import type { IMaterials } from '@opentiny/genui-sdk-core';

type ComponentLib = 'TinyVue' | 'Element';

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

function inferComponentLib(content: unknown): ComponentLib | null {
  const s = typeof content === 'string' ? content : '';
  if (/componentName"\s*:\s*"El/.test(s)) return 'Element';
  if (/componentName"\s*:\s*"Tiny/.test(s)) return 'TinyVue';
  return null;
}

export function getMessageRendererVue(
  instance: InstanceType<typeof GenuiChat>,
  materialsMap: Record<string, IMaterials>,
  fallbackMaterials: IMaterials,
) {
  return (schemaCardProps: Record<string, any>) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;

    const lib: ComponentLib =
      schemaCardProps.componentLib ||
      inferComponentLib(schemaCardProps.content) ||
      'TinyVue';
    const materials = materialsMap[lib] ?? fallbackMaterials;

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
              key: `${schemaCardProps.id}-${lib}`,
            }),
          ]),
      },
    );
  };
}