import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import type { RootNode } from '@opentiny/genui-sdk-core';
import { PageContextProvider, usePageContextStore } from '../context/page-context';
import { SchemaRenderer } from './SchemaRenderer';
import { requiredCompleteFieldSelectors as defaultSelectors } from './config';
import type { GenuiRendererHandle, IRendererProps } from './renderer.types';

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

const GenuiRendererInner = forwardRef<GenuiRendererHandle, IRendererProps>(function GenuiRendererInner(
  props,
  ref,
) {
  const schemaRef = useRef<RootNode>({ ...emptySchema });
  const [displaySchema, setDisplaySchema] = useState<RootNode>(schemaRef.current);
  const [isError, setIsError] = useState(false);
  const store = usePageContextStore();
  const patcherRef = useRef(
    new DeltaPatcher({
      requiredCompleteFieldSelectors: [
        ...defaultSelectors,
        ...(props.requiredCompleteFieldSelectors || []),
      ],
    }),
  );

  const customActionsRef = useRef(props.customActions);
  customActionsRef.current = props.customActions;

  const callActionRef = useRef((actionName: string, params: unknown) => {
    const action = customActionsRef.current?.[actionName];
    if (!action) {
      console.warn(`Action ${actionName} not found`);
      return;
    }
    return action.execute(params, store.getContext() as Record<string, unknown>);
  });

  useImperativeHandle(ref, () => ({
    setContext: (ctx) => store.setContext(ctx),
    getContext: () => store.getContext() as Record<string, unknown>,
    setState: (state) => store.setState(state),
  }));

  useEffect(() => {
    // Playground/Vue 适配器通过 setContext 注入 callAction；无 customActions 时不要覆盖
    if (props.customActions && Object.keys(props.customActions).length > 0) {
      store.setContext({ callAction: callActionRef.current });
    }
    if (props.id) store.setContext({ cardId: props.id });
    if (props.state) store.setState(props.state);
  }, [props.id, props.state, props.customActions, store]);

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
      isCompleted = props.isJsonComplete ?? true;
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
    <div className="genui-renderer-container">
      <SchemaRenderer
        schema={isError ? errorSchema : displaySchema}
        customComponents={props.customComponents}
        loading={props.generating}
      />
    </div>
  );
});

export const GenuiRenderer = forwardRef<GenuiRendererHandle, IRendererProps>(function GenuiRenderer(
  props,
  ref,
) {
  return (
    <PageContextProvider customActions={props.customActions}>
      <GenuiRendererInner {...props} ref={ref} />
    </PageContextProvider>
  );
});
