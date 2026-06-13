import { forwardRef, useEffect, useImperativeHandle } from 'react';
import type { RootNode } from '@opentiny/genui-sdk-core';
import { setDefaultSlotRenderer } from './engine';
import type { Node } from './engine';
import { initPageFromSchema, usePageContextStore } from './context';
import { SchemaNodeRenderer, normalizeChildren } from './SchemaNodeRenderer';

export interface SchemaRendererHandle {
  setContext: (ctx: Record<string, unknown>) => void;
  getContext: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
}

/** 基础渲染器 props，对齐 Vue tiny-schema-renderer RenderMain（仅 schema）。 */
export interface SchemaRendererProps {
  schema: RootNode | null;
}

/**
 * 基础 Schema 渲染器，对齐 Vue tiny-schema-renderer RenderMain（仅接收 schema）。
 * 物料通过 PageContextProvider.settings / setMaterials 注入；流式属性由 SchemaCardRenderer 处理。
 */
export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(
  function SchemaRenderer({ schema }, ref) {
    const store = usePageContextStore();

    useImperativeHandle(ref, () => ({
      setContext: (ctx) => store.setContext(ctx),
      getContext: () => store.getContext() as Record<string, unknown>,
      setState: (data) => store.setState(data),
    }));

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
        initPageFromSchema(schema, store);
        await Promise.resolve();
        if (cancelled) return;
        await store.runPendingOnMounted();
      })();

      return () => {
        cancelled = true;
      };
    }, [pageInitSignature, schema]);


    useEffect(() => {
      setDefaultSlotRenderer((children, scope, _ctx) =>
        normalizeChildren(children as Node['children']).map((child, i) => (
          <SchemaNodeRenderer key={i} schema={child} scope={scope} />
        )) as unknown[],
      );

      return () => {
        void store.invokePageOnUnmounted();
      };
    }, []);


    if (!schema?.children?.length) {
      return <div className="genui-renderer-loading">Loading...</div>;
    }

    const rootSchema: Node = {
      componentName: 'div',
      props: schema.props,
      children: schema.children,
    };

    return (
      <div className="genui-schema-renderer" data-scope={store.getContext().cssScopeId}>
        <SchemaNodeRenderer schema={rootSchema} />
      </div>
    );
  },
);

/** 默认导出，对齐 Vue 的 tiny-schema-renderer default export */
export default SchemaRenderer;
