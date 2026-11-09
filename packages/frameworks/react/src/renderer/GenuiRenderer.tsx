import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import { SchemaRenderer, RendererContextProvider } from '@opentiny/tiny-schema-renderer-react';
import type { SchemaRendererHandle, SchemaRendererProps } from '@opentiny/tiny-schema-renderer-react';
import type { InstanceMaterials } from '@opentiny/tiny-schema-renderer-react';
import { useGenuiMaterials, useGenuiNotify } from '../config-provider';
import { requiredCompleteFieldSelectors as defaultSelectors } from './config';
import type { IRendererExpose, IRendererProps } from './renderer.types';
import './renderer.css';

type RootNode = NonNullable<SchemaRendererProps['schema']>;

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

export const GenuiRenderer = forwardRef<IRendererExpose, IRendererProps>(
  function GenuiRenderer(props, ref) {
    const contextMaterials = useGenuiMaterials();
    const notify = useGenuiNotify();
    const mergedComponents = useMemo(
      () => ({
        ...(contextMaterials.components as Record<string, ComponentType<any>> | undefined),
        ...props.customComponents,
      }),
      [contextMaterials.components, props.customComponents],
    );
    const renderSettings = useMemo(
      () => ({
        materials: {
          ...contextMaterials,
          components: mergedComponents,
        } as InstanceMaterials,
        notify,
      }),
      [contextMaterials, mergedComponents, notify],
    );
    const rendererRef = useRef<SchemaRendererHandle | null>(null);
    const exposeRef = useRef<IRendererExpose>({
      rendererInstance: null,
      getState: () => (rendererRef.current?.getContext()?.state as Record<string, unknown>) || {},
      setState: (state = {}) => rendererRef.current?.setState(state),
    });

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
    }, [props.customActions]);

    const setRendererRef = useCallback((instance: SchemaRendererHandle | null) => {
      rendererRef.current = instance;
      exposeRef.current.rendererInstance = instance;
    }, []);

    useImperativeHandle(ref, () => exposeRef.current, []);

    useEffect(() => {
      updateContextAndState();
    }, [updateContextAndState]);

    const schemaRef = useRef<RootNode>({ ...emptySchema });
    const [displaySchema, setDisplaySchema] = useState<RootNode>(schemaRef.current);
    const [isError, setIsError] = useState(false);
    const patcherRef = useRef<DeltaPatcher | null>(null);
    patcherRef.current = useMemo(
      () =>
        new DeltaPatcher({
          requiredCompleteFieldSelectors: [
            ...defaultSelectors,
            ...(contextMaterials.requiredCompleteFieldSelectors || []),
            ...(props.requiredCompleteFieldSelectors || []),
          ],
        }),
      [contextMaterials.requiredCompleteFieldSelectors, props.requiredCompleteFieldSelectors],
    );

    const contentKeyRef = useRef('');

    const initPatch = useRef(false)

    function patchSchema() {
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
        isCompleted = props.isJsonComplete ?? true;
      }

      if (!isCompleted && json && 'lifeCycles' in json) {
        const { lifeCycles: _, ...rest } = json;
        json = rest;
      }

      const nextKey = JSON.stringify(json) + String(isCompleted);
      if (!props.generating && contentKeyRef.current === nextKey) return;
      contentKeyRef.current = nextKey;

      patcherRef.current?.patchWithDelta(schemaRef.current, json, isCompleted);
      setDisplaySchema({ ...schemaRef.current });
    }

    patchSchema();

    useEffect(() => {
      if (initPatch.current) {
        initPatch.current = true;
        return;
      }
      setIsError(false);
      patchSchema();
    }, [props.content, props.isJsonComplete, props.generating]);

    useEffect(() => {
      updateContextAndState();
    }, [displaySchema, updateContextAndState]);

    return (
      <RendererContextProvider renderSettings={renderSettings}>
        <div className="genui-renderer-container schema-render-container">
          <SchemaRenderer
            ref={setRendererRef}
            schema={isError ? errorSchema : displaySchema}
          />
        </div>
      </RendererContextProvider>
    );
  },
);
