import type { ReactNode } from 'react';
import { PageContext } from '../page-context';
import { SchemaNodeRenderer, normalizeChildren } from '../Render';
import type { Node } from '../types';
import type { PageContextValue } from '../engine';
import type { BlockSchema } from './schema';

/** scope 为区块内 Slot 节点声明的参数 */
export type BlockSlotRenderer = (scope?: Record<string, unknown>) => ReactNode;

/** key 为插槽名，默认插槽为 default */
export type BlockSlots = Record<string, BlockSlotRenderer>;

/** 读取插槽声明名（slots 的 key，默认插槽为 default） */
export function getBlockSlotNames(schema?: BlockSchema | null): string[] {
  const slots = schema?.schema?.slots;
  if (!slots || typeof slots !== 'object') return [];
  return Object.keys(slots);
}

/**
 * 插槽内容属于使用方，需要显式提供使用方的 PageContext，
 * 否则其中的 this.props / this.state 会取到区块内部的值。
 */
function renderSlotNodes(nodes: Node[], scope: Record<string, unknown>, context: PageContextValue): ReactNode {
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

/**
 * 收集使用方传给区块的插槽：
 * - 声明的具名插槽：使用方以 JSSlot 属性传入，parseData 已编译为 (scope) => ReactNode 渲染器；
 * - 默认插槽：使用方直接写在区块节点 children 里的普通节点，在使用方上下文渲染。
 */
export function collectBlockSlots(
  schema: Node,
  mergeScope: Record<string, unknown>,
  context: PageContextValue,
  declaredSlots: string[],
  elementProps: Record<string, unknown>,
): BlockSlots {
  const slots: BlockSlots = {};

  declaredSlots.forEach((slotName) => {
    const renderer = elementProps[slotName];
    if (typeof renderer === 'function') {
      slots[slotName] = renderer as BlockSlotRenderer;
      delete elementProps[slotName];
    }
  });

  const plainChildren = normalizeChildren(schema.children);
  if (plainChildren.length && !slots.default) {
    const renderSlot: BlockSlotRenderer = (slotScope) =>
      renderSlotNodes(plainChildren, { ...mergeScope, ...(slotScope ?? {}) }, context);
    slots.default = renderSlot;
  }

  return slots;
}
