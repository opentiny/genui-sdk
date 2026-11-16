import React, { memo, useContext as reactUseContext, type ComponentType } from 'react';
import { parseData, parseCondition, getLoopScope, getBindProps } from './engine';
import type { Node, RootNode } from './types';
import type { PageContextValue } from './engine';
import { getComponent } from './materials';
import { PageContext } from './page-context';
import { isSchemaBlockComponent } from './block';
import type { BlockSlotRenderer, BlockSlots } from './block';
import { groupSlotChildren, isTemplateNode } from './block/slot-group';

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

/**
 * 插槽内容属于使用方，需要显式提供使用方的 PageContext，
 * 否则其中的 this.props / this.state 会取到区块内部的值。
 */
function renderSlotNodes(nodes: Node[], scope: Record<string, unknown>, context: PageContextValue): React.ReactNode {
  if (!nodes.length) return null;
  return (
    <PageContext.Provider value={context}>
      {nodes.map((child, index) =>
        child ? (
          <SchemaNodeRenderer key={child.id ?? `slot-${child.componentName}-${index}`} schema={child} scope={scope} />
        ) : null,
      )}
    </PageContext.Provider>
  );
}

/** 收集使用方通过 Template 声明的插槽，普通子节点进入默认插槽 */
function collectSlots(
  schema: Node,
  scope: Record<string, unknown>,
  context: PageContextValue,
): { slots: BlockSlots; children: Node[] } {
  const { groups, plainChildren } = groupSlotChildren(schema.children);
  const slots: BlockSlots = {};

  Object.keys(groups).forEach((slotName) => {
    const slotNodes = groups[slotName];
    const renderSlot: BlockSlotRenderer = (slotScope) =>
      renderSlotNodes(slotNodes, { ...scope, ...(slotScope ?? {}) }, context);
    slots[slotName] = renderSlot;
  });

  return { slots, children: plainChildren };
}

function getChildren(schema: Node, mergeScope: Record<string, unknown>, context: PageContextValue): React.ReactNode {
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

  const component = getComponent(componentName, context);

  if (!component) {
    return null;
  }

  const isBlock = isSchemaBlockComponent(component);
  // 非区块的自定义组件也可以声明具名插槽，由组件自行消费 props.slots
  const hasTemplateChildren = typeof component !== 'string' && normalizeChildren(schema.children).some(isTemplateNode);

  const loopList = parseData(loop, scope, context) as unknown[];

  const renderElement = (item?: unknown, index?: number) => {
    const mergeScope = index !== undefined ? getLoopScope({ item, index, loopArgs, scope }) : scope;

    if (!parseCondition(condition, mergeScope, context)) {
      return null;
    }

    const { children: _c, schema: _schema, ...elementProps } = getBindProps(schema, mergeScope, context);
    const elementKey = index !== undefined ? index : key;
    const elementPropsWithKey: Record<string, unknown> = { ...elementProps, key: elementKey };

    let children: React.ReactNode = null;
    if (isBlock || hasTemplateChildren) {
      const { slots, children: plainChildren } = collectSlots(schema, mergeScope, context);
      elementPropsWithKey.slots = slots;
      // 区块只通过 Slot 渲染插槽内容，直接渲染 children 会导致默认插槽重复渲染
      children = isBlock ? null : renderNodes(plainChildren, mergeScope, context, 'children-');
    } else {
      children = getChildren(schema, mergeScope, context);
    }

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
