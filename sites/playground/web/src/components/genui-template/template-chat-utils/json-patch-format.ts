import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { t } from '../../../i18n';
import { findComponentPath, getPositionRelativePath, mergePath } from './schema-path';

export type IFormattedJsonPatchOperation = JsonPatchOp & {
  id?: string;
  idToPath?: string | null;
  relativePath?: string;
};

function toStandardPatchOp(item: IFormattedJsonPatchOperation): JsonPatchOp {
  const { id, idToPath, relativePath, ...standardOp } = item;
  return standardOp as JsonPatchOp;
}

export function clonePlainJson<T>(value: T | null | undefined): T | null {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
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

    if (item.op !== 'move') {
      if (item.path) {
        item.relativePath = item.path;
        item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
      } else {
        item.path = componentPath;
      }
    }

    if (item.op === 'move') {
      const { id, position, positionId } = item as IFormattedJsonPatchOperation & {
        position?: string;
        positionId?: string;
      };
      if (id) {
        item.from = findComponentPath(templeSchema, id);
      }
      if (position && positionId && item.from) {
        const positionPath = findComponentPath(templeSchema, positionId);
        if (positionPath) {
          const relativePath = getPositionRelativePath(position, positionId, positionPath, item.from);
          item.relativePath = relativePath;
          item.path = positionPath === '/' ? relativePath : mergePath(positionPath, relativePath);
        }
      }
    }

    jsonPatchFormatter.patch(templeSchema, [toStandardPatchOp(item)]);

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
    if (formatted.some((op) => !op.idToPath)) {
      return null;
    }

    const standardOperations = formatted.map((op) => toStandardPatchOp(op));
    const target = clonePlainJson(baseline as Record<string, unknown>);
    if (!target) {
      return null;
    }
    jsonPatchFormatter.patch(target, standardOperations);
    return target;
  } catch (error) {
    console.error(error);
    return null;
  }
}
