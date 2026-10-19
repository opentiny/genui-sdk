/**
 * 输出中是否已出现指定 wrapper 组件的 `"componentName": "<name>"` 声明。
 * 名称来自 materialsMeta.wrapperComponent（Vue 默认 TinyCard，Angular 默认 TiCard）。
 */
export function hasWrapperComponentDeclaration(text: string, wrapperComponent: string): boolean {
  if (!wrapperComponent) return false;
  const escaped = wrapperComponent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`"componentName"\\s*:\\s*"${escaped}"`).test(text);
}
