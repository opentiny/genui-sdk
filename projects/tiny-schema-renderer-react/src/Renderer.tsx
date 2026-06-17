import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { RootNode } from '@opentiny/genui-sdk-core';
import { setDefaultSlotRenderer } from './engine';
import type { Node } from './engine';
import { initPageFromSchema, useRendererContextStore } from './context';
import { SchemaNodeRenderer, normalizeChildren } from './SchemaNodeRenderer';
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
 * 基础 Schema 渲染器，仅接收 schema。
 * 物料通过 RendererContextProvider render-settings / setMaterials 注入；流式属性由 SchemaCardRenderer 处理。
 */
export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(
  function SchemaRenderer({ schema }, ref) {
    const store = useRendererContextStore();

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
        void store.invokePageOnUnmounted();
      };
    }, []);


    const rootSchema: Node = {
      componentName: 'div',
      props: schema?.props,
      children: schema?.children,
    };

    return schema?.children?.length ? (
      <div className="genui-schema-renderer" data-scope={store.getContext().cssScopeId}>
        <SchemaNodeRenderer schema={rootSchema} parent={schema} />
      </div>
    ) : (
      <Loading />
    );
  },
);

export default SchemaRenderer;
