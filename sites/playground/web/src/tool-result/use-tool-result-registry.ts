import { shallowRef, watch, type Ref } from 'vue';
import { createGetToolResultAction } from './get-tool-result-action';
import {
  createToolResultRegistry,
  rebuildToolResultRegistryFromMessages,
  type ToolResultRegistry,
} from './tool-result-registry';

export interface UseToolResultRegistryOptions {
  getMessages: () => Array<{ role?: string; messages?: Array<Record<string, unknown>> }>;
  conversationId?: Ref<string | undefined>;
}

/**
 * 管理 Playground 会话级工具结果注册表，并在会话切换时重建。
 *
 * @param options - 消息源与会话 id 监听配置
 * @returns registry 与 getToolResult Action
 */
export const useToolResultRegistry = (options: UseToolResultRegistryOptions) => {
  const registry: ToolResultRegistry = createToolResultRegistry();
  const getToolResultAction = createGetToolResultAction(registry);

  const rebuild = () => {
    rebuildToolResultRegistryFromMessages(registry, options.getMessages());
  };

  if (options.conversationId) {
    watch(options.conversationId, rebuild, { immediate: true });
  } else {
    rebuild();
  }

  return {
    registry,
    getToolResultAction,
    rebuildToolResultRegistry: rebuild,
  };
};

/**
 * 创建独立的工具结果注册表实例（供 Template 模式使用）。
 *
 * @returns registry 与相关工厂方法
 */
export const createSharedToolResultRegistry = () => {
  const registryRef = shallowRef<ToolResultRegistry>(createToolResultRegistry());

  return {
    registry: registryRef,
    createGetToolResultAction: () => createGetToolResultAction(registryRef.value),
    rebuildFromMessages: (messages: Array<{ role?: string; messages?: Array<Record<string, unknown>> }>) => {
      rebuildToolResultRegistryFromMessages(registryRef.value, messages);
    },
  };
};
