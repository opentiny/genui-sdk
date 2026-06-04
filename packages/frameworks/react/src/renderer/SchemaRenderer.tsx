import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  memo,
} from 'react';
import { isHtmlTag } from '../builtin/html-tags';
import { builtinRegistry } from '../builtin/builtin-registry';
import {
  parseData,
  parseCondition,
  getLoopScope,
  getBindProps,
  setDefaultSlotRenderer,
} from '../engine';
import type { Node, RootNode } from '../engine';
import { initPageFromSchema, usePageContextStore, usePageContext } from '../context/page-context';
import type { ComponentRegistry, ComponentRenderer } from './component-types';
import { mergeRegistry } from './define-registry';
import { normalizeDomProps } from '../engine/parse-inline-style';
import type { ICustomAction, SchemaRendererHandle } from './renderer.types';

function resolveComponent(
  name: string,
  registry: ComponentRegistry,
  customElements: ComponentRegistry,
): ComponentRenderer | string | null {
  return (
    registry[name] ||
    customElements[name] ||
    (isHtmlTag(name) ? name : null)
  );
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
  customElements?: ComponentRegistry;
  loading?: boolean;
}

const SchemaNodeRenderer = memo(function SchemaNodeRenderer({
  schema,
  scope = {},
  registry,
  customElements = {},
  loading,
}: SchemaNodeRendererProps) {
  const context = usePageContext();

  const renderNode = (node: Node, nodeScope: Record<string, unknown>): React.ReactNode => {
    const { componentName, loop, loopArgs, condition, children } = node;
    if (!componentName) return null;

    const resolved = resolveComponent(componentName, registry, customElements);
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
      const childContent = renderChildren(childNodes, mergeScope, registry, customElements, loading);

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
          loading={loading}
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
  loading,
  children,
}: {
  renderer: ComponentRenderer;
  props: Record<string, unknown>;
  emit: (e: string) => void;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return <Renderer props={props} emit={emit} loading={loading}>{children}</Renderer>;
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
  customElements: ComponentRegistry,
  loading?: boolean,
): React.ReactNode {
  if (!nodes.length) return null;
  return nodes.map((child, i) => (
    <SchemaNodeRenderer
      key={child.id ?? `child-${i}`}
      schema={child}
      scope={scope}
      registry={registry}
      customElements={customElements}
      loading={loading}
    />
  ));
}

function domPropsFromBind(bindProps: Record<string, unknown>): Record<string, unknown> {
  const { children: _c, text, ...rest } = bindProps;
  const props = normalizeDomProps({ ...rest });
  if (text != null && props.children == null) props.children = text;
  return props;
}

export interface SchemaRendererProps {
  schema: RootNode | null;
  registry?: ComponentRegistry;
  customComponents?: ComponentRegistry;
  /** @deprecated 使用 generating */
  loading?: boolean;
  generating?: boolean;
  isJsonComplete?: boolean;
  customActions?: Record<string, ICustomAction>;
  id?: string;
  state?: Record<string, unknown>;
  fallback?: ComponentRenderer;
}

/**
 * 基础 Schema 渲染器，对齐 tiny-schema-renderer / Vue inject 的默认渲染器。
 * 需在 PageContextProvider 内使用（SchemaCardRenderer 已包含 Provider）。
 */
export const SchemaRenderer = forwardRef<SchemaRendererHandle, SchemaRendererProps>(
  function SchemaRenderer(
    {
      schema,
      registry: userRegistry,
      customComponents = {},
      loading,
      generating,
      customActions,
      id,
      state,
    },
    ref,
  ) {
    const store = usePageContextStore();
    const registry = useMemo(
      () => mergeRegistry(builtinRegistry, userRegistry || {}, customComponents),
      [userRegistry, customComponents],
    );

    const customActionsRef = useRef(customActions);
    customActionsRef.current = customActions;

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
      setState: (data) => store.setState(data),
    }));

    useEffect(() => {
      if (customActions && Object.keys(customActions).length > 0) {
        store.setContext({ callAction: callActionRef.current });
      }
      if (id) store.setContext({ cardId: id });
      if (state) store.setState(state);
    }, [id, state, customActions, store]);

    useEffect(() => {
      setDefaultSlotRenderer((children, scope, ctx) =>
        normalizeChildren(children as Node['children']).map((child, i) => (
          <SchemaNodeRenderer
            key={i}
            schema={child}
            scope={scope}
            registry={registry}
            customElements={customComponents}
          />
        )) as unknown[],
      );
    }, [registry, customComponents]);

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

    const isLoading = generating ?? loading;

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
        <SchemaNodeRenderer
          schema={rootSchema}
          registry={registry}
          customElements={customComponents}
          loading={isLoading}
        />
      </div>
    );
  },
);
