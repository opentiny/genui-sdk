import { defineAsyncComponent, h } from 'vue';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';
import { repairJson } from '@opentiny/genui-sdk-core';
import SchemaExportHeader from '../components/SchemaExportHeader.vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);

export function getMessageRendererAngular(instance: InstanceType<typeof GenuiChat>) {
  return (schemaCardProps) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;
    const generating = instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false;

    let schema: any = {};
    let isError = false;
    const content = schemaCardProps.content;
    if (typeof content === 'string') {
      if (content.trim()) {
        const { value } = repairJson(content);
        if (!value || typeof value !== 'object') {
          isError = true;
        } else {
          schema = value;
        }
      }
    } else if (content && typeof content === 'object') {
      schema = content;
    }

    return h(
      'div',
      { class: 'schema-render-container' },
      [
        h(SchemaExportHeader, { schema, isError, isFinished: !generating, framework: 'Angular' }),
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
      ],
    );
  };
}
