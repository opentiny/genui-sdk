export const findComponentPath = (currentSchema: any, id: string): string | null => {
  if (!currentSchema || !id) {
    return null;
  }

  const findInNode = (node: any, path: string = ''): string | null => {
    if (node?.id === id) {
      return path || '/';
    }

    if (Array.isArray(node?.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childPath = path ? `${path}/children/${i}` : `/children/${i}`;
        const result = findInNode(child, childPath);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  };

  return findInNode(currentSchema);
};

export function getComponentItem(schema: any, componentPath: string, indexMode: boolean = false) {
  const pathSegments = componentPath.split('/');
  let currentNodeKey: any = null;
  let currentNode = schema;
  const path: (string | number)[] = [];

  for (let i = 1; i < pathSegments.length; i++) {
    if (!currentNode) {
      return {
        node: null,
        path: [...path, ...pathSegments.slice(i)],
        lostTrackPath: pathSegments.slice(0, i + 1).join('/'),
      };
    }

    if (Array.isArray(currentNode)) {
      currentNodeKey = parseInt(pathSegments[i], 10);
      if (indexMode && pathSegments[i] === 'children') {
        const rIndex = currentNode.findIndex((item: any) => item.index === currentNodeKey);
        currentNode = currentNode[rIndex];
        path.push(rIndex);
      } else {
        currentNode = currentNode[currentNodeKey];
        path.push(currentNodeKey);
      }
    } else {
      currentNodeKey = pathSegments[i];
      currentNode = currentNode[currentNodeKey];
      path.push(currentNodeKey);
    }
  }

  return {
    node: currentNode,
    path,
  };
}

function decodePointerSegments(pointer: string): string[] {
  if (!pointer || pointer === '/') return [];
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function encodePointerSegments(segments: string[]): string {
  if (segments.length === 0) return '/';
  return `/${segments.map((s) => s.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`;
}

function getDirectChildrenPath(componentPath: string): string {
  return componentPath === '/' ? '/children' : `${componentPath}/children`;
}

/**
 * RFC 6902：path 末段 `-` 表示数组末尾追加。
 * jsondiffpatch 未实现该哨兵，展开前需换成当前 length。
 */
export function resolveJsonPointerAppendSentinel(root: unknown, pointer: string): string {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) {
    return pointer;
  }

  const segments = decodePointerSegments(pointer);
  if (segments.length === 0 || segments[segments.length - 1] !== '-') {
    return pointer;
  }

  let current: any = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (current == null) {
      throw new Error(`cannot resolve append sentinel in ${pointer}: missing parent`);
    }
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (Number.isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`cannot resolve append sentinel in ${pointer}: bad index ${segment}`);
      }
      current = current[index];
    } else if (typeof current === 'object') {
      current = current[segment];
    } else {
      throw new Error(`cannot resolve append sentinel in ${pointer}: not an object/array`);
    }
  }

  if (!Array.isArray(current)) {
    throw new Error(`cannot resolve append sentinel in ${pointer}: parent is not an array`);
  }

  return encodePointerSegments([...segments.slice(0, -1), String(current.length)]);
}

export function getPositionRelativePath(
  position: string,
  _id: string,
  componentPath: string,
  fromPath: string,
  adjustForSourceRemoval: boolean = true,
  schema?: any,
): string | undefined {
  // 文档根没有父数组，before/after 无意义
  if (componentPath === '/' && (position === 'before' || position === 'after')) {
    return undefined;
  }

  const idIndexToParentArray = componentPath.split('/');
  const idIndexToParent = idIndexToParentArray.pop()!;
  const prefix = idIndexToParentArray.join('/');
  const anchorIndex = Number.parseInt(idIndexToParent, 10);

  if (
    (position === 'before' || position === 'after') &&
    (idIndexToParent === '' || Number.isNaN(anchorIndex))
  ) {
    return undefined;
  }

  const fromPrefixArray = fromPath.split('/');
  const fromIdIndexToParent = fromPrefixArray.pop()!;
  const fromPrefix = fromPrefixArray.join('/');

  const isSameParent = prefix === fromPrefix;
  const moveFromIndexLessThanIdIndex =
    adjustForSourceRemoval &&
    isSameParent &&
    parseInt(fromIdIndexToParent, 10) < anchorIndex;

  if (position === 'before') {
    if (moveFromIndexLessThanIdIndex) {
      return `../${anchorIndex - 1}`;
    }
    return `../${anchorIndex}`;
  } else if (position === 'after') {
    if (moveFromIndexLessThanIdIndex) {
      return `../${anchorIndex}`;
    }
    return `../${anchorIndex + 1}`;
  } else if (position === 'inside') {
    const children = schema ? getComponentItem(schema, componentPath).node?.children : [];
    if (!Array.isArray(children)) {
      return undefined;
    }

    const sourceIsDirectChild =
      adjustForSourceRemoval && fromPrefix === getDirectChildrenPath(componentPath);
    const childrenLen = sourceIsDirectChild ? Math.max(children.length - 1, 0) : children.length;
    return `/children/${childrenLen}`;
  }

  return undefined;
}

export function mergePath(path1: string, path2: string) {
  const path1Segments = path1.split('/').filter((segment) => segment !== '');
  const path2Segments = path2.split('/').filter((segment) => segment !== '');
  const mergedSegments = [...path1Segments, ...path2Segments];

  for (let i = 0; i < mergedSegments.length; i++) {
    const segment = mergedSegments[i];
    if (segment === '..' && i > 0) {
      mergedSegments.splice(i - 1, 2);
      i -= 2;
    }
  }

  return '/' + mergedSegments.join('/');
}
