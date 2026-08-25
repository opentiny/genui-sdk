import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { t } from '../../../i18n';
import {
  findComponentPath,
  getComponentItem,
  getPositionRelativePath,
  mergePath,
  resolveJsonPointerAppendSentinel,
} from './schema-path';
import { generateIdForComponents } from './schema-id-generator';

export type IFormattedJsonPatchOperation = JsonPatchOp & {
  id?: string;
  idToPath?: string | null;
  relativePath?: string;
  position?: string;
  positionId?: string;
  from?: string;
};

function toStandardPatchOp(item: IFormattedJsonPatchOperation): JsonPatchOp {
  const { id, idToPath, relativePath, position, positionId, ...standardOp } = item;
  return standardOp as JsonPatchOp;
}

function replaceObjectRoot(target: Record<string, unknown>, value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('root replace value must be an object');
  }

  Object.keys(target).forEach((key) => {
    delete target[key];
  });
  Object.assign(target, clonePlainJson(value as Record<string, unknown>));
}

function applyStandardPatchOp(target: Record<string, unknown>, operation: JsonPatchOp): void {
  if (operation.op === 'replace' && operation.path === '') {
    replaceObjectRoot(target, operation.value);
    return;
  }

  jsonPatchFormatter.patch(target, [operation]);
}

export function clonePlainJson<T>(value: T | null | undefined): T | null {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolvePositionedOp(
  templeSchema: any,
  item: IFormattedJsonPatchOperation,
  adjustForSourceRemoval: boolean,
): boolean {
  const { id, position, positionId } = item;
  if (!id || id === positionId) {
    return false;
  }

  if (id) {
    item.from = findComponentPath(templeSchema, id) ?? undefined;
  }
  if (!item.from || !position || !positionId) {
    return false;
  }

  const positionPath = findComponentPath(templeSchema, positionId);
  if (!positionPath) {
    return false;
  }

  const relativePath = getPositionRelativePath(
    position,
    positionId,
    positionPath,
    item.from,
    adjustForSourceRemoval,
    templeSchema,
  );
  if (!relativePath) {
    return false;
  }

  item.relativePath = relativePath;
  item.path = positionPath === '/' ? relativePath : mergePath(positionPath, relativePath);
  return Boolean(item.path);
}

function finalizeAbsolutePath(templeSchema: any, item: IFormattedJsonPatchOperation): boolean {
  if (typeof item.path !== 'string' || (item.path !== '' && !item.path.startsWith('/'))) {
    return false;
  }
  try {
    item.path = resolveJsonPointerAppendSentinel(templeSchema, item.path);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function regenerateCopiedNodeIds(templeSchema: any, item: IFormattedJsonPatchOperation): boolean {
  if (item.op !== 'copy' || typeof item.path !== 'string') {
    return true;
  }

  const copiedNode = getComponentItem(templeSchema, item.path).node;
  if (!copiedNode) {
    return false;
  }

  const resetIds = (node: any) => {
    if (!node || typeof node !== 'object') {
      return;
    }

    delete node.id;
    if (Array.isArray(node.children)) {
      node.children.forEach(resetIds);
    }
  };

  resetIds(copiedNode);
  generateIdForComponents(copiedNode);
  return true;
}

export const formatJsonPatch = (
  currentSchema: any,
  value: any[],
): IFormattedJsonPatchOperation[] => {
  const templeSchema = clonePlainJson(currentSchema ?? {}) ?? {};

  return value.map((originItem: any) => {
    const item = clonePlainJson(originItem) as IFormattedJsonPatchOperation;
    const componentPath = findComponentPath(templeSchema, item.id);
    item.idToPath = componentPath;

    if (!componentPath) {
      console.error(t('templateEditor.componentPathNotFound', { id: String(item.id ?? '') }));
      return item;
    }

    if (item.op === 'move' || item.op === 'copy') {
      if (!resolvePositionedOp(templeSchema, item, item.op === 'move')) {
        item.idToPath = null;
        return item;
      }
    } else if (item.path) {
      item.relativePath = item.path;
      item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
    } else if (item.op === 'replace' && componentPath === '/') {
      item.path = '';
    } else {
      item.path = componentPath;
    }

    if (!finalizeAbsolutePath(templeSchema, item)) {
      item.idToPath = null;
      return item;
    }

    applyStandardPatchOp(templeSchema, toStandardPatchOp(item));
    if (!regenerateCopiedNodeIds(templeSchema, item)) {
      item.idToPath = null;
    }

    return item;
  });
};

export function applyJsonPatchOperations(
  baseline: unknown,
  operations: unknown[],
): Record<string, unknown> | null {
  if (!baseline || !Array.isArray(operations) || operations.length === 0) {
    return null;
  }

  try {
    const formatted = formatJsonPatch(baseline, operations);
    if (formatted.some((op) => !op.idToPath || typeof op.path !== 'string')) {
      return null;
    }

    const standardOperations = formatted.map((op) => toStandardPatchOp(op));
    const target = clonePlainJson(baseline as Record<string, unknown>);
    if (!target) {
      return null;
    }
    standardOperations.forEach((operation) => applyStandardPatchOp(target, operation));
    if (standardOperations.some((op) => op.op === 'copy')) {
      generateIdForComponents(target);
    }
    return target;
  } catch (error) {
    console.error(error);
    return null;
  }
}
