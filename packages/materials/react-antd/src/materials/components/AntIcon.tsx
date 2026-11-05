import { iconMap } from './icon-map';

export interface AntIconProps {
  /** 图标名称 */
  name?: string;
  /**
   * 其余属性（className、style、data-* 以及渲染器注入的 css 作用域属性等）
   * 会原样透传给底层图标组件。
   */
  [key: string]: unknown;
}

export function AntIcon({ name = '', ...rest }: AntIconProps) {
  // 只认映射表自身的键，避免 __proto__、constructor 等原型链上的属性被当成图标组件渲染
  const IconComponent = Object.prototype.hasOwnProperty.call(iconMap, name)
    ? iconMap[name]
    : undefined;

  return IconComponent ? <IconComponent {...rest} /> : null;
}
