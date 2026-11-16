import type { ReactNode } from 'react';
import { useBlockContext } from './block-context';

export interface SlotParam {
  name: string;
  value?: unknown;
}

export interface SlotProps {
  name?: string;
  /** 传给插槽内容的作用域参数，支持 SlotParam[] 或对象 */
  params?: SlotParam[] | Record<string, unknown>;
  /** 仅用于物料文档和生成提示词 */
  description?: string;
  /** 使用方未提供该插槽时的兜底内容 */
  children?: ReactNode;
}

function toSlotScope(params: SlotProps['params']): Record<string, unknown> {
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

/** 区块内的插槽占位，由使用方的 Template 子节点填充 */
export function Slot({ name = 'default', params, children }: SlotProps) {
  const block = useBlockContext();
  const renderSlot = block?.slots?.[name];

  if (typeof renderSlot !== 'function') {
    return <>{children ?? null}</>;
  }

  return <>{renderSlot(toSlotScope(params))}</>;
}
