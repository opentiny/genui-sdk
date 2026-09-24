import { findComponentPath, getComponentItem } from './template-chat-utils/schema-path';

export interface SelectedSchemaNode {
  id: string;
  componentName: string;
}

export function selectedNodeFromSchemaById(
  schema: Record<string, unknown>,
  id: string,
): SelectedSchemaNode | null {
  const path = findComponentPath(schema, id);
  if (!path) {
    return null;
  }
  const { node } = getComponentItem(schema, path);
  if (!node || typeof node !== 'object') {
    return null;
  }
  const componentName = (node as Record<string, unknown>).componentName;
  if (typeof componentName !== 'string') {
    return null;
  }
  return {
    id,
    componentName,
  };
}
