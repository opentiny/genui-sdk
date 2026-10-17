import { defineAsyncComponent, h } from 'vue';
import { cardIdSymbol, type GenuiChat } from '@opentiny/genui-sdk-vue';
import SchemaCardExportShell from '../components/SchemaExportHeader.vue';

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
    const generating =
      instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false;
    const cardId = schemaCardProps.id;

    const customActions = {
      continueChat: bindCardIdToAction(continueChatAction, cardId),
      saveState: bindCardIdToAction(saveStateAction, cardId),
    };

    return h(
      SchemaCardExportShell,
      {
        class: 'angular-card-wrapper',
        framework: 'angular',
        content: schemaCardProps.content,
        isFinished: !generating,
      },
      () =>
        h(GenuiRendererNg, {
          ...schemaCardProps,
          requiredCompleteFieldSelectors: props.requiredCompleteFieldSelectors || [],
          generating,
          customActions,
          key: schemaCardProps.id,
        }),
    );
  };
}
