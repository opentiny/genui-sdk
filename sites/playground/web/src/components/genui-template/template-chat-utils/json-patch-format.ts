import * as jsonPatchFormatter from 'jsondiffpatch/formatters/jsonpatch';
import { findComponentPath, getPositionRelativePath, mergePath } from './schema-path';

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

    if (item.op !== 'move') {
      if (item.path) {
        // 如果 path 不为空，则把组件路径拼接到 path 前面
        item.relativePath = item.path;
        item.path = componentPath === '/' ? item.path : `${componentPath}${item.path}`;
      } else {
        item.path = componentPath;
      }
    }

    if (item.op === 'move') {
      const { id, position, positionId } = item;
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
