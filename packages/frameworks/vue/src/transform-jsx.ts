import { transformJSX as transformJSXImpl } from '@opentiny/tiny-schema-renderer/transform-jsx';

/** Transform JSX source into renderer-compatible code. */
export function transformJSX(code: string): string {
  return transformJSXImpl(code);
}
