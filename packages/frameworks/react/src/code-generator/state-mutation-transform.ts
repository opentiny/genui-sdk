import { packages, transform } from '@babel/standalone';

const t = packages.types;

const ARRAY_MUTATION_METHODS = new Set([
  'copyWithin',
  'fill',
  'pop',
  'push',
  'reverse',
  'shift',
  'sort',
  'splice',
  'unshift',
]);

type BabelPath = {
  node: any;
  getFunctionParent: () => BabelPath | null;
  replaceWith: (node: any) => void;
};

function isThisState(node: any): boolean {
  return (
    t.isMemberExpression(node) &&
    !node.computed &&
    t.isThisExpression(node.object) &&
    t.isIdentifier(node.property, { name: 'state' })
  );
}

function getStatePath(node: any): any[] | null {
  if (isThisState(node)) return [];
  if (!t.isMemberExpression(node)) return null;
  const parentPath = getStatePath(node.object);
  if (!parentPath) return null;
  return [...parentPath, node.computed ? t.cloneNode(node.property, true) : t.stringLiteral(node.property.name)];
}

function pathToArray(path: any[]): any {
  return t.arrayExpression(path.map((item) => t.cloneNode(item, true)));
}

function buildPathAccess(path: any[]): any {
  return path.reduce((result, key) => {
    const cloned = t.cloneNode(key, true);
    return t.memberExpression(result, cloned, !t.isIdentifier(cloned));
  }, t.identifier('prev'));
}

function buildSetState(path: any[], value: any): any {
  return t.callExpression(t.identifier('setState'), [
    t.arrowFunctionExpression(
      [t.identifier('prev')],
      t.callExpression(t.identifier('setIn'), [t.identifier('prev'), pathToArray(path), value]),
    ),
  ]);
}

function replaceMutation(path: BabelPath, replacement: any): void {
  if (path.getFunctionParent()) {
    path.replaceWith(replacement);
  }
}

const ASSIGNMENT_OPERATORS: Record<string, string> = {
  '=': '',
  '+=': '+',
  '-=': '-',
  '*=': '*',
  '/=': '/',
  '%=': '%',
  '**=': '**',
  '<<=': '<<',
  '>>=': '>>',
  '>>>=': '>>>',
  '&=': '&',
  '|=': '|',
  '^=': '^',
};

function transformAssignment(path: BabelPath): void {
  const { left, right, operator } = path.node;
  const statePath = getStatePath(left);
  if (!statePath) return;
  const binaryOperator = ASSIGNMENT_OPERATORS[operator];
  if (binaryOperator === undefined) return;
  const value = binaryOperator
    ? t.binaryExpression(binaryOperator, buildPathAccess(statePath), t.cloneNode(right, true))
    : t.cloneNode(right, true);
  replaceMutation(path, buildSetState(statePath, value));
}

function transformUpdate(path: BabelPath): void {
  const { argument, operator } = path.node;
  const statePath = getStatePath(argument);
  if (!statePath || (operator !== '++' && operator !== '--')) return;
  replaceMutation(
    path,
    buildSetState(
      statePath,
      t.binaryExpression(operator === '++' ? '+' : '-', buildPathAccess(statePath), t.numericLiteral(1)),
    ),
  );
}

function buildArrayMutation(statePath: any[], method: string, args: any[]): any {
  const previous = buildPathAccess(statePath);
  const cloneArgs = () => args.map((item) => t.cloneNode(item, true));
  if (method === 'push') return t.arrayExpression([t.spreadElement(t.cloneNode(previous, true)), ...cloneArgs()]);
  if (method === 'pop') {
    return t.callExpression(t.memberExpression(t.cloneNode(previous, true), t.identifier('slice')), [
      t.numericLiteral(0),
      t.unaryExpression('-', t.numericLiteral(1)),
    ]);
  }
  if (method === 'shift') {
    return t.callExpression(t.memberExpression(t.cloneNode(previous, true), t.identifier('slice')), [
      t.numericLiteral(1),
    ]);
  }
  if (method === 'unshift') return t.arrayExpression([...cloneArgs(), t.spreadElement(t.cloneNode(previous, true))]);
  if (method === 'splice') {
    const [start = t.numericLiteral(0), deleteCount, ...items] = args;
    const head = t.spreadElement(
      t.callExpression(t.memberExpression(t.cloneNode(previous, true), t.identifier('slice')), [
        t.numericLiteral(0),
        t.cloneNode(start, true),
      ]),
    );
    const inserted = items.map((item) => t.cloneNode(item, true));
    if (!deleteCount) return t.arrayExpression([head, ...inserted]);
    const tail = t.spreadElement(
      t.callExpression(t.memberExpression(t.cloneNode(previous, true), t.identifier('slice')), [
        t.binaryExpression('+', t.cloneNode(start, true), t.cloneNode(deleteCount, true)),
      ]),
    );
    return t.arrayExpression([head, ...inserted, tail]);
  }
  const clone = t.callExpression(t.memberExpression(t.arrayExpression([]), t.identifier('concat')), [
    t.cloneNode(previous, true),
  ]);
  return t.callExpression(t.memberExpression(clone, t.identifier(method)), cloneArgs());
}

function transformMutationCall(path: BabelPath): void {
  const { callee, arguments: args } = path.node;
  if (!t.isMemberExpression(callee)) return;
  if (
    t.isIdentifier(callee.object, { name: 'Object' }) &&
    t.isIdentifier(callee.property, { name: 'assign' }) &&
    args[0]
  ) {
    const statePath = getStatePath(args[0]);
    if (!statePath) return;
    const value = t.objectExpression([
      t.spreadElement(t.cloneNode(buildPathAccess(statePath), true)),
      ...args.slice(1).map((item: any) => t.spreadElement(t.cloneNode(item, true))),
    ]);
    replaceMutation(path, buildSetState(statePath, value));
    return;
  }
  if (callee.computed || !t.isIdentifier(callee.property) || !ARRAY_MUTATION_METHODS.has(callee.property.name)) return;
  const statePath = getStatePath(callee.object);
  if (!statePath) return;
  replaceMutation(path, buildSetState(statePath, buildArrayMutation(statePath, callee.property.name, args)));
}

export function transformStateMutations(source: string): string {
  if (!source.includes('this.state')) return source;
  try {
    const marker = '__genui_expression__';
    const result = transform(`const ${marker} = (${source});`, {
      ast: false,
      babelrc: false,
      code: true,
      sourceType: 'script',
      parserOpts: { plugins: ['jsx'] },
      plugins: [
        () => ({
          visitor: {
            AssignmentExpression: transformAssignment,
            UpdateExpression: transformUpdate,
            UnaryExpression(path: BabelPath) {
              if (path.node.operator === 'delete') {
                const statePath = getStatePath(path.node.argument);
                if (statePath?.length) replaceMutation(path, buildSetState(statePath, t.identifier('undefined')));
              }
            },
            CallExpression: transformMutationCall,
          },
        }),
      ],
    });
    const prefix = `const ${marker} = `;
    const code = result.code?.trim();
    return code?.startsWith(prefix) && code.endsWith(';') ? code.slice(prefix.length, -1) : source;
  } catch {
    return source;
  }
}
