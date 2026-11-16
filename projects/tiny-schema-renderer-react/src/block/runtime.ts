import { useRef } from 'react';
import { BLOCKS } from '../context-symbols';
import type { PageContextApi } from '../use-context';
import type { BlockCache } from './define-block';
import type { BlockEventDispatcher } from './types';

/** 自定义属性名只能小写，区块名按原样拼进去会被 React 告警 */
function toScopeName(blockName: string) {
  return blockName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
}

/** 区块复用父渲染器的实例 id，按 blockName 生成独立的 css scope */
export function getBlockScopeId(rendererInstanceId: string, blockName?: string): string {
  return blockName
    ? `data-schema-${rendererInstanceId}-block-${toScopeName(blockName)}`
    : `data-schema-${rendererInstanceId}`;
}

function getParentBlocksCache(parentContext: unknown): BlockCache | undefined {
  return (parentContext as Record<PropertyKey, unknown> | null | undefined)?.[BLOCKS] as BlockCache | undefined;
}

export interface BlockRuntimeOptions {
  contextApi: PageContextApi;
  /** 父渲染器的页面上下文，嵌套区块据此复用父级的区块缓存 */
  parentContext: unknown;
  rendererInstanceId: string;
  blockName?: string;
  /** 区块输入属性，区块内通过 this.props 访问 */
  blockProps?: Record<string, unknown>;
  dispatchEvent: BlockEventDispatcher;
}

export interface BlockRuntime {
  cssScopeId: string;
  blocksCache: BlockCache;
}

/**
 * 区块运行时：把 props / dispatchEvent 同步进渲染器上下文，并解析区块缓存与 css scope。
 * 在 render 阶段写入，保证区块首帧即可读到 this.props / this.dispatchEvent；
 * setSchema 只重置 state / refs，刷新 schema 不会丢失这两个字段。
 */
export function useBlockRuntime(options: BlockRuntimeOptions): BlockRuntime {
  const { contextApi, parentContext, rendererInstanceId, blockName, blockProps, dispatchEvent } = options;
  const { getContext, setContext } = contextApi;

  const runtimeContext = getContext();
  const nextRuntimeContext: Record<string, unknown> = {};
  if (blockProps !== undefined && runtimeContext.props !== blockProps) {
    nextRuntimeContext.props = blockProps;
  }
  if (runtimeContext.dispatchEvent !== dispatchEvent) {
    nextRuntimeContext.dispatchEvent = dispatchEvent;
  }
  if (Object.keys(nextRuntimeContext).length) {
    setContext(nextRuntimeContext);
  }

  // 区块组件缓存挂在页面上下文上：每个渲染器实例一份，嵌套区块复用父级缓存
  const blocksCacheRef = useRef<BlockCache>({});
  const blocksCache = getParentBlocksCache(parentContext) ?? blocksCacheRef.current;

  return {
    cssScopeId: getBlockScopeId(rendererInstanceId, blockName),
    blocksCache,
  };
}
