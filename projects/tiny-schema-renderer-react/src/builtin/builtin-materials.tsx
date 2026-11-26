import { Text } from './Text';
import type { ComponentRegistry } from '../materials';

/**
 * 内置物料。Slot 不在其中：插槽出口是渲染期指令，
 * 在 renderComponent 解析节点时直接执行使用方的插槽渲染器，不经过组件注册表。
 */
export const builtinMaterials: ComponentRegistry = {
  Text,
};
