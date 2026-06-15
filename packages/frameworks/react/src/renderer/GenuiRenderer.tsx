import { forwardRef } from 'react';
import { SchemaCardRenderer } from './SchemaCardRenderer';
import type { IRendererProps } from './renderer.types';
import type { SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';

/** @deprecated 使用 SchemaRendererHandle */
export type GenuiRendererHandle = SchemaRendererHandle;

/** 流式卡片渲染入口（SchemaCardRenderer 别名）。 */
export const GenuiRenderer = forwardRef<SchemaRendererHandle, IRendererProps>(function GenuiRenderer(
  props,
  ref,
) {
  return <SchemaCardRenderer {...props} ref={ref} />;
});
