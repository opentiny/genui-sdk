import { forwardRef } from 'react';
import { SchemaCardRenderer } from './SchemaCardRenderer';
import type { GenuiRendererHandle, IRendererProps } from './renderer.types';

/** 流式卡片渲染入口，与 Vue `GenuiRenderer`（SchemaCardRenderer.vue）同名导出。 */
export const GenuiRenderer = forwardRef<GenuiRendererHandle, IRendererProps>(function GenuiRenderer(
  props,
  ref,
) {
  return <SchemaCardRenderer {...props} ref={ref} />;
});
