import { defineMaterials } from '../../src';
import { antdMaterials } from '@opentiny/genui-sdk-materials-react-antd/components';

/**
 * 测试应用物料配置，从官方 antd 物料包引入运行时注册表。
 * 对齐 Vue tiny-schema-renderer 的物料解耦方案：渲染器核心不内置具体 UI 库。
 */
export const testMaterials = defineMaterials(antdMaterials);
