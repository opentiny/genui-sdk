import { generateId } from '../../../utils';

export const generateIdForComponents = (schema: any) => {
  const claimedIds = new Set<string>();

  const traverse = (node: any, index: number | null = null) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        traverse(node.children[i], i);
      }
    }
    if (index !== null) {
      node.index = index;
    }

    if (node.id && !claimedIds.has(node.id)) {
      claimedIds.add(node.id);
      return;
    }
    let nextId: string;
    do {
      nextId = generateId();
    } while (claimedIds.has(nextId));
    node.id = nextId;
    claimedIds.add(nextId);
  };

  traverse(schema);
  return schema;
};
