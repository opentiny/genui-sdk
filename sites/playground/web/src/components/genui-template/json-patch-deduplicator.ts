/**
 * JSON Patch 操作去重管理器
 * 用于避免重复执行已 patch 过的操作
 */

interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  id?: string;
  path?: string;
  value?: any;
  from?: string;
}

export class JsonPatchDeduplicator {
  // 记录已执行的 patch 操作，避免重复执行
  // key: cardId, value: Set<operationHash>
  private executedPatchOperations = new Map<string, Set<string>>();

  /**
   * 生成操作的唯一标识 hash
   * 基于 op、path、id 和 value 生成，用于判断操作是否已执行
   */
  private generateOperationHash(operation: JsonPatchOperation): string {
    // 创建一个稳定的字符串表示
    // 注意：value 可能很大，所以只取关键字段
    const key = JSON.stringify({
      op: operation.op,
      path: operation.path,
      id: operation.id,
      // 对于 value，如果是对象，只取关键字段；如果是简单值，直接使用
      value:
        operation.value && typeof operation.value === 'object'
          ? JSON.stringify(operation.value).substring(0, 200) // 限制长度避免 hash 过大
          : operation.value,
      from: operation.from,
    });
    // 使用简单的 hash 函数
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return `${hash.toString(36)}-${key.length}`;
  }

  /**
   * 检查操作是否已执行
   */
  isOperationExecuted(cardId: string, operation: JsonPatchOperation): boolean {
    if (!cardId) return false;
    const executedSet = this.executedPatchOperations.get(cardId);
    if (!executedSet) return false;
    const hash = this.generateOperationHash(operation);
    return executedSet.has(hash);
  }

  /**
   * 标记操作已执行
   */
  markOperationExecuted(cardId: string, operation: JsonPatchOperation): void {
    if (!cardId) return;
    if (!this.executedPatchOperations.has(cardId)) {
      this.executedPatchOperations.set(cardId, new Set());
    }
    const hash = this.generateOperationHash(operation);
    this.executedPatchOperations.get(cardId)!.add(hash);
  }

  /**
   * 清理指定卡片的已执行操作记录
   * 通常在切换 schema 版本时调用，允许重新执行操作
   */
  clearCardOperations(cardId: string): void {
    if (cardId && this.executedPatchOperations.has(cardId)) {
      this.executedPatchOperations.delete(cardId);
      console.log(`已清理卡片 ${cardId} 的 patch 操作记录`);
    }
  }

  /**
   * 过滤掉已执行的操作，返回需要执行的新操作
   */
  filterExecutedOperations(cardId: string, operations: JsonPatchOperation[]): JsonPatchOperation[] {
    const operationKey = cardId || '__default__';
    return operations.filter((operation: JsonPatchOperation) => {
      const executed = this.isOperationExecuted(operationKey, operation);
      if (executed) {
        console.warn('跳过已执行的操作:', operation);
      }
      return !executed;
    });
  }

  /**
   * 标记所有操作为已执行
   */
  markAllOperationsExecuted(cardId: string, operations: JsonPatchOperation[]): void {
    const operationKey = cardId || '__default__';
    operations.forEach((operation: JsonPatchOperation) => {
      this.markOperationExecuted(operationKey, operation);
    });
  }
}

// 导出单例实例
export const jsonPatchDeduplicator = new JsonPatchDeduplicator();
