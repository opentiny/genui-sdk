import React, { memo, useContext as reactUseContext, type ComponentType } from 'react';
import { parseData, parseCondition, getLoopScope, getBindProps } from './engine';
import type { Node, RootNode } from './types';
import type { PageContextValue } from './engine';
import { getComponent } from './materials';
import { PageContext } from './page-context';

export function normalizeChildren(children: Node['children']): Node[] {
  if (children == null) return [];
  if (Array.isArray(children)) return children;
  return [];
}

function getChildren(schema: Node, mergeScope: Record<string, unknown>, context: PageContextValue): React.ReactNode {
  if (!Array.isArray(schema.children)) {
    const content = parseData(schema.children, mergeScope, context);
    return content as React.ReactNode;
  }
  const children = normalizeChildren(schema.children);
  if (!children.length) return null;
  return children.map((child, i) => renderComponent(child, mergeScope, context, child.id ?? child.componentName + i));
}

function renderComponent(
  schema: Node,
  scope: Record<string, unknown>,
  context: PageContextValue,
  key?: string | number,
): React.ReactNode {
  const { componentName, loop, loopArgs, condition } = schema;

  if (!componentName) {
    return null;
  }

  const component = getComponent(componentName, context);

  if (!component) {
    return null;
  }

  const loopList = parseData(loop, scope, context) as unknown[];

  const renderElement = (item?: unknown, index?: number) => {
    const mergeScope = index !== undefined ? getLoopScope({ item, index, loopArgs, scope }) : scope;

    if (!parseCondition(condition, mergeScope, context)) {
      return null;
    }

    const { children: _c, schema: _schema, ...elementProps } = getBindProps(schema, mergeScope, context);
    const elementKey = index !== undefined ? index : key;
    return React.createElement(
      component as string | ComponentType,
      { ...elementProps, key: elementKey },
      getChildren(schema, mergeScope, context),
    );
  };

  return loop ? loopList?.map(renderElement) : renderElement();
}

export interface SchemaNodeRendererProps {
  schema: Node;
  scope?: Record<string, unknown>;
  parent?: RootNode | null;
}

export const SchemaNodeRenderer = memo(function SchemaNodeRenderer({ schema, scope = {} }: SchemaNodeRendererProps) {
  const context = reactUseContext(PageContext);
  if (!context) {
    throw new Error('SchemaNodeRenderer must be used within SchemaRenderer');
  }
  return renderComponent(schema, scope, context);
});
