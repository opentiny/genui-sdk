import { generateId } from '../../../utils';

const mergeIdsFromPrevious = (node: any, prevNode: any) => {
  if (!node || typeof node !== 'object' || !prevNode || typeof prevNode !== 'object') {
    return;
  }

  if (!node.id && prevNode.id) {
    node.id = prevNode.id;
  }

  if (!Array.isArray(node.children) || !Array.isArray(prevNode.children)) {
    return;
  }

  const limit = Math.min(node.children.length, prevNode.children.length);
  for (let i = 0; i < limit; i++) {
    mergeIdsFromPrevious(node.children[i], prevNode.children[i]);
  }
};

export interface GenerateIdOptions {
  previousSchema?: Record<string, unknown> | null;
}

export const generateIdForComponents = (schema: any, options?: GenerateIdOptions) => {
  if (options?.previousSchema) {
    mergeIdsFromPrevious(schema, options.previousSchema);
  }

  const traverse = (node: any, index: number | null = null) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        traverse(node.children[i], i);
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
