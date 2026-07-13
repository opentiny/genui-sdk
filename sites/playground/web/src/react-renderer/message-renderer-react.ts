import { defineAsyncComponent, h } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import { repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';

type GenuiChatInstance = InstanceType<typeof GenuiChat>;

const SchemaRendererReactAdapter = defineAsyncComponent(() =>
  import('schema-renderer-react-adapter').then((m) => m.SchemaRendererReactAdapter),
);

function parseSchema(content: string | Record<string, unknown>) {
  if (typeof content === 'object' && content !== null) {
    return content;
  }
  if (typeof content !== 'string') {
    return null;
  }
  const { value, state } = repairJson(content);
  if (state === RepairJsonState.SUCCESS || state === RepairJsonState.REPAIRED) {
    return value;
  }
  return null;
}

export function getMessageRendererReact(instance: GenuiChatInstance) {
  return (schemaCardProps) => {
    const schema = parseSchema(schemaCardProps.content);
    if (!schema) {
      return null;
    }

    const { continueChatAction, saveStateAction } = instance;
    return h('div', [
      h(SchemaRendererReactAdapter, {
        schema,
        generating: instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false,
        isJsonComplete: schemaCardProps.isJsonComplete,
        customActions: {
          continueChat: continueChatAction,
          saveState: saveStateAction,
        },
        rendererId: schemaCardProps.id,
        rendererState: schemaCardProps.state,
        key: schemaCardProps.id,
      }),
    ]);
  };
}
