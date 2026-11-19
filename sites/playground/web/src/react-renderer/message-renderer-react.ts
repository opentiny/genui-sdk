import { defineAsyncComponent, h } from 'vue';
import { cardIdSymbol, GenuiChat } from '@opentiny/genui-sdk-vue';
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

function bindCardIdToAction<T extends { execute: (params: any, context: Record<string | symbol, any>) => any }>(
  action: T,
  cardId: string,
): T {
  return {
    ...action,
    execute: (params: any, context: Record<string | symbol, any> = {}) =>
      action.execute(params, {
        ...context,
        [cardIdSymbol]: cardId,
      }),
  };
}

export function getMessageRendererReact(instance: GenuiChatInstance) {
  return (schemaCardProps) => {
    const schema = parseSchema(schemaCardProps.content);
    if (!schema) {
      return null;
    }

    const { continueChatAction, saveStateAction } = instance;
    const cardId = schemaCardProps.id;
    const isGenerating = instance.lastSchemaCardId === cardId ? instance.generating : false;
    const RendererHeader = instance.getProps().rendererSlots?.header;
    const header = RendererHeader
      ? h(RendererHeader as any, {
          schema,
          isError: false,
          isFinished: !isGenerating,
          exportFramework: 'React',
        })
      : null;

    return h('div', { class: 'schema-render-container schema-render-container--react' }, [
      header,
      h(SchemaRendererReactAdapter, {
        schema,
        generating: isGenerating,
        isJsonComplete: schemaCardProps.isJsonComplete,
        customActions: {
          continueChat: bindCardIdToAction(continueChatAction, cardId),
          saveState: bindCardIdToAction(saveStateAction, cardId),
        },
        rendererId: cardId,
        rendererState: schemaCardProps.state,
        key: cardId,
      }),
    ]);
  };
}
