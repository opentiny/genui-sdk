import { defineAsyncComponent, h } from 'vue';
import { cardIdSymbol, type GenuiChat } from '@opentiny/genui-sdk-vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);

/** Angular 渲染器的 action 上下文需要 Vue Chat 的 cardIdSymbol，saveState 才能定位到消息 */
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
    const { id: cardId, state, ...rendererProps } = schemaCardProps;
    const customActions = {
      continueChat: bindCardIdToAction(continueChatAction, cardId),
      saveState: bindCardIdToAction(saveStateAction, cardId),
    };
    return h(
      'div',
      h(GenuiRendererNg, {
        ...rendererProps,
        rendererState: state,
        requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
        generating: instance.lastSchemaCardId === cardId ? instance.generating : false,
        customActions,
        key: cardId,
      }),
    );
  };
}
