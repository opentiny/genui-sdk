/** 物料注册表在渲染器上下文中的键 */
export const MATERIALS = Symbol('MATERIALS');

/** 区块组件缓存在渲染器上下文中的键，每个渲染器实例一份，嵌套渲染器共享父级缓存 */
export const BLOCKS = Symbol('BLOCKS');
