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
import { SchemaRenderer } from '@opentiny/tiny-schema-renderer-react';
import { RendererContextProvider } from '@opentiny/tiny-schema-renderer-react';
import type { SchemaRendererHandle, SchemaRendererProps } from '@opentiny/tiny-schema-renderer-react';

type RootNode = NonNullable<SchemaRendererProps['schema']>;
import { RendererContext } from './RendererContext';
import { useGenuiDefaultPropsMap, useGenuiMaterials } from '../config-provider';
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

const emptySchema: RootNode = { componentName: 'Page' };

export const Renderer = forwardRef<SchemaRendererHandle, IRendererProps>(
  function Renderer(props, ref) {
    // TODO: 移除 RendererContext 依赖
    const BaseRenderer = useContext(RendererContext) ?? SchemaRenderer;
    const contextMaterials = useGenuiMaterials();
    const defaultPropsMap = useGenuiDefaultPropsMap();
    const mergedMaterials = useMemo(
      () => ({ ...contextMaterials, ...props.customComponents }),
      [contextMaterials, props.customComponents],
    );
    const renderSettings = useMemo(
      () => ({ materials: mergedMaterials, defaultPropsMap }),
      [mergedMaterials, defaultPropsMap],
    );
    const rendererRef = useRef<SchemaRendererHandle | null>(null);

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

      // TODO: 检查一下nextKey是否必要
      const nextKey = JSON.stringify(json) + String(isCompleted);
      if (!props.generating && contentKeyRef.current === nextKey) return;
      contentKeyRef.current = nextKey;

      patcherRef.current.patchWithDelta(schemaRef.current, json, isCompleted);
      setDisplaySchema({ ...schemaRef.current });
    }, [props.content, props.isJsonComplete, props.generating]);

    useEffect(() => {
      updateContextAndState();
    }, [displaySchema, updateContextAndState]);

    // TODO: css样式去哪里了
    return (
      <RendererContextProvider render-settings={renderSettings}>
        <div className="genui-renderer-container schema-render-container">
          <BaseRenderer
            ref={setRendererRef}
            schema={isError ? errorSchema : displaySchema}
          />
        </div>
      </RendererContextProvider>
    );
  },
);
