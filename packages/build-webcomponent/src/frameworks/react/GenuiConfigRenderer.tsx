import type { IMaterials } from '@opentiny/genui-sdk-core';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-react/config-provider';
import type { NotifyHandler } from '@opentiny/genui-sdk-react/config-provider';
import { GenuiRenderer } from '@opentiny/genui-sdk-react/renderer';
import type { IRendererProps } from '@opentiny/genui-sdk-react/renderer';

export interface GenuiConfigRendererProps extends Omit<IRendererProps, 'content'> {
  /** 构建期注入的物料，不走 attribute */
  materials?: IMaterials;
  notify?: NotifyHandler;
  content?: IRendererProps['content'];
}

/**
 * 自定义元素的根组件：把「配置」和「渲染」合成一层，
 * 与 Vue 的 GenuiConfigRenderer.ce.vue 对齐，使用方不需要再套 GenuiConfigProvider。
 */
export function GenuiConfigRenderer({ materials, notify, content, ...rendererProps }: GenuiConfigRendererProps) {
  return (
    <GenuiConfigProvider materials={materials} notify={notify}>
      <GenuiRenderer content={content ?? '{}'} {...rendererProps} />
    </GenuiConfigProvider>
  );
}
