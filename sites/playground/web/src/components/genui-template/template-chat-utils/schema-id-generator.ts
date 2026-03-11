// schema 相关 ID 工具
export const generateId = (length: number = 8): string => {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID().replace(/-/g, '').substring(0, length);
  }
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .padEnd(length, '0');
};

export const generateIdForComponents = (schema: any) => {
  const traverse = (node: any, index: number | null = null) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        traverse(child, i);
      }
    }
    if (index !== null) {
      node.index = index;
    }

    if (node.id) {
      return;
    }
    node.id = generateId();
  };

  traverse(schema);

  return schema;
};
