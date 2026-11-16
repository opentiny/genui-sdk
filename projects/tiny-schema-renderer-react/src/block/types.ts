import type { ReactNode } from 'react';
import type { RootNode } from '../types';

/** 输入/输出声明项；数组写法用 name 表示接口名 */
export interface SchemaIOItem {
  name?: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

/** map 写法的输入/输出声明，key 即接口名 */
export type SchemaIOMap = Record<string, SchemaIOItem>;

/** 输入/输出声明，支持协议的数组写法或 map 写法 */
export type SchemaIO = SchemaIOItem[] | SchemaIOMap;

/** 可复用的 UI 片段，inputs / outputs 的用法见 defineBlock */
export interface BlockSchema extends Omit<RootNode, 'inputs' | 'outputs'> {
  componentName: string;
  inputs?: SchemaIO;
  outputs?: SchemaIO;
}

export type BlockEventDispatcher = (event: string, ...args: unknown[]) => void;

/** scope 为区块内 Slot 节点声明的参数 */
export type BlockSlotRenderer = (scope?: Record<string, unknown>) => ReactNode;

/** key 为插槽名，默认插槽为 default */
export type BlockSlots = Record<string, BlockSlotRenderer>;

/** key 为区块组件名 */
export type BlockRegistry = Record<string, BlockSchema>;

/** 从 inputs / outputs 声明中取出接口名，数组和 map 两种写法都支持 */
export function getSchemaIOKeys(io?: SchemaIO | null): string[] {
  if (!io) return [];
  if (Array.isArray(io)) return io.map((item) => item?.name).filter((name): name is string => !!name);
  return Object.keys(io);
}
