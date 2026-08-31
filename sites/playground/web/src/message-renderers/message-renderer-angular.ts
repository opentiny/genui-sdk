import { defineAsyncComponent, h } from 'vue';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';
import SchemaCardExportShell from '../components/SchemaExportHeader.vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);
export function getMessageRendererAngular(instance: InstanceType<typeof GenuiChat>) {
  return (schemaCardProps) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;
    const generating =
      instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false;

    return h(
      SchemaCardExportShell,
      {
        framework: 'angular',
        content: schemaCardProps.content,
        generating,
      },
      {
        default: () =>
          h(GenuiRendererNg, {
            ...schemaCardProps,
            requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
            generating,
            customActions: {
              continueChat: continueChatAction,
              saveState: saveStateAction,
            },
            key: schemaCardProps.id,
          }),
      },
    );
  };
}
