import { transform, packages } from '@babel/standalone';

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
  return [
    ...parentPath,
    node.computed ? t.cloneNode(node.property, true) : t.stringLiteral(node.property.name),
  ];
}

function pathToArray(path: any[]): any {
  return t.arrayExpression(path.map((p) => t.cloneNode(p, true)));
}

/** 生成 prev.<path> 访问表达式 */
function buildPathAccess(path: any[]): any {
  return path.reduce((acc, key) => {
    const cloned = t.cloneNode(key, true);
    const computed = !t.isIdentifier(cloned);
    return t.memberExpression(acc, cloned, computed);
  }, t.identifier('prev'));
}

/** __setState(prev => __setIn(prev, [path], valueExpr)) */
function buildSetState(path: any[], valueExpr: any): any {
  return t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('__setState')), [
    t.arrowFunctionExpression(
      [t.identifier('prev')],
      t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('__setIn')), [
        t.identifier('prev'),
        pathToArray(path),
        valueExpr,
      ]),
    ),
  ]);
}

function rejectOrReplace(path: BabelPath, replacement: any) {
  path.replaceWith(
    path.getFunctionParent()
      ? replacement
      : t.callExpression(t.memberExpression(t.thisExpression(), t.identifier('__rejectStateMutationDuringRender')), []),
  );
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

function transformAssignment(path: BabelPath) {
  const { left, right, operator } = path.node;
  const statePath = getStatePath(left);
  if (!statePath) return;

  const op = ASSIGNMENT_OPERATORS[operator];
  if (op === undefined) return;
  // 短路运算符（&&= 等）语义复杂，回退为直接赋值右侧值
  const valueExpr =
    op === ''
      ? t.cloneNode(right, true)
      : t.binaryExpression(op, buildPathAccess(statePath), t.cloneNode(right, true));
  rejectOrReplace(path, buildSetState(statePath, valueExpr));
}

function transformUpdate(path: BabelPath) {
  const { argument, operator } = path.node;
  const statePath = getStatePath(argument);
  if (!statePath || (operator !== '++' && operator !== '--')) return;

  const valueExpr = t.binaryExpression(
    operator === '++' ? '+' : '-',
    buildPathAccess(statePath),
    t.numericLiteral(1),
  );
  rejectOrReplace(path, buildSetState(statePath, valueExpr));
}

function transformDelete(path: BabelPath) {
  const statePath = getStatePath(path.node.argument);
  if (!statePath || !statePath.length) return;
  rejectOrReplace(path, buildSetState(statePath, t.identifier('undefined')));
}

/** 生成数组 mutation 后的新数组表达式 */
function buildArrayMutation(statePath: any[], method: string, args: any[]): any {
  const prevArr = buildPathAccess(statePath);
  const spreadArr = t.callExpression(t.memberExpression(t.arrayExpression([]), t.identifier('concat')), [
    t.cloneNode(prevArr, true),
  ]);
  const methodCall = (target: any) =>
    t.callExpression(t.memberExpression(target, t.identifier(method)), args.map((a) => t.cloneNode(a, true)));

  switch (method) {
    case 'push':
      return t.arrayExpression([
        t.spreadElement(t.cloneNode(prevArr, true)),
        ...args.map((a) => t.cloneNode(a, true)),
      ]);
    case 'pop':
      return t.callExpression(t.memberExpression(t.cloneNode(prevArr, true), t.identifier('slice')), [
        t.numericLiteral(0),
        t.unaryExpression('-', t.numericLiteral(1)),
      ]);
    case 'shift':
      return t.callExpression(t.memberExpression(t.cloneNode(prevArr, true), t.identifier('slice')), [
        t.numericLiteral(1),
      ]);
    case 'unshift':
      return t.arrayExpression([
        ...args.map((a) => t.cloneNode(a, true)),
        t.spreadElement(t.cloneNode(prevArr, true)),
      ]);
    case 'splice': {
      const [start = t.numericLiteral(0), deleteCount, ...items] = args;
      const head = t.spreadElement(
        t.callExpression(t.memberExpression(t.cloneNode(prevArr, true), t.identifier('slice')), [
          t.numericLiteral(0),
          t.cloneNode(start, true),
        ]),
      );
      const inserted = items.map((a) => t.cloneNode(a, true));
      const tail = deleteCount
        ? t.spreadElement(
            t.callExpression(t.memberExpression(t.cloneNode(prevArr, true), t.identifier('slice')), [
              t.binaryExpression('+', t.cloneNode(start, true), t.cloneNode(deleteCount, true)),
            ]),
          )
        : null;
      return t.arrayExpression(tail ? [head, ...inserted, tail] : [head, ...inserted]);
    }
    default:
      // reverse / sort / fill / copyWithin: 对副本调用方法
      return methodCall(spreadArr);
  }
}

function transformMutationCall(path: BabelPath) {
  const { callee, arguments: args } = path.node;
  if (!t.isMemberExpression(callee)) return;

  if (
    t.isIdentifier(callee.object, { name: 'Object' }) &&
    t.isIdentifier(callee.property, { name: 'assign' }) &&
    args[0]
  ) {
    const statePath = getStatePath(args[0]);
    if (!statePath) return;
    const valueExpr = t.objectExpression([
      t.spreadElement(t.cloneNode(buildPathAccess(statePath), true)),
      ...args.slice(1).map((a: any) => t.spreadElement(t.cloneNode(a, true))),
    ]);
    rejectOrReplace(path, buildSetState(statePath, valueExpr));
    return;
  }

  if (callee.computed || !t.isIdentifier(callee.property) || !ARRAY_MUTATION_METHODS.has(callee.property.name)) return;
  const statePath = getStatePath(callee.object);
  if (!statePath) return;

  rejectOrReplace(path, buildSetState(statePath, buildArrayMutation(statePath, callee.property.name, args)));
}

/** Compiles direct schema writes to the renderer's state store. */
export function transformStateMutations(source: string): string {
  if (!source.includes('this.state')) return source;

  try {
    const marker = '__genui_expression__';
    const result = transform(`const ${marker} = (${source});`, {
      ast: false,
      babelrc: false,
      configFile: false,
      code: true,
      sourceType: 'script',
      parserOpts: { plugins: ['jsx'] },
      plugins: [
        () => ({
          visitor: {
            AssignmentExpression: transformAssignment,
            UpdateExpression: transformUpdate,
            UnaryExpression(path: BabelPath) {
              if (path.node.operator === 'delete') transformDelete(path);
            },
            CallExpression: transformMutationCall,
          },
        }),
      ],
    });
    const prefix = `const ${marker} = `;
    const code = result.code?.trim();
    if (!code?.startsWith(prefix) || !code.endsWith(';')) return source;
    return code.slice(prefix.length, -1);
  } catch {
    return source;
  }
}
