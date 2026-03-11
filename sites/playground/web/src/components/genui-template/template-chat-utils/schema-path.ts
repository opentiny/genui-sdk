/**
 * 从 currentSchema 中找到对应的组件路径
 * @param currentSchema 当前 schema
 * @param id 组件 id
 * @returns 组件路径
 */
export const findComponentPath = (currentSchema: any, id: string): string | null => {
  // currentSchema 是个深层对象嵌套，需要递归找到对应的组件路径
  if (!currentSchema || !id) {
    return null;
  }

  // 递归查找函数
  const findInNode = (node: any, path: string = ''): string | null => {
    // 如果当前节点有 id 且匹配，返回路径
    if (node?.id === id) {
      // 如果是根节点，返回 '/'
      return path || '/';
    }

    // 如果有 children 数组，递归查找
    if (Array.isArray(node?.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // 构建子节点的路径：/children/0, /children/1 等
        const childPath = path ? `${path}/children/${i}` : `/children/${i}`;
        const result = findInNode(child, childPath);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  };

  // 从根节点开始查找
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

export function getPositionRelativePath(position: string, id: string, componentPath: string, fromPath: string) {
  const idIndexToParentArray = componentPath.split('/');
  const idIndexToParent = idIndexToParentArray.pop()!;
  const prefix = idIndexToParentArray.join('/');

  const fromPrefixArray = fromPath.split('/');
  const fromIdIndexToParent = fromPrefixArray.pop()!;
  const fromPrefix = fromPrefixArray.join('/');

  const isSameParent = prefix === fromPrefix;
  const moveFromIndexLessThanIdIndex =
    isSameParent && parseInt(fromIdIndexToParent, 10) < parseInt(idIndexToParent, 10);

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
    return `/children/${getComponentItem(componentPath, id).node?.children?.length || 0}`;
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
