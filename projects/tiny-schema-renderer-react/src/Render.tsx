import React, { memo, type ComponentType } from 'react';
import { isHtmlTag } from './builtin/html-tags';
import { parseData, parseCondition, getLoopScope, getBindProps } from './engine';
import type { Node, RootNode } from './types';
import type { PageContextValue } from './engine';
import type { ComponentRegistry, MaterialComponent } from './materials';
import { getResolvedMaterials } from './materials';
import { normalizeDomProps } from './engine/parse-inline-style';
import { usePageContext } from './page-context';

function resolveComponent(name: string, materials: ComponentRegistry): MaterialComponent | string | null {
  return materials[name] || (isHtmlTag(name) ? name : null);
}

function propsFromBind(bindProps: Record<string, unknown>): Record<string, unknown> {
  const { children: _c, schema: _schema, ...rest } = bindProps;
  return normalizeDomProps({ ...rest });
}

// TODO: 移除 验证直接写text
export function normalizeChildren(children: Node['children']): Node[] {
  if (children == null) return [];
  if (typeof children === 'string') {
    return [{ componentName: 'Text', props: { text: children } }];
  }
  if (Array.isArray(children)) return children;
  return [];
}

function renderChildren(children: Node[], scope: Record<string, unknown>, context: PageContextValue): React.ReactNode {
  if (!children.length) return null;
  return children.map((child, index) => renderComponent(child, scope, context, index)).filter(Boolean);
}

function renderComponent(
  schema: Node,
  scope: Record<string, unknown>,
  context: PageContextValue,
  siblingIndex = 0,
): React.ReactNode {
  const { componentName, loop, loopArgs, condition, children } = schema;

  if (!componentName) {
    return null;
  }

  const materials = getResolvedMaterials();
  const component = resolveComponent(componentName, materials);

  if (!component) {
    if (import.meta.env.DEV) {
      console.warn(`[genui-react] Unknown component: ${componentName}`);
    } else {
      return null;
    }
    return (
      <span
        key={schema.id ?? componentName}
        style={{ color: '#999', fontSize: 12, display: 'inline-block', margin: 2 }}
      >
        [{componentName}]
      </span>
    );
  }

  const loopList = parseData(loop, scope, context);

  const renderElement = (item?: unknown, loopIndex?: number) => {
    const mergeScope = loopIndex !== undefined ? getLoopScope({ scope, index: loopIndex, item, loopArgs }) : scope;

    if (!parseCondition(condition, mergeScope, context)) {
      return null;
    }

    const bindProps = getBindProps(schema, mergeScope, context);
    const childNodes = normalizeChildren(children);
    const childContent = renderChildren(childNodes, mergeScope, context);
    const elementProps = propsFromBind(bindProps);
    const key = schema.id ?? `${componentName}-${loopIndex ?? siblingIndex}`;

    return React.createElement(component as string | ComponentType, { key, ...elementProps }, childContent);
  };

  if (loop) {
    const list = loopList as unknown[] | null | undefined;
    return list?.map(renderElement);
  }

  return renderElement();
}

export interface SchemaNodeRendererProps {
  schema: Node;
  scope?: Record<string, unknown>;
  parent?: RootNode | null;
}

export const SchemaNodeRenderer = memo(function SchemaNodeRenderer({ schema, scope = {} }: SchemaNodeRendererProps) {
  const context = usePageContext();
  return <>{renderComponent(schema, scope, context)}</>;
});
