import type { NodeSchema } from '@opentiny/genui-sdk-core';

// 物料扩展点:物料包把「只有本物料包才需要的节点级特殊处理器」导给出码器,由出码器统一调度。
 
export interface IAngularMaterialsExtension {
  name: string;
  transformNode?: (node: NodeSchema) => void;
}
