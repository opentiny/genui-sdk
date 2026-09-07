import { transform } from '@babel/standalone';

export function transformJSX(code: string): string {
  const marker = '__genui_jsx__';
  const result = transform(`const ${marker} = (${code});`, {
    filename: 'schema.jsx',
    babelrc: false,
    configFile: false,
    ast: false,
    sourceType: 'script',
    presets: [['react', { runtime: 'classic', pragma: 'h' }]],
  });
  const prefix = `const ${marker} = `;
  const out = result.code?.trim() ?? '';
  const idx = out.indexOf(prefix);
  if (idx === -1) return code;
  let expression = out.slice(idx + prefix.length);
  if (expression.endsWith(';')) expression = expression.slice(0, -1);
  return expression.replace(/h\(([A-Z][A-Za-z0-9]*)/g, 'h(this.getComponent("$1")');
}
