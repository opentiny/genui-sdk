interface IJsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
  // 其余字段按需扩展
  [key: string]: any;
}

/**
 * 验证单个操作的格式
 */
function validateOperation(operation: any): boolean {
  // 1. 验证操作是对象
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
    return false;
  }

  // 2. 验证 op 字段的合法性
  const validOps = ['add', 'remove', 'replace', 'move', 'copy', 'test'];
  if (!operation.op || !validOps.includes(operation.op)) {
    return false;
  }

  return true;
}

/**
 * 注意：
 * - 仅接收已解析的 JSON Patch 操作数组
 * - value 字段在流式输出中可能不完整，不进行完整性校验
 *
 * @param jsonPatchArray 符合 RFC 6902 规范的操作数组
 * @returns 是否合法
 */
export const validateJsonPatch = (jsonPatchArray: IJsonPatchOperation[]): boolean => {// TODO: 使用zod校验
  if (!Array.isArray(jsonPatchArray)) {
    return false;
  }

  // 验证数组不为空
  if (jsonPatchArray.length === 0) {
    return false;
  }

  // 步骤1: 验证每个操作的格式（op、path、value、from 等字段）
  for (let i = 0; i < jsonPatchArray.length; i++) {
    if (!validateOperation(jsonPatchArray[i])) {
      return false;
    }
  }

  return true;
};
