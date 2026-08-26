import { defineAsyncComponent, h } from 'vue';
import { cardIdSymbol, type GenuiChat } from '@opentiny/genui-sdk-vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);

/** Angular context 用的是另一份 CARD_ID Symbol，注入 Vue Chat 的 cardIdSymbol 才能让 saveState 定位到消息 */
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

export function getMessageRendererAngular(instance: InstanceType<typeof GenuiChat>) {
  return (schemaCardProps) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;
    const cardId = schemaCardProps.id;
    return h(
      'div',
      h(GenuiRendererNg, {
        ...schemaCardProps,
        requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
        generating: instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false,
        customActions: {
          continueChat: bindCardIdToAction(continueChatAction, cardId),
          saveState: bindCardIdToAction(saveStateAction, cardId),
        },
        key: schemaCardProps.id,
      }),
    );
  };
}
