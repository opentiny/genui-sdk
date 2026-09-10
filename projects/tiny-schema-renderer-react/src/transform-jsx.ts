import { transform } from '@babel/standalone';

function rewriteHComponentArgs({ types: t }: { types: Record<string, any> }) {
  function getComponentCall(name: string) {
    return t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('getComponent')), [
      t.stringLiteral(name),
    ]);
  }

  function rewrite(node: any): any {
    if (t.isIdentifier(node) && /^[A-Z]/.test(node.name)) {
      return getComponentCall(node.name);
    }
    if (t.isMemberExpression(node)) {
      const object = rewrite(node.object);
      return object ? t.memberExpression(object, node.property, node.computed) : null;
    }
    return null;
  }

  return {
    visitor: {
      CallExpression(path: { node: { callee: unknown; arguments: any[] } }) {
        if (!t.isIdentifier(path.node.callee, { name: 'h' })) return;
        const next = rewrite(path.node.arguments[0]);
        if (next) path.node.arguments[0] = next;
      },
    },
  };
}

export function transformJSX(code: string): string {
  const marker = '__genui_jsx__';
  const result = transform(`const ${marker} = (${code});`, {
    filename: 'schema.jsx',
    babelrc: false,
    configFile: false,
    ast: false,
    sourceType: 'script',
    presets: [['react', { runtime: 'classic', pragma: 'h' }]],
    plugins: [rewriteHComponentArgs],
  });
  const prefix = `const ${marker} = `;
  const out = result.code?.trim() ?? '';
  const idx = out.indexOf(prefix);
  if (idx === -1) return code;
  let expression = out.slice(idx + prefix.length);
  if (expression.endsWith(';')) expression = expression.slice(0, -1);
  return expression;
}
