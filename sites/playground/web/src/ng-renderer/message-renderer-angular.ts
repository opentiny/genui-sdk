import { defineAsyncComponent, h } from 'vue';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);
export function getMessageRendererAngular(instance: InstanceType<typeof GenuiChat>) {
  return (schemaCardProps) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;
    return h(
      'div',
      h(GenuiRendererNg, {
        ...schemaCardProps,
        requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
        generating: instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false,
        customActions: {
          continueChat: continueChatAction,
          saveState: saveStateAction,
        },
        key: schemaCardProps.id,
      }),
    );
  };
}
