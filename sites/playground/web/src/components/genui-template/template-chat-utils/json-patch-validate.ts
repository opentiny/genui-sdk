interface IJsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
  [key: string]: any;
}

function validateOperation(operation: any): boolean {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    return false;
  }

  const validOps = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
  if (!operation.op || !validOps.includes(operation.op)) {
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
