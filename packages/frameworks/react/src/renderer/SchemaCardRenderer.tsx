import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
} from 'react';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import type { RootNode } from '@opentiny/genui-sdk-core';
import { SchemaRenderer } from '@opentiny/tiny-schema-renderer-react';
import { PageContextProvider } from '@opentiny/tiny-schema-renderer-react';
import type { SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';
import { RendererContext } from './RendererContext';
import { useGenuiMaterials } from './MaterialsContext';
import { requiredCompleteFieldSelectors as defaultSelectors } from './config';
import type { IRendererProps } from './renderer.types';

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
 * 流式卡片渲染器：repairJson + DeltaPatcher，将 content 转为 schema 后交给基础渲染器。
 * 对齐 Vue 的 SchemaCardRenderer.vue + inject(GENUI_RENDERER) 模式：
 * 通过 RendererContext 注入基础渲染器，默认使用 @opentiny/tiny-schema-renderer-react。
 */
export const SchemaCardRenderer = forwardRef<SchemaRendererHandle, IRendererProps>(
  function SchemaCardRenderer(props, ref) {
    // 通过 Context 注入基础渲染器，对齐 Vue 的 inject(GENUI_RENDERER, defaultSchemaRenderer)
    const BaseRenderer = useContext(RendererContext) ?? SchemaRenderer;
    // 对齐 Vue provide(RENDERER_SETTINGS_KEY, { materials: { ...vueMaterials, ...customComponents } })
    const contextMaterials = useGenuiMaterials();
    const mergedMaterials = useMemo(
      () => ({ ...contextMaterials, ...props.customComponents }),
      [contextMaterials, props.customComponents],
    );
    const rendererRef = useRef<SchemaRendererHandle | null>(null);

    /**
     * 对齐 Vue SchemaCardRenderer.updateContextAndState：通过 ref 向基础渲染器注入流式属性。
     */
    const updateContextAndState = useCallback(() => {
      const instance = rendererRef.current;
      if (!instance) return;

      instance.setContext({
        callAction: (actionName: string, params?: unknown) => {
          if (!props.customActions?.[actionName]) {
            console.warn(`Action ${actionName} not found`);
            return;
          }
          return props.customActions[actionName].execute(params, instance.getContext());
        },
      });
      if (props.id) {
        instance.setContext({ cardId: props.id });
      }
      instance.setState(props.state || {});
    }, [props.customActions, props.id, props.state]);

    const setRendererRef = useCallback(
      (instance: SchemaRendererHandle | null) => {
        rendererRef.current = instance;
        if (typeof ref === 'function') {
          ref(instance);
        } else if (ref) {
          ref.current = instance;
        }
        if (instance) {
          updateContextAndState();
        }
      },
      [ref, updateContextAndState],
    );

    useEffect(() => {
      updateContextAndState();
    }, [updateContextAndState]);

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

    return (
      <PageContextProvider
        settings={{ materials: mergedMaterials }}
        customActions={props.customActions}
      >
        <div className="genui-renderer-container schema-render-container">
          <BaseRenderer
            ref={setRendererRef}
            schema={isError ? errorSchema : displaySchema}
          />
        </div>
      </PageContextProvider>
    );
  },
);
