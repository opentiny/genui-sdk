/**
 * 将 JSON 分块处理
 * @param jsonData - 完整的 JSON 数据对象
 * @param totalChunks - 总共要生成的 chunk 数量（默认 150）
 * @returns 分块后的字符串数组
 */
export const splitJsonIntoChunks = (
  jsonData: any,
  totalChunks: number = 150
): string[] => {
  // 提取第一层级的关键字段
  const firstChunkData = {
    componentName: jsonData.componentName,
    state: jsonData.state,
    methods: jsonData.methods,
  };

  // 提取 children 部分
  const children = jsonData.children || [];

  // 第一块：componentName、state、methods，加上 "children": 前缀
  const firstChunkJson = JSON.stringify(firstChunkData);
  const firstChunkContent = firstChunkJson.slice(0, -1) + ',"children":';

  // 将 children 压缩成一行
  const childrenJson = JSON.stringify(children);
  const childrenLength = childrenJson.length;

  // 计算每个 chunk 的大小
  const childrenChunks = totalChunks - 1; // 减去第一块
  const chunkSize = Math.ceil(childrenLength / childrenChunks);

  // 生成所有 chunk
  const chunks: string[] = [firstChunkContent];

  for (let i = 0; i < childrenChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, childrenLength);

    let chunkContent = "";
    if (start < childrenLength) {
      chunkContent = childrenJson.substring(start, end);
    }

    chunks.push(chunkContent);
  }

  // 在最后一个 chunk 后添加闭合的 }
  if (chunks.length > 0) {
    chunks[chunks.length - 1] += "}";
  }

  return chunks;
};

