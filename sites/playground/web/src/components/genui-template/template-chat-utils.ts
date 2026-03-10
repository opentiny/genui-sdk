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

function getComponentItem(schema: any, componentPath: string, indexMode: boolean = false) {
  const pathSegments = componentPath.split('/');
  let currentNodeKey = null;
  let currentNode = schema;
  let path = [];
  for (let i = 1; i < pathSegments.length; i++) {
    if (!currentNode) {
      return {
        node: null,
        path: [...path, ...pathSegments.slice(i)],
        lostTrackPath: pathSegments.slice(0, i + 1).join('/')
      };
    }
    if (Array.isArray(currentNode)) { 
      currentNodeKey = parseInt(pathSegments[i]);
      if (indexMode && currentNodeKey === 'children') {
        const rIndex = currentNode.findIndex((item: any) => item.index === currentNodeKey);
        currentNode = currentNode[rIndex];
        path.push(rIndex);
      } else {
        currentNode = currentNode[currentNodeKey];
        path.push(currentNodeKey);
      }
    }else {
      currentNodeKey = pathSegments[i];
      currentNode = currentNode[currentNodeKey];
      path.push(currentNodeKey);
    }
  }
  return {
    node: currentNode,
    path: path
  };
}

function getPositionRelativePath(position: string, id: string, componentPath: string, fromPath: string) {
  const idIndexToParentArray = componentPath.split('/');
  const idIndexToParent = idIndexToParentArray.pop();
  const prefix = idIndexToParentArray.join('/');

  const fromPrefixArray = fromPath.split('/');
  const fromIdIndexToParent = fromPrefixArray.pop();
  const fromPrefix = fromPrefixArray.join('/');

  const isSameParent = prefix === fromPrefix;
  const moveFromIndexLessThanIdIndex = isSameParent && parseInt(fromIdIndexToParent, 10) < parseInt(idIndexToParent, 10);

  if (position === 'before') {
    if (moveFromIndexLessThanIdIndex) {
      return `../${parseInt(idIndexToParent, 10) - 1}`;
    }
    return `../${parseInt(idIndexToParent, 10)}`;
  } else if (position === 'after') {
    if (moveFromIndexLessThanIdIndex) {
      return `../${parseInt(idIndexToParent, 10)}`;
    }
    return `../${parseInt(idIndexToParent, 10) + 1}`;
  } else if (position === 'inside') {
    return `/children/${getComponentItem(componentPath, id).node?.children?.length || 0}`;
  }
}

function mergePath(path1: string, path2: string) {
  const path1Segments = path1.split('/') .filter(segment => segment !== '');
  const path2Segments = path2.split('/') .filter(segment => segment !== '');
  const mergedSegments = [...path1Segments, ...path2Segments];
  mergedSegments.forEach((segment, index) => {
    if (segment === '..') {
      mergedSegments.splice(index - 1, 2);
    }
  });
  return '/' + mergedSegments.join('/');
}

/**
 * 格式化 jsonPatch
 * @param currentSchema 当前 schema
 * @param value jsonPatch
 * @returns 格式化后的 jsonPatch
 */
export const formatJsonPatch = (currentSchema: any, value: any) => {
  let templeSchema = structuredClone(currentSchema);
  return value.map((originItem: any) => {
    const item = structuredClone(originItem);
    // 通过 id 从 currentSchema 中找到对应的组件路径
    const componentPath = findComponentPath(templeSchema, item.id);
    item.idToPath = componentPath;

    if (!componentPath) {
      // 如果找不到组件路径，返回原 item
      console.error(`找不到组件路径: ${item.id}`);
      return item;
    }

    if (item.op !== 'move'){
      if (item.path) {
        // 如果 path 不为空，则把组件路径拼接到 path 前面
        item.relativePath = item.path;
        item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
      } else {
        item.path = componentPath;
      }
    }

    if(item.op === 'move') {
      const {id, position, positionId} = item;
      if (id) {
        item.from = findComponentPath(templeSchema, id);
      }
      if (position) {
        const positionPath = findComponentPath(templeSchema, positionId);
        const relativePath = getPositionRelativePath(position, positionId, positionPath, item.from);
        item.relativePath = relativePath;
  
        item.path = positionPath === '/' ? relativePath : mergePath(positionPath, relativePath);
      }
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
