import { generateId } from '../../../utils';

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
