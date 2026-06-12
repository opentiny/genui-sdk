import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  memo,
} from 'react';
import { isHtmlTag } from './builtin/html-tags';
import { builtinRegistry } from './builtin/builtin-registry';
import {
  parseData,
  parseCondition,
  getLoopScope,
  getBindProps,
  setDefaultSlotRenderer,
} from './engine';
import type { Node, RootNode } from './engine';
import { initPageFromSchema, usePageContextStore, usePageContext } from './context';
import type { ComponentRegistry, ComponentRenderer, SchemaRendererHandle, SchemaRendererProps } from './types';
import { mergeRegistry } from './define-registry';
import { getMaterials } from './materials';
import { normalizeDomProps } from './engine/parse-inline-style';

function resolveComponent(
  name: string,
  registry: ComponentRegistry,
): ComponentRenderer | string | null {
  return registry[name] || (isHtmlTag(name) ? name : null);
}

function emitFromProps(props: Record<string, unknown>, event: string) {
  const cap = event.charAt(0).toUpperCase() + event.slice(1);
  const handler = props[`on${cap}`] ?? props[`on${event}`];
  if (typeof handler === 'function') handler();
}

interface SchemaNodeRendererProps {
  schema: Node;
  scope?: Record<string, unknown>;
  registry: ComponentRegistry;
}

const SchemaNodeRenderer = memo(function SchemaNodeRenderer({
  schema,
  scope = {},
  registry,
}: SchemaNodeRendererProps) {
  const context = usePageContext();

  const renderNode = (node: Node, nodeScope: Record<string, unknown>): React.ReactNode => {
    const { componentName, loop, loopArgs, condition, children } = node;
    if (!componentName) return null;

    const resolved = resolveComponent(componentName, registry);
    if (!resolved) {
      if (import.meta.env.DEV) {
        console.warn(`[genui-react] Unknown component: ${componentName}`);
      }
      return (
        <span
          key={node.id ?? componentName}
          style={{ color: '#999', fontSize: 12, display: 'inline-block', margin: 2 }}
        >
          [{componentName}]
        </span>
      );
    }

    const loopList = loop ? (parseData(loop, nodeScope, context) as unknown[]) : null;

    const renderOne = (item?: unknown, index?: number) => {
      const mergeScope =
        index !== undefined
          ? getLoopScope({ scope: nodeScope, index, item, loopArgs })
          : nodeScope;

      if (!parseCondition(condition, mergeScope, context)) return null;

      const bindProps = getBindProps(node, mergeScope, context);
      const emit = (event: string) => emitFromProps(bindProps, event);

      const childNodes = normalizeChildren(children);
      const childContent = renderChildren(childNodes, mergeScope, registry);

      if (typeof resolved === 'string') {
        return React.createElement(
          resolved,
          domPropsFromBind(bindProps),
          childContent,
        );
      }

      return (
        <ResolvedComponent
          key={node.id ?? `${componentName}-${index ?? 0}`}
          renderer={resolved}
          props={bindProps}
          emit={emit}
        >
          {childContent}
        </ResolvedComponent>
      );
    };

    if (loop && Array.isArray(loopList)) {
      return loopList.map((item, index) => renderOne(item, index));
    }
    return renderOne();
  };

  return <>{renderNode(schema, scope)}</>;
});

function ResolvedComponent({
  renderer: Renderer,
  props,
  emit,
  children,
}: {
  renderer: ComponentRenderer;
  props: Record<string, unknown>;
  emit: (e: string) => void;
  children?: React.ReactNode;
}) {
  return <Renderer props={props} emit={emit}>{children}</Renderer>;
}

function normalizeChildren(children: Node['children']): Node[] {
  if (children == null) return [];
  if (typeof children === 'string') {
    return [{ componentName: 'Text', props: { text: children } }];
  }
  if (Array.isArray(children)) return children;
  return [];
}

function renderChildren(
  nodes: Node[],
  scope: Record<string, unknown>,
  registry: ComponentRegistry,
): React.ReactNode {
  if (!nodes.length) return null;
  return nodes.map((child, i) => (
    <SchemaNodeRenderer
      key={child.id ?? `child-${i}`}
      schema={child}
      scope={scope}
      registry={registry}
    />
  ));
}

function domPropsFromBind(bindProps: Record<string, unknown>): Record<string, unknown> {
  const { children: _c, text, ...rest } = bindProps;
  const props = normalizeDomProps({ ...rest });
  if (text != null && props.children == null) props.children = text;
  return props;
}

/**
 * 基础 Schema 渲染器，对齐 Vue tiny-schema-renderer RenderMain（仅接收 schema）。
 * 物料通过 PageContextProvider.settings / setMaterials 注入；流式属性由 SchemaCardRenderer 处理。
 */
export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(
  function SchemaRenderer({ schema }, ref) {
    const store = usePageContextStore();
    const registry = mergeRegistry(builtinRegistry, getMaterials());

    useImperativeHandle(ref, () => ({
      setContext: (ctx) => store.setContext(ctx),
      getContext: () => store.getContext() as Record<string, unknown>,
      setState: (data) => store.setState(data),
    }));

    useEffect(() => {
      setDefaultSlotRenderer((children, scope, _ctx) =>
        normalizeChildren(children as Node['children']).map((child, i) => (
          <SchemaNodeRenderer
            key={i}
            schema={child}
            scope={scope}
            registry={mergeRegistry(builtinRegistry, getMaterials())}
          />
        )) as unknown[],
      );
    }, []);

    const pageInitSig =
      schema && Object.keys(schema).length
        ? JSON.stringify({
            state: schema.state,
            methods: schema.methods,
            refs: schema.refs,
            css: schema.css,
          })
        : '';

    useEffect(() => {
      if (!schema || !pageInitSig) return;
      initPageFromSchema(schema, store);
    }, [pageInitSig, schema, store]);

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
        <SchemaNodeRenderer schema={rootSchema} registry={registry} />
      </div>
    );
  },
);

/** 默认导出，对齐 Vue 的 tiny-schema-renderer default export */
export default SchemaRenderer;
