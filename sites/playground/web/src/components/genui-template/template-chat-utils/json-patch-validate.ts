interface IJsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy';
  path?: string;
  value?: any;
  from?: string;
  id?: string;
  positionId?: string;
  position?: 'before' | 'after' | 'inside';
  [key: string]: any;
}

function validateOperation(operation: any): boolean {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    return false;
  }

  const validOps = ['add', 'remove', 'replace', 'move', 'copy'];
  if (!operation.op || !validOps.includes(operation.op)) {
    return false;
  }

  if ((operation.op === 'move' || operation.op === 'copy') && operation.id === operation.positionId) {
    return false;
  }

  if (
    operation.op === 'replace' &&
    operation.path === undefined &&
    (
      !operation.value ||
      typeof operation.value !== 'object' ||
      Array.isArray(operation.value) ||
      typeof operation.value.componentName !== 'string' ||
      operation.value.componentName.length === 0 ||
      typeof operation.value.id !== 'string' ||
      operation.value.id.length === 0
    )
  ) {
    return false;
  }

  return true;
}

export const validateJsonPatch = (jsonPatchArray: IJsonPatchOperation[]): boolean => {
  if (!Array.isArray(jsonPatchArray)) {
    return false;
  }

  if (jsonPatchArray.length === 0) {
    return false;
  }

  for (let i = 0; i < jsonPatchArray.length; i++) {
    if (!validateOperation(jsonPatchArray[i])) {
      return false;
    }
  }

  return true;
};
