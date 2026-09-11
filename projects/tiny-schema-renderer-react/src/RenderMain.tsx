import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { RootNode, Node } from './types';
import { setDefaultSlotRenderer } from './engine';
import { setCustomSettings } from './engine/use-custom-setting';
import { useContext } from './use-context';
import { PageContextProvider } from './page-context';
import { setSchema, setState } from './set-schema';
import type { LifeCycleFn } from './life-cycles';
import { SchemaNodeRenderer, normalizeChildren } from './Render';
import { SchemaErrorBoundary } from './SchemaErrorBoundary';
import { Loading } from './Loading';
import { useRendererSettings } from './RendererContextProvider';
import { MATERIALS } from './materials';
import { NOTIFY } from './engine/notify';

export interface SchemaRendererHandle {
  setContext: (ctx: Record<string, unknown>) => void;
  getContext: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
}

export interface SchemaRendererProps {
  schema: RootNode | null;
}

export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(function SchemaRenderer(
  { schema },
  ref,
) {
  const contextApi = useContext();
  const { context, getContext, setContext } = contextApi;
  const pageOnUnmountedRef = useRef<LifeCycleFn | null>(null);
  const renderSettings = useRendererSettings();
  const { materials, notify, ...globalSettings } = renderSettings;
  setCustomSettings(globalSettings);
  const instanceCtx = context as typeof context & Record<symbol, unknown>;
  instanceCtx[MATERIALS] = materials;
  instanceCtx[NOTIFY] = notify;
  const pageContext = useMemo(() => ({ ...instanceCtx }), [instanceCtx, materials, notify]);

  useImperativeHandle(
    ref,
    () => ({
      setContext,
      getContext,
      setState: (data) => setState(data, contextApi),
    }),
    [setContext, getContext, contextApi],
  );

  const invokePageOnUnmounted = async () => {
    const fn = pageOnUnmountedRef.current;
    pageOnUnmountedRef.current = null;
    if (typeof fn !== 'function') return;
    try {
      await fn();
    } catch (error) {
      console.error('SchemaRenderer onUnmounted error:', error);
    }
  };

  /** 页面初始化签名：state/methods/refs/css/lifeCycles 变化时需重跑 init 与生命周期 */
  const pageInitSignature =
    schema && Object.keys(schema).length
      ? JSON.stringify({
          state: schema.state,
          methods: schema.methods,
          refs: schema.refs,
          css: schema.css,
          lifeCycles: schema.lifeCycles,
        })
      : '';

  useEffect(() => {
    if (!schema || !pageInitSignature) return;

    let cancelled = false;
    (async () => {
      await invokePageOnUnmounted();
      if (cancelled) return;
      const { onMounted, onUnmounted } = setSchema(schema, contextApi);
      if (cancelled) return;
      pageOnUnmountedRef.current = onUnmounted;
      try {
        await onMounted?.();
      } catch (error) {
        console.error('SchemaRenderer onMounted error:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageInitSignature, schema]);

  const parentSchemaRef = useRef<RootNode | null>(schema);
  parentSchemaRef.current = schema;

  useEffect(() => {
    // TODO: 方案待讨论
    setDefaultSlotRenderer(
      (children, scope, _ctx) =>
        normalizeChildren(children as Node['children']).map((child, i) => (
          <SchemaNodeRenderer key={child.id ?? i} schema={child} scope={scope} parent={parentSchemaRef.current} />
        )) as unknown[],
    );

    return () => {
      void invokePageOnUnmounted();
    };
  }, []);

  const rootChildrenSchema: Node = {
    componentName: 'div',
    props: schema?.props,
    children: schema?.children,
  };

  return (
    <PageContextProvider value={pageContext}>
      <SchemaErrorBoundary componentName="Page">
        {schema?.children?.length ? (
          <SchemaNodeRenderer schema={rootChildrenSchema} parent={schema} />
        ) : (
          <Loading />
        )}
      </SchemaErrorBoundary>
    </PageContextProvider>
  );
});

export default SchemaRenderer;
