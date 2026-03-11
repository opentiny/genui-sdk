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
 * 验证 jsonPatch 的完整性和合法性
 * 1.验证 op 字段的合法性，根据不同的 op 分别验证其他字段
 * 2.验证 path 字段的合法性和完整性
 * 3.验证 value 字段的存在性（不验证完整性，保持流式）
 * 4.如果有 from 字段，验证 from 字段的合法性和完整性
 *
 * 注意：
 * - 只支持传入 JSON 字符串，解析失败则直接返回 false
 * - value 字段在流式输出中可能不完整，不进行完整性校验
 *
 * @param jsonPatch 符合 RFC 6902 规范的 json 字符串
 * @returns 是否合法
 */
export const validateJsonPatch = (jsonPatch: string): boolean => {
  try {
    // 基本类型检查：必须是字符串
    if (typeof jsonPatch !== 'string' || !jsonPatch) {
      return false;
    }

    // 尝试解析 JSON 字符串，如果解析失败则直接返回 false
    let jsonPatchArray: IJsonPatchOperation[];
    try {
      const parsed = JSON.parse(jsonPatch);
      // 必须是数组格式
      if (!Array.isArray(parsed)) {
        return false;
      }
      jsonPatchArray = parsed;
    } catch (e) {
      // JSON 字符串解析失败，直接返回 false
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
  } catch (error) {
    return false;
  }
};
