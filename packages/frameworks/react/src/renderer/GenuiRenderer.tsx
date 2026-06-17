import { forwardRef } from 'react';
import { Renderer } from './Renderer';
import type { IRendererProps } from './renderer.types';
import type { SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';

/** @deprecated 使用 SchemaRendererHandle */
export type GenuiRendererHandle = SchemaRendererHandle;

/** 流式卡片渲染入口（Renderer 别名）。 */
export const GenuiRenderer = forwardRef<SchemaRendererHandle, IRendererProps>(function GenuiRenderer(
  props,
  ref,
) {
  return <Renderer {...props} ref={ref} />;
});
