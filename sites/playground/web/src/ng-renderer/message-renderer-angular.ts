import { defineAsyncComponent, h } from 'vue';
import type { GenuiChat } from '@opentiny/genui-sdk-vue';
import SchemaExportHeader from '../components/SchemaExportHeader.vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);
export function getMessageRendererAngular(instance: InstanceType<typeof GenuiChat>) {
  return (schemaCardProps) => {
    const props = instance.getProps();
    const { continueChatAction, saveStateAction } = instance;
    const generating =
      instance.lastSchemaCardId === schemaCardProps.id ? instance.generating : false;
    // 复用 Vue 卡片的 SchemaExportHeader(framework="angular"),组件用 slot 包住卡片本体,
    // 使 hover 整卡即可触发按钮显隐(与 Vue 卡片交互一致)
    return h(
      SchemaExportHeader,
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
