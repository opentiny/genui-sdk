/**
 * 将 JSON 分块处理
 * @param jsonData - 完整的 JSON 数据对象
 * @param chunkSize - 每个切块的字符长度（默认 30）
 * @returns 分块后的字符串数组
 */
export const splitJsonIntoChunks = (
  jsonData: any,
  chunkSize: number = 30
): string[] => {
  const firstChunkData = {
    componentName: jsonData.componentName,
    state: jsonData.state,
    methods: jsonData.methods,
  };

  const children = jsonData.children || [];

  const firstChunkJson = JSON.stringify(firstChunkData);
  const firstChunkContent = firstChunkJson.slice(0, -1) + ',"children":';

  const childrenJson = JSON.stringify(children);
  const childrenLength = childrenJson.length;

  const chunks: string[] = [firstChunkContent];

  for (let i = 0; i < childrenLength; i += chunkSize) {
    const end = Math.min(i + chunkSize, childrenLength);
    const chunkContent = childrenJson.substring(i, end);
    chunks.push(chunkContent);
  }

  if (chunks.length > 0) {
    chunks[chunks.length - 1] += "}";
  }

  return chunks;
};
