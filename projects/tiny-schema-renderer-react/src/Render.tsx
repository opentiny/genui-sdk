import React, { memo, useContext as reactUseContext, type ComponentType } from 'react';
import { parseData, parseCondition, getLoopScope, getBindProps } from './engine';
import type { Node, RootNode } from './types';
import type { PageContextValue } from './engine';
import { getComponent } from './materials';
import { PageContext } from './page-context';
import { isSlotOutletName, renderSlotOutlet } from './block';

export function normalizeChildren(children: Node['children']): Node[] {
  if (children == null) return [];
  if (Array.isArray(children)) return children;
  return [];
}

function renderNodes(
  nodes: Node[],
  scope: Record<string, unknown>,
  context: PageContextValue,
  keyPrefix: string,
): React.ReactNode {
  return nodes.map((child, index) => {
    if (!child) return null;
    const key = child.id ?? `${keyPrefix}${child.componentName}${index}`;
    return renderComponent(child, scope, context, key);
  });
}

export function getChildren(schema: Node, mergeScope: Record<string, unknown>, context: PageContextValue): React.ReactNode {
  if (!Array.isArray(schema.children)) {
    const content = parseData(schema.children, mergeScope, context);
    return content as React.ReactNode;
  }
  const children = normalizeChildren(schema.children);
  if (!children.length) return null;
  return renderNodes(children, mergeScope, context, '');
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

  // Slot 出口是渲染期指令：直接执行使用方传入的插槽渲染器，不经过组件解析
  const isOutlet = isSlotOutletName(componentName);
  const component = isOutlet ? null : getComponent(componentName, context);

  if (!isOutlet && !component) {
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

    if (isOutlet) {
      return renderSlotOutlet(schema, elementProps, mergeScope, context, elementKey);
    }

    // 区块节点与普通节点一致：JSSlot 属性已编译为插槽渲染函数留在 props 里，children 作为默认插槽内容
    const elementPropsWithKey: Record<string, unknown> = { ...elementProps, key: elementKey };
    const children = getChildren(schema, mergeScope, context);
    return React.createElement(component as string | ComponentType, elementPropsWithKey, children);
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
