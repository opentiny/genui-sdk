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

export function getPositionRelativePath(
  position: string,
  _id: string,
  componentPath: string,
  fromPath: string,
  adjustForSourceRemoval: boolean = true,
  schema?: any,
) {
  const idIndexToParentArray = componentPath.split('/');
  const idIndexToParent = idIndexToParentArray.pop()!;
  const prefix = idIndexToParentArray.join('/');

  const fromPrefixArray = fromPath.split('/');
  const fromIdIndexToParent = fromPrefixArray.pop()!;
  const fromPrefix = fromPrefixArray.join('/');

  const isSameParent = prefix === fromPrefix;
  const moveFromIndexLessThanIdIndex =
    adjustForSourceRemoval &&
    isSameParent &&
    parseInt(fromIdIndexToParent, 10) < parseInt(idIndexToParent, 10);

  if (position === 'before') {
    if (moveFromIndexLessThanIdIndex) {
      return `../${parseInt(idIndexToParent, 10) - 1}`;
    }
    return `../${parseInt(idIndexToParent, 10)}`;
  } else if (position === 'after') {
    if (moveFromIndexLessThanIdIndex) {
      return `../${parseInt(idIndexToParent, 10)}`;
    }
    return `../${parseInt(idIndexToParent, 10) + 1}`;
  } else if (position === 'inside') {
    const childrenLen = schema
      ? (getComponentItem(schema, componentPath).node?.children?.length ?? 0)
      : 0;
    return `/children/${childrenLen}`;
  }
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
