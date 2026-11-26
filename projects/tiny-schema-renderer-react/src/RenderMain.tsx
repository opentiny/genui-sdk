import {
  forwardRef,
  useCallback,
  useContext as reactUseContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import type { RootNode, Node } from './types';
import { setDefaultSlotRenderer } from './engine';
import { setCustomSettings } from './engine/use-custom-setting';
import { useContext } from './use-context';
import { PageContext, PageContextProvider, RENDERER_INSTANCE_ID } from './page-context';
import { setSchema, setState } from './set-schema';
import type { LifeCycleFn } from './life-cycles';
import { SchemaNodeRenderer, normalizeChildren } from './Render';
import { SchemaErrorBoundary } from './SchemaErrorBoundary';
import { Loading } from './Loading';
import { useRendererSettings } from './RendererContextProvider';
import { BLOCKS, MATERIALS } from './context-symbols';
import { NOTIFY } from './engine/notify';
import { useBlockRuntime } from './block/runtime';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function generateRendererInstanceId() {
  return Math.random().toString(36).slice(2, 8);
}

export interface SchemaRendererHandle {
  setContext: (ctx: Record<string, unknown>) => void;
  getContext: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
}

export interface SchemaRendererProps {
  schema: RootNode | null;
  props?: Record<string, unknown>;
  blockName?: string;
}

export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(function SchemaRenderer(
  { schema, props: blockProps, blockName },
  ref,
) {
  const contextApi = useContext();
  const { getContext, setContext } = contextApi;

  // 嵌套渲染器（区块）复用父渲染器的实例 id，同名区块才能共享同一个 css scope
  const parentContext = reactUseContext(PageContext);
  const parentInstanceId = (parentContext as Record<PropertyKey, unknown> | null)?.[RENDERER_INSTANCE_ID];
  const rendererInstanceIdRef = useRef<string | null>(null);
  if (!rendererInstanceIdRef.current) {
    rendererInstanceIdRef.current =
      typeof parentInstanceId === 'string' ? parentInstanceId : generateRendererInstanceId();
  }
  const rendererInstanceId = rendererInstanceIdRef.current;

  // 区块运行时：同步 this.props，并解析区块缓存与 css scope
  const { cssScopeId, blocksCache } = useBlockRuntime({
    contextApi,
    parentContext,
    rendererInstanceId,
    blockName,
    blockProps,
  });

  const { context } = contextApi;
  const pageOnUnmountedRef = useRef<LifeCycleFn | null>(null);
  const schemaRef = useRef<RootNode | null>(schema);
  schemaRef.current = schema;
  const renderSettings = useRendererSettings();
  const { materials, notify, ...globalSettings } = renderSettings;
  setCustomSettings(globalSettings);
  const instanceCtx = context as typeof context & Record<symbol, unknown>;
  instanceCtx[MATERIALS] = materials;
  instanceCtx[NOTIFY] = notify;
  instanceCtx[RENDERER_INSTANCE_ID] = rendererInstanceId;
  instanceCtx[BLOCKS] = blocksCache;
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

  const invokePageOnUnmounted = useCallback(async () => {
    const fn = pageOnUnmountedRef.current;
    pageOnUnmountedRef.current = null;
    if (typeof fn !== 'function') return;
    try {
      await fn();
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
    setSchema(schemaRef.current, contextApi, {
      invokePageOnUnmounted,
      setPageOnUnmounted: (fn) => {
        pageOnUnmountedRef.current = fn;
      },
      cssScopeId,
    });
  }, [contextApi, pageInitSignature]);

  useEffect(() => {
    // JSSlot 内容属于使用方：编译时用闭包里的 ctx 固定使用方上下文，
    // 插槽内容里的 this.state / this.props 解析回使用方页面而非区块内部
    setDefaultSlotRenderer((children, scope, ctx) => {
      const nodes = normalizeChildren(children as Node['children']).map((child, i) => (
        <SchemaNodeRenderer key={child.id ?? i} schema={child} scope={scope} parent={schemaRef.current} />
      ));
      return [<PageContext.Provider key={0} value={ctx}>{nodes}</PageContext.Provider>];
    });

    return () => {
      invokePageOnUnmounted();
    };
  }, []);

  const rootChildrenSchema: Node = {
    componentName: 'div',
    props: schema?.props,
    children: schema?.children,
  };

  return (
    <PageContextProvider value={pageContext}>
      <SchemaErrorBoundary componentName={blockName ?? 'Page'} resetKey={schema} notifyContext={pageContext}>
        {schema?.children?.length ? <SchemaNodeRenderer schema={rootChildrenSchema} parent={schema} /> : <Loading />}
      </SchemaErrorBoundary>
    </PageContextProvider>
  );
});

export default SchemaRenderer;
