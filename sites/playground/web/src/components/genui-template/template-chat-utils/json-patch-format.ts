import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import type { JsonPatchOp } from 'jsondiffpatch/formatters/jsonpatch-apply';
import { t } from '../../../i18n';
import { findComponentPath, getPositionRelativePath, mergePath } from './schema-path';
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
) {
  const { id, position, positionId } = item;
  if (id) {
    item.from = findComponentPath(templeSchema, id);
  }
  if (position && positionId && item.from) {
    const positionPath = findComponentPath(templeSchema, positionId);
    if (positionPath) {
      const relativePath = getPositionRelativePath(
        position,
        positionId,
        positionPath,
        item.from,
        adjustForSourceRemoval,
        templeSchema,
      );
      item.relativePath = relativePath;
      item.path = positionPath === '/' ? relativePath : mergePath(positionPath, relativePath!);
    }
  }
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

    if (item.op === 'move') {
      resolvePositionedOp(templeSchema, item, true);
    } else if (item.op === 'copy') {
      resolvePositionedOp(templeSchema, item, false);
    } else if (item.path) {
      item.relativePath = item.path;
      item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
    } else {
      item.path = componentPath;
    }

    jsonPatchFormatter.patch(templeSchema, [toStandardPatchOp(item)]);
    if (item.op === 'copy') {
      generateIdForComponents(templeSchema);
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
    if (formatted.some((op) => !op.idToPath)) {
      return null;
    }

    const standardOperations = formatted.map((op) => toStandardPatchOp(op));
    const target = clonePlainJson(baseline as Record<string, unknown>);
    if (!target) {
      return null;
    }
    jsonPatchFormatter.patch(target, standardOperations);
    if (standardOperations.some((op) => op.op === 'copy')) {
      generateIdForComponents(target);
    }
    return target;
  } catch (error) {
    console.error(error);
    return null;
  }
}
