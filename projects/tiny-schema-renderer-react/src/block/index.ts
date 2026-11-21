// —— 区块定义协议（纯声明类型，对齐物料 bundle 的组件定义）——
export type {
  BlockConfigure,
  BlockEventConfig,
  BlockFunctionInfo,
  BlockFunctionParam,
  BlockI18nText,
  BlockPropertyContent,
  BlockPropertyGroup,
  BlockRegistry,
  BlockSchema,
  BlockSlotConfig,
} from './schema';

// —— 区块组件：定义 / 加载 / 事件派发 ——
export {
  defineBlock,
  getBlock,
  getBlockEventNames,
  getBlockPropertyNames,
  isSchemaBlockComponent,
  loadBlock,
} from './define-block';
export type { BlockCache, BlockEventDispatcher, SchemaBlockComponent, SchemaBlockProps } from './define-block';

// —— 插槽：使用方装填 + 区块内出口 ——
export { collectBlockSlots, getBlockSlotNames } from './slots';
export type { BlockSlotRenderer, BlockSlots } from './slots';
export { Slot } from './Slot';
export type { SlotParam, SlotProps } from './Slot';

// —— 区块上下文 ——
export { BlockContext, useBlockContext } from './block-context';
export type { BlockContextValue } from './block-context';
