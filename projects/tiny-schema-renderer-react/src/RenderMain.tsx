import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import type { RootNode, Node } from './types';
import { setDefaultSlotRenderer } from './engine';
import { setCustomSettings } from './engine/use-custom-setting';
import { useContext } from './use-context';
import { PageContextProvider } from './page-context';
import { setSchema, setState } from './set-schema';
import type { LifeCycleFn } from './life-cycles';
import { SchemaNodeRenderer, normalizeChildren } from './Render';
import { Loading } from './Loading';
import { useRendererSettings } from './RendererContextProvider';
import { MATERIALS } from './materials';
import { NOTIFY } from './engine/notify';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

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
  const pageUnmountPromiseRef = useRef<Promise<void> | null>(null);
  const schemaRef = useRef<RootNode | null>(schema);
  schemaRef.current = schema;
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

  const invokePageOnUnmounted = useCallback((): void | Promise<void> => {
    if (pageUnmountPromiseRef.current) return pageUnmountPromiseRef.current;

    const fn = pageOnUnmountedRef.current;
    pageOnUnmountedRef.current = null;
    if (typeof fn !== 'function') return;
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        const pending = result
          .catch((error) => {
            console.error('SchemaRenderer onUnmounted error:', error);
          })
          .finally(() => {
            if (pageUnmountPromiseRef.current === pending) {
              pageUnmountPromiseRef.current = null;
            }
          });
        pageUnmountPromiseRef.current = pending;
        return pending;
      }
    } catch (error) {
      console.error('SchemaRenderer onUnmounted error:', error);
    }
  }, []);

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

  useIsomorphicLayoutEffect(() => {
    const currentSchema = schemaRef.current;

    let cancelled = false;
    const initializeSchema = () => {
      if (cancelled || !currentSchema || !pageInitSignature) return;
      const { onMounted, onUnmounted } = setSchema(currentSchema, contextApi);
      if (cancelled) return;
      pageOnUnmountedRef.current = onUnmounted;
      try {
        const result = onMounted?.();
        if (result && typeof result.then === 'function') {
          void result.catch((error) => {
            console.error('SchemaRenderer onMounted error:', error);
          });
        }
      } catch (error) {
        console.error('SchemaRenderer onMounted error:', error);
      }
    };

    const unmountResult = invokePageOnUnmounted();
    if (unmountResult && typeof unmountResult.then === 'function') {
      void unmountResult.then(initializeSchema);
    } else {
      initializeSchema();
    }

    return () => {
      cancelled = true;
    };
  }, [contextApi, invokePageOnUnmounted, pageInitSignature]);

  useEffect(() => {
    // TODO: 方案待讨论
    setDefaultSlotRenderer(
      (children, scope, _ctx) =>
        normalizeChildren(children as Node['children']).map((child, i) => (
          <SchemaNodeRenderer key={child.id ?? i} schema={child} scope={scope} parent={schemaRef.current} />
        )) as unknown[],
    );

    return () => {
      void invokePageOnUnmounted();
    };
  }, [invokePageOnUnmounted]);

  const rootChildrenSchema: Node = {
    componentName: 'div',
    props: schema?.props,
    children: schema?.children,
  };

  return (
    <PageContextProvider value={pageContext}>
      {schema?.children?.length ? (
        <SchemaNodeRenderer schema={rootChildrenSchema} parent={schema} />
      ) : (
        <Loading />
      )}
    </PageContextProvider>
  );
});

export default SchemaRenderer;
