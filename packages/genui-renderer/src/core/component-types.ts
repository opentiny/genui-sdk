/**
 * 跨框架组件类型定义
 * 用于兼容 Vue、React 和 Angular 的组件定义
 */

/**
 * 基础组件接口
 * Vue、React、Angular 组件都可以实现或继承此接口
 */
export interface IFrameworkComponent {
  /** 组件名称 */
  name?: string;
  /** 组件显示名称 */
  displayName?: string;
}

/**
 * 通用组件类型
 * 支持 Vue Component、React Component 和 Angular Component
 * 三个技术栈的组件都可以使用此类型
 */
export type Component = IFrameworkComponent | any;
