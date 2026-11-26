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
export type { BlockCache, SchemaBlockComponent, SchemaBlockProps } from './define-block';

// —— 插槽：区块内出口（Slot 是渲染期指令，插槽函数随 props 通道下传）——
export { getBlockSlotNames, isSlotOutletName, renderSlotOutlet, toSlotScope } from './slots';
export type { BlockSlotRenderer, SlotOutletProps } from './slots';
