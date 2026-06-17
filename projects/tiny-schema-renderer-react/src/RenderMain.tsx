import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { RootNode } from '@opentiny/genui-sdk-core';
import { setDefaultSlotRenderer } from './engine';
import type { Node } from './engine';
import { createPageContext } from './use-context';
import { PageContextProvider } from './page-context';
import { setSchema } from './set-schema';
import type { LifeCycleFn } from './life-cycles';
import { SchemaNodeRenderer, normalizeChildren } from './Render';
import { Loading } from './Loading';

export interface SchemaRendererHandle {
  setContext: (ctx: Record<string, unknown>) => void;
  getContext: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
}

export interface SchemaRendererProps {
  schema: RootNode | null;
}

/**
 * 页面级 Schema 渲染入口（文件 RenderMain，对齐 Vue RenderMain.js）。
 * pageContext 在内部创建并通过 PageContextProvider 下发；流式属性由上层 Render 处理。
 */
export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(
  function SchemaRenderer({ schema }, ref) {
    const page = useMemo(() => createPageContext(), []);
    const pageOnUnmountedRef = useRef<LifeCycleFn | null>(null);

    useImperativeHandle(ref, () => ({
      setContext: (ctx) => page.setContext(ctx),
      getContext: () => page.getContext() as Record<string, unknown>,
      setState: (data) => page.setState(data),
    }));

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
        const { onMounted, onUnmounted } = setSchema(schema, page);
        pageOnUnmountedRef.current = onUnmounted;
        if (cancelled) return;
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
      setDefaultSlotRenderer((children, scope, _ctx) =>
        normalizeChildren(children as Node['children']).map((child, i) => (
          <SchemaNodeRenderer
            key={child.id ?? i}
            schema={child}
            scope={scope}
            parent={parentSchemaRef.current}
          />
        )) as unknown[],
      );

      return () => {
        void invokePageOnUnmounted();
      };
    }, []);

    const rootSchema: Node = {
      componentName: 'div',
      props: schema?.props,
      children: schema?.children,
    };

    return (
      <PageContextProvider value={page}>
        {schema?.children?.length ? (
          <div className="genui-schema-renderer" data-scope={page.getContext().cssScopeId}>
            <SchemaNodeRenderer schema={rootSchema} parent={schema} />
          </div>
        ) : (
          <Loading />
        )}
      </PageContextProvider>
    );
  },
);

export default SchemaRenderer;
