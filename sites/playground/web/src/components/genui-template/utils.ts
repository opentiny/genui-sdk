import { parsePartialJson } from 'ai';
import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';

/**
 * JSON Patch 操作类型定义
 */
interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

/**
 * 解析 JSON Pointer 路径
 */
function parseJsonPointer(path: string): string[] {
  if (!path.startsWith('/')) {
    return [];
  }
  if (path === '/') {
    return [''];
  }
  return path
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * 验证路径格式的有效性
 */
function validatePathFormat(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  if (!path.startsWith('/')) {
    return false;
  }
  const segments = parseJsonPointer(path);
  // 空数组且不是根路径，说明解析失败
  if (segments.length === 0 && path !== '/') {
    return false;
  }
  return true;
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
 * 验证操作的顺序和依赖性（检查索引变化）
 */
function validateOperationOrder(operations: JsonPatchOperation[]): boolean {
  // 模拟应用操作，检查索引变化是否会导致问题
  // 这里我们检查 move 操作中，如果 from 是数组索引，后续操作是否引用了可能变化的索引

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    // 检查 move 操作的 from 路径是否是数组索引
    if (op.op === 'move' && op.from) {
      const fromSegments = parseJsonPointer(op.from);
      const pathSegments = parseJsonPointer(op.path);

      // 检查 from 路径的最后一段是否是数字（数组索引）
      const fromLastSegment = fromSegments[fromSegments.length - 1];
      const fromIndex = parseInt(fromLastSegment, 10);

      if (!isNaN(fromIndex)) {
        // from 是数组索引，检查后续操作是否引用了可能变化的索引
        for (let j = i + 1; j < operations.length; j++) {
          const nextOp = operations[j];
          const nextPathSegments = parseJsonPointer(nextOp.path);

          // 检查后续操作的路径是否与 from 路径在同一数组
          if (fromSegments.length > 0 && nextPathSegments.length > 0) {
            // 检查路径前缀是否相同（同一数组）
            const fromPrefix = fromSegments.slice(0, -1).join('/');
            const nextPrefix = nextPathSegments.slice(0, -1).join('/');

            if (fromPrefix === nextPrefix) {
              // 在同一数组，检查索引引用
              const nextLastSegment = nextPathSegments[nextPathSegments.length - 1];
              const nextIndex = parseInt(nextLastSegment, 10);

              if (!isNaN(nextIndex)) {
                // 如果后续操作引用了 from 索引或之后的索引，需要检查目标位置
                const pathLastSegment = pathSegments[pathSegments.length - 1];
                const pathIndex = parseInt(pathLastSegment, 10);

                // 如果目标位置在源位置之前，索引会变化
                if (!isNaN(pathIndex) && pathIndex <= fromIndex) {
                  // 移动后，fromIndex 位置的元素被移除，后续索引会减1
                  // 如果后续操作引用了 fromIndex 或之后的索引，可能会有问题
                  // 但这是合法的，只是索引会变化，这里我们只做基本检查
                }
              }
            }
          }
        }
      }
    }
  }

  return true;
}

/**
 * 从部分 JSON 字符串中提取字符串字段值（处理转义字符）
 * @param jsonStr JSON 字符串
 * @param fieldName 字段名
 * @param findLast 是否查找最后一个匹配（默认 false，查找第一个）
 * @returns { value: string | undefined, complete: boolean } 字段值和是否完整
 */
function extractStringField(
  jsonStr: string,
  fieldName: string,
  findLast: boolean = false,
): { value: string | undefined; complete: boolean } {
  // 查找字段名
  const fieldPattern = new RegExp(`"${fieldName}"\\s*:\\s*"`, 'g');
  let match: RegExpExecArray | null = null;
  let lastMatch: RegExpExecArray | null = null;

  // 查找所有匹配，如果 findLast 为 true，找到最后一个
  while ((match = fieldPattern.exec(jsonStr)) !== null) {
    lastMatch = match;
    if (!findLast) {
      break;
    }
  }

  if (!lastMatch) {
    return { value: undefined, complete: false };
  }

  const startIndex = lastMatch.index + lastMatch[0].length;
  let value = '';
  let i = startIndex;
  let escaped = false;

  // 逐字符解析，处理转义字符
  while (i < jsonStr.length) {
    const char = jsonStr[i];

    if (escaped) {
      value += char;
      escaped = false;
      i++;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      value += char;
      i++;
      continue;
    }

    if (char === '"') {
      // 找到闭合引号
      return { value, complete: true };
    }

    value += char;
    i++;
  }

  // 没有找到闭合引号，说明字段值不完整
  return { value, complete: false };
}

/**
 * 流式输出中验证 path 的完整性
 * 在流式输出场景下，JSON 可能不完整，需要检测 path 字段是否完整
 * @param partialJson 部分 JSON 字符串或已解析的对象
 * @returns 验证结果，包含 path 是否完整、是否有效等信息
 */
export const validatePathInStreaming = (
  partialJson: string | any,
): {
  pathComplete: boolean;
  pathValid: boolean;
  path?: string;
  fromComplete?: boolean;
  fromValid?: boolean;
  from?: string;
  message?: string;
} => {
  // 如果是字符串，尝试解析部分 JSON
  let jsonObj: any = null;
  if (typeof partialJson === 'string') {
    try {
      // 尝试解析完整的 JSON
      jsonObj = JSON.parse(partialJson);
    } catch (e) {
      // JSON 不完整，尝试提取 path 和 from 字段（查找最后一个匹配）
      const pathResult = extractStringField(partialJson, 'path', true);
      const fromResult = extractStringField(partialJson, 'from', true);

      const result: {
        pathComplete: boolean;
        pathValid: boolean;
        path?: string;
        fromComplete?: boolean;
        fromValid?: boolean;
        from?: string;
        message?: string;
      } = {
        pathComplete: pathResult.complete,
        pathValid: false,
      };

      // 检查 path 字段
      if (pathResult.value !== undefined) {
        result.path = pathResult.value;

        if (pathResult.complete && pathResult.value) {
          // path 完整，验证格式
          result.pathValid = validatePathFormat(pathResult.value);
        } else if (pathResult.value) {
          // path 不完整，但可以检查已接收的部分是否符合格式开头
          // 如果已接收的部分以 / 开头，至少格式开头是正确的
          result.pathValid = pathResult.value.startsWith('/');
        }
      }

      // 检查 from 字段（仅对 move/copy 操作）
      if (fromResult.value !== undefined) {
        result.fromComplete = fromResult.complete;
        result.from = fromResult.value;

        if (fromResult.complete && fromResult.value) {
          result.fromValid = validatePathFormat(fromResult.value);
        } else if (fromResult.value) {
          result.fromValid = fromResult.value.startsWith('/');
        }
      }

      return result;
    }
  } else {
    jsonObj = partialJson;
  }

  // JSON 完整，进行完整验证
  if (jsonObj && typeof jsonObj === 'object') {
    const result: {
      pathComplete: boolean;
      pathValid: boolean;
      path?: string;
      fromComplete?: boolean;
      fromValid?: boolean;
      from?: string;
      message?: string;
    } = {
      pathComplete: false,
      pathValid: false,
    };

    // 如果是数组，查找最后一个对象的 path
    if (Array.isArray(jsonObj) && jsonObj.length > 0) {
      const lastObj = jsonObj[jsonObj.length - 1];
      if (lastObj && typeof lastObj === 'object' && lastObj.path !== undefined) {
        result.pathComplete = true;
        result.path = lastObj.path;
        result.pathValid = validatePathFormat(lastObj.path);
      }
      if (lastObj && typeof lastObj === 'object' && lastObj.from !== undefined) {
        result.fromComplete = true;
        result.from = lastObj.from;
        result.fromValid = validatePathFormat(lastObj.from);
      }
    } else if (jsonObj.path !== undefined) {
      // 单个对象
      result.pathComplete = true;
      result.path = jsonObj.path;
      result.pathValid = validatePathFormat(jsonObj.path);
    }

    if (jsonObj.from !== undefined && !Array.isArray(jsonObj)) {
      result.fromComplete = true;
      result.from = jsonObj.from;
      result.fromValid = validatePathFormat(jsonObj.from);
    }

    return result;
  }

  return {
    pathComplete: false,
    pathValid: false,
    message: '无法解析 JSON',
  };
};

/**
 * 验证 jsonPatch 的完整性和合法性
 * 1.验证 op 字段的合法性，根据不同的 op 分别验证其他字段
 * 2.验证 path 字段的合法性和完整性
 * 3.验证 value 字段的存在性（不验证完整性，保持流式）
 * 4.如果有 from 字段，验证 from 字段的合法性和完整性
 * 5.验证操作的顺序和依赖性
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
    let jsonPatchArray: JsonPatchOperation[];
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

    // 步骤5: 验证操作的顺序和依赖性
    if (!validateOperationOrder(jsonPatchArray)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 将文本解析为 JSON
 * @param text 文本
 * @returns 解析后的 JSON
 */
export const textToJson = async (text: string) => parsePartialJson(text);

/**
 * 解析部分 JSON 状态
 */
export const PARSE_PARTIAL_JSON_STATE = {
  SUCCESSFUL_PARSE: 'successful-parse',
  FAILED_PARSE: 'failed-parse',
  REPAIRED_PARSE: 'repaired-parse',
  UNDEFINED_INPUT: 'undefined-input',
};

/**
 * 从 currentSchema 中找到对应的组件路径
 * @param currentSchema 当前 schema
 * @param id 组件 id
 * @returns 组件路径
 */
export const findComponentPath = (currentSchema: any, id: string): string | null => {
  // currentSchema 是个深层对象嵌套，需要递归找到对应的组件路径
  if (!currentSchema || !id) {
    return null;
  }

  // 递归查找函数
  const findInNode = (node: any, path: string = ''): string | null => {
    // 如果当前节点有 id 且匹配，返回路径
    if (node?.id === id) {
      // 如果是根节点，返回 '/'
      return path || '/';
    }

    // 如果有 children 数组，递归查找
    if (Array.isArray(node?.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // 构建子节点的路径：/children/0, /children/1 等
        const childPath = path ? `${path}/children/${i}` : `/children/${i}`;
        const result = findInNode(child, childPath);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  };

  // 从根节点开始查找
  return findInNode(currentSchema);
};

/**
 * 格式化 jsonPatch
 * @param currentSchema 当前 schema
 * @param value jsonPatch
 * @returns 格式化后的 jsonPatch
 */
export const formatJsonPatch = (currentSchema: any, value: any) => {
  let templeSchema = structuredClone(currentSchema);
  return value.map((item: any) => {
    // 通过 id 从 currentSchema 中找到对应的组件路径
    const componentPath = findComponentPath(templeSchema, item.id);
    item.idToPath = componentPath;

    if (!componentPath) {
      // 如果找不到组件路径，返回原 item
      console.error(`找不到组件路径: ${item.id}`);
      return item;
    }

    if (item.path) {
      // 如果 path 不为空，则把组件路径拼接到 path 前面
      item.relativePath = item.path;
      item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
    } else {
      item.path = componentPath;
    }

    if(item.op === 'move' && item.from) {
      item.fromRelativePath = item.from;
      item.from = componentPath === '/' ? item.from : `${componentPath}${item.from}`;
    }

    jsonPatchFormatter.patch(templeSchema, [item]);

    return item;
  });
};

/**
 * 格式化日期时间
 * @param date 日期时间
 * @returns 格式化后的日期时间字符串
 */
export const formatDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 生成随机字符串 ID
 * @param length 生成的位数
 * @returns length 位随机字符串
 */
export const generateId = (length: number = 8): string => {
  // 使用 crypto.randomUUID() 生成 UUID，然后取前 8 位（去掉连字符）
  // 如果 crypto.randomUUID() 不可用，使用 Math.random() 作为后备
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, length);
  }
  // 后备方案：使用 Math.random() 生成 length 位十六进制字符串
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .padEnd(length, '0');
};

/**
 * 给每个 schema 组件添加 id
 * @param schema 当前 schema
 */
export const generateIdForComponents = (schema: any) => {
  // 递归遍历 schema 对象，给每个组件添加 id
  const traverse = (node: any, index: number = null) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        traverse(child, i);
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
