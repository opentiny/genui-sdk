import { defineComponent, getCurrentInstance, h } from 'vue';
import { ElTableColumn } from 'element-plus';

/**
 * ElementPlus 的 ElTableColumn 只在 `onBeforeMount` 时读取一次 `props.type`
 * （`watcher-helper` 的监听列表里没有 `type`），而流式渲染时 `type` 往往是在这一列
 * 挂载之后才生成，导致列一直按 `default` 类型渲染，例如 `type="index"` 的序号列
 * 只有刷新页面后才能显示出序号。
 *
 * 这里把 `type` 绑定到 key 上，`type` 变化时重建整列，让 `onBeforeMount` 重新读取。
 * 组件名保持 `ElTableColumn`：ElementPlus 通过 `type.name === 'ElTableColumn'`
 * 识别表头分组中的子列。
 */
const GenuiElTableColumn = defineComponent({
  name: 'ElTableColumn',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    // ElTableColumn 会直接读取 `instance.parent.store`（hasTreeColumn，用于给
    // 树形表格中没有子节点的行补占位符），包装层会挡住这层关系。这里按
    // ElementPlus 自己的 parent 链找到宿主表格/父列，把 store 挂到包装层实例上。
    const instance = getCurrentInstance();
    let parent: any = instance?.parent;
    while (parent && !parent.tableId && !parent.columnId) {
      parent = parent.vnode?.vParent || parent.parent;
    }
    if (instance && parent?.store) {
      (instance as any).store = parent.store;
    }
    return () => h(ElTableColumn, { ...attrs, key: attrs.type || 'default' }, slots);
  },
});

export default GenuiElTableColumn;
