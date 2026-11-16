import { createElement, useCallback, useRef, type ComponentType, type ReactNode } from 'react';
import { SchemaRenderer } from '../RenderMain';
import { BLOCKS, MATERIALS } from '../context-symbols';
import { BlockContext } from './block-context';
import { getSchemaIOKeys, type BlockEventDispatcher, type BlockSchema, type BlockSlots } from './types';

export interface SchemaBlockProps {
  slots?: BlockSlots;
  children?: ReactNode;
  [key: string]: unknown;
}

export type SchemaBlockComponent = ComponentType<SchemaBlockProps> & {
  __blockSchema: BlockSchema;
};

/** 不应出现在区块 this.props 中的属性 */
const BLOCK_INTERNAL_PROPS = new Set(['data-id', 'data-tag', 'children', 'slots', 'key']);

function pickBlockProps(props: Record<string, unknown>): Record<string, unknown> {
  const blockProps: Record<string, unknown> = {};
  Object.keys(props).forEach((key) => {
    if (BLOCK_INTERNAL_PROPS.has(key) || key.startsWith('data-schema-')) return;
    blockProps[key] = props[key];
  });
  return blockProps;
}

function getHandlerName(event: string): string {
  return `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
}

/**
 * 根据区块 schema 定义 React 组件：inputs 通过 this.props 读取，outputs 通过 this.dispatchEvent 派发，
 * schema 中的 Slot 由使用方的 Template 填充。注册到 materials.blocks 后即可按组件名使用，
 * 也可以像普通组件一样直接渲染，区块内部会自己挂载 SchemaRenderer。
 */
export function defineBlock(name: string, schema: BlockSchema): SchemaBlockComponent {
  const outputKeys = getSchemaIOKeys(schema.outputs);

  function SchemaBlock(props: SchemaBlockProps) {
    const propsRef = useRef(props);
    propsRef.current = props;

    const dispatchEvent = useCallback<BlockEventDispatcher>((event, ...args) => {
      if (typeof event !== 'string' || !event) {
        console.warn(`[schema-renderer] Block "${name}" dispatchEvent expects an event name string.`);
        return;
      }
      const handler = propsRef.current?.[getHandlerName(event)];
      if (typeof handler === 'function') {
        (handler as (...payload: unknown[]) => void)(...args);
        return;
      }
      // 宿主未监听已声明的事件属正常情况，未声明才需要告警
      if (!outputKeys.includes(event)) {
        console.warn(`[schema-renderer] Block "${name}" does not declare output event "${event}".`);
      }
    }, []);

    const { slots: passedSlots, children, ...restProps } = props;
    const slots: BlockSlots = { ...(passedSlots ?? {}) };
    if (children != null && !slots.default) {
      slots.default = () => children;
    }
    const blockProps = pickBlockProps(restProps);

    return createElement(
      BlockContext.Provider,
      { value: { name, props: blockProps, dispatchEvent, slots } },
      createElement(SchemaRenderer, { schema, props: blockProps, dispatchEvent, blockName: name }),
    );
  }

  SchemaBlock.displayName = `SchemaBlock(${name})`;

  const component = SchemaBlock as unknown as SchemaBlockComponent;
  component.__blockSchema = schema;

  return component;
}

export function isSchemaBlockComponent(component: unknown): component is SchemaBlockComponent {
  return typeof component === 'function' && !!(component as unknown as SchemaBlockComponent).__blockSchema;
}

export type BlockCache = Record<string, SchemaBlockComponent>;

type BlockContextLike = {
  [BLOCKS]?: BlockCache;
  [MATERIALS]?: { blocks?: Record<string, BlockSchema> };
};

function getBlockSchema(name: string, context?: object | null): BlockSchema | undefined {
  return (context as BlockContextLike | null | undefined)?.[MATERIALS]?.blocks?.[name];
}

function getBlockCache(context?: object | null): BlockCache | undefined {
  return (context as BlockContextLike | null | undefined)?.[BLOCKS];
}

/**
 * 从渲染器上下文加载区块组件。
 * 组件缓存在上下文的 BLOCKS 上：每个渲染器实例一份，不同实例之间互不影响，
 * 嵌套区块复用父级缓存；渲染器卸载后缓存随之释放。
 */
export function loadBlock(name: string, context?: object | null): SchemaBlockComponent | null {
  const schema = getBlockSchema(name, context);
  if (!schema) return null;
  const cache = getBlockCache(context);
  if (!cache) return null;
  // schema 引用变化时重建，避免闭包钉死旧 schema（编辑器替换 blocks[name] 后能生效）
  if (!cache[name] || cache[name].__blockSchema !== schema) {
    cache[name] = defineBlock(name, schema);
  }
  return cache[name];
}

export function getBlock(name: string, context?: object | null): SchemaBlockComponent | null {
  if (!getBlockSchema(name, context)) return null;
  return loadBlock(name, context);
}
