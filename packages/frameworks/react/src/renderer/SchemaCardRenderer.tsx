import { forwardRef, useEffect, useRef, useState } from 'react';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import type { RootNode } from '@opentiny/genui-sdk-core';
import { PageContextProvider } from '../context/page-context';
import { SchemaRenderer } from './SchemaRenderer';
import { requiredCompleteFieldSelectors as defaultSelectors } from './config';
import type { IRendererProps, SchemaRendererHandle } from './renderer.types';

const errorSchema: RootNode = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: { text: 'Schema rendering error', style: 'line-height: 40px; color: #c00' },
    },
  ],
};

const emptySchema: RootNode = { componentName: 'Page', children: [] };

/**
 * 流式卡片渲染器：repairJson + DeltaPatcher，将 content 转为 schema 后交给 SchemaRenderer。
 * 对齐 Vue 的 SchemaCardRenderer.vue + inject(GENUI_RENDERER) 中的基础渲染器。
 */
export const SchemaCardRenderer = forwardRef<SchemaRendererHandle, IRendererProps>(
  function SchemaCardRenderer(props, ref) {
    const schemaRef = useRef<RootNode>({ ...emptySchema });
    const [displaySchema, setDisplaySchema] = useState<RootNode>(schemaRef.current);
    const [isError, setIsError] = useState(false);
    const patcherRef = useRef(
      new DeltaPatcher({
        requiredCompleteFieldSelectors: [
          ...defaultSelectors,
          ...(props.requiredCompleteFieldSelectors || []),
        ],
      }),
    );

    const contentKeyRef = useRef('');
    useEffect(() => {
      setIsError(false);
      let json: Record<string, unknown> = {};
      let isCompleted = true;
      const raw = props.content;

      if (typeof raw === 'string') {
        if (raw.trim()) {
          const { value, state } = repairJson(raw);
          if (!value || typeof value !== 'object') {
            setIsError(true);
            return;
          }
          json = value as Record<string, unknown>;
          isCompleted = state === RepairJsonState.SUCCESS;
        }
      } else {
        json = (raw as Record<string, unknown>) || {};
        isCompleted = props.generating ? false : (props.isJsonComplete ?? true);
      }

      if (!isCompleted && json && 'lifeCycles' in json) {
        const { lifeCycles: _, ...rest } = json;
        json = rest;
      }

      const nextKey = JSON.stringify(json) + String(isCompleted);
      if (!props.generating && contentKeyRef.current === nextKey) return;
      contentKeyRef.current = nextKey;

      patcherRef.current.patchWithDelta(schemaRef.current, json, isCompleted);
      setDisplaySchema({ ...schemaRef.current });
    }, [props.content, props.isJsonComplete, props.generating]);

    const isJsonCompleteForRenderer = props.generating ? false : (props.isJsonComplete ?? true);

    return (
      <PageContextProvider customActions={props.customActions}>
        <div className="genui-renderer-container schema-render-container">
          <SchemaRenderer
            ref={ref}
            schema={isError ? errorSchema : displaySchema}
            customComponents={props.customComponents}
            generating={props.generating}
            isJsonComplete={isJsonCompleteForRenderer}
            customActions={props.customActions}
            id={props.id}
            state={props.state}
          />
        </div>
      </PageContextProvider>
    );
  },
);
