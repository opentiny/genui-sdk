import type { Node } from '../types';

export const DEFAULT_SLOT_NAME = 'default';

const TEMPLATE_COMPONENT_NAME = 'Template';

export function isTemplateNode(child: Node | null | undefined): boolean {
  return child?.componentName === TEMPLATE_COMPONENT_NAME;
}

/** 优先读 node.slot，其次 props.slot（字符串或 { name }） */
export function getTemplateSlotName(child: Node): string {
  const slot = child.slot ?? child.props?.slot;
  if (typeof slot === 'string' && slot) return slot;
  if (slot && typeof slot === 'object' && typeof (slot as { name?: unknown }).name === 'string') {
    return (slot as { name: string }).name;
  }
  return DEFAULT_SLOT_NAME;
}

function toNodeArray(children: Node['children']): Node[] {
  return Array.isArray(children) ? children : [];
}

export interface SlotGroups {
  /** key 为插槽名，value 为该插槽下的节点（Template 已展开为其 children） */
  groups: Record<string, Node[]>;
  /** 未包裹在 Template 中的普通子节点，同时会并入默认插槽 */
  plainChildren: Node[];
}

/** 按 Template 的 slot 名分组插槽节点，普通子节点并入默认插槽（与 Vue 的 generateSlotGroup 一致） */
export function groupSlotChildren(children: Node['children']): SlotGroups {
  const groups: Record<string, Node[]> = {};
  const plainChildren: Node[] = [];

  toNodeArray(children).forEach((child) => {
    if (!child) return;
    if (isTemplateNode(child)) {
      const slotName = getTemplateSlotName(child);
      const nodes = toNodeArray(child.children);
      // 空的 Template 视为使用方没有提供内容，交给 Slot 渲染兜底 children
      if (nodes.length) {
        groups[slotName] = [...(groups[slotName] ?? []), ...nodes];
      }
      return;
    }
    plainChildren.push(child);
  });

  if (plainChildren.length) {
    groups[DEFAULT_SLOT_NAME] = [...(groups[DEFAULT_SLOT_NAME] ?? []), ...plainChildren];
  }

  return { groups, plainChildren };
}
