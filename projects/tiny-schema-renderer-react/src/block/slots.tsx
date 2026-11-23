import { Fragment, type ReactNode } from 'react';
import { getChildren } from '../Render';
import type { Node } from '../types';
import type { PageContextValue } from '../engine';
import type { BlockSchema } from './schema';

/** 插槽渲染器：使用方以 JSSlot 属性传入并随 props 通道下传，scope 为 Slot 出口节点声明的参数 */
export type BlockSlotRenderer = (scope?: Record<string, unknown>) => ReactNode;

/** 读取插槽声明名（slots 的 key，默认插槽为 default） */
export function getBlockSlotNames(schema?: BlockSchema | null): string[] {
  const slots = schema?.schema?.slots;
  if (!slots || typeof slots !== 'object') return [];
  return Object.keys(slots);
}

/** Slot 出口节点支持的名字，与 Vue 渲染器保持一致 */
const SLOT_COMPONENT_NAMES = ['Slot', 'slot'];

/** 判断节点是否为区块内的插槽出口：出口是渲染期指令，不经过组件解析 */
export function isSlotOutletName(componentName: string): boolean {
  return SLOT_COMPONENT_NAMES.includes(componentName);
}

/** Slot 出口节点的作用域参数声明，value 为区块内表达式 */
export interface SlotOutletProps {
  /** 插槽名，默认插槽为 default */
  name?: string;
  /** 传给插槽内容的作用域参数，支持 [{name, value}] 数组或对象两种写法 */
  params?: Array<{ name: string; value?: unknown }> | Record<string, unknown>;
}

/** 出口 params 已由 getBindProps 求值，这里只做形参名到作用域值的映射 */
export function toSlotScope(params: SlotOutletProps['params']): Record<string, unknown> {
  if (!params) return {};
  if (Array.isArray(params)) {
    return params.reduce<Record<string, unknown>>((scope, param) => {
      if (param && typeof param.name === 'string') {
        scope[param.name] = param.value;
      }
      return scope;
    }, {});
  }
  return typeof params === 'object' ? { ...(params as Record<string, unknown>) } : {};
}

/** 读取区块（父组件）的 props：插槽函数由使用方以 JSSlot 属性传入，与普通属性同通道 */
function getBlockProps(context: PageContextValue): Record<string, unknown> | undefined {
  return context.props as Record<string, unknown> | undefined;
}

/**
 * 渲染插槽出口指令：在渲染期直接执行父组件 props 里的插槽渲染器并返回结果，
 * 使用方未提供该插槽时，渲染出口节点的 children 作为兜底内容（区块上下文）。
 */
export function renderSlotOutlet(
  schema: Node,
  elementProps: Record<string, unknown>,
  mergeScope: Record<string, unknown>,
  context: PageContextValue,
  key?: string | number,
): ReactNode {
  const blockProps = getBlockProps(context);
  const name = typeof elementProps.name === 'string' ? elementProps.name : 'default';
  const renderSlot = blockProps?.[name];
  const content =
    typeof renderSlot === 'function'
      ? (renderSlot as BlockSlotRenderer)(toSlotScope(elementProps.params as SlotOutletProps['params']))
      : getChildren(schema, mergeScope, context);
  return <Fragment key={key}>{content}</Fragment>;
}
