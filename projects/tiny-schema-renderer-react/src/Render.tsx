import React, { memo, type ComponentType } from 'react';
import { isHtmlTag } from './builtin/html-tags';
import { parseData, parseCondition, getLoopScope, getBindProps } from './engine';
import type { Node, RootNode } from './types';
import type { PageContextValue } from './engine';
import type { MaterialComponent } from './materials';
import { getResolvedMaterials } from './materials';
import { usePageContext } from './page-context';

function getComponent(name: string): MaterialComponent | string | null {
  const materials = getResolvedMaterials();
  return materials[name] || (isHtmlTag(name) ? name : null);
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

function getChildren(schema: Node, mergeScope: Record<string, unknown>, context: PageContextValue): React.ReactNode {
  const children = normalizeChildren(schema.children);
  if (!children.length) return null;
  return children.map((child) => renderComponent(child, mergeScope, context)).filter(Boolean);
}

function renderComponent(
  schema: Node,
  scope: Record<string, unknown>,
  context: PageContextValue,
): React.ReactNode {
  const { componentName, loop, loopArgs, condition } = schema;

  if (!componentName) {
    return null;
  }

  const component = getComponent(componentName);

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
    return React.createElement(
      component as string | ComponentType,
      elementProps,
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
  const context = usePageContext();
  return renderComponent(schema, scope, context);
});
