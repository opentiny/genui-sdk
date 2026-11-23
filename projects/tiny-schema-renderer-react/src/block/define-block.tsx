import { createElement, type ComponentType, type ReactNode } from 'react';
import { SchemaRenderer } from '../RenderMain';
import { BLOCKS, MATERIALS } from '../context-symbols';
import type { BlockSchema } from './schema';

export type BlockEventDispatcher = (event: string, ...args: unknown[]) => void;

/** 读取属性声明名（properties 各分组展开） */
export function getBlockPropertyNames(schema?: BlockSchema | null): string[] {
  const groups = schema?.schema?.properties;
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) =>
    (group?.content ?? []).map((item) => item?.property).filter((name): name is string => !!name),
  );
}

/** 读取事件声明名（events 的 key，即使用方监听的属性名，如 onChange） */
export function getBlockEventNames(schema?: BlockSchema | null): string[] {
  const events = schema?.schema?.events;
  if (!events || typeof events !== 'object') return [];
  return Object.keys(events);
}

export interface SchemaBlockProps {
  children?: ReactNode;
  [key: string]: unknown;
}

export type SchemaBlockComponent = ComponentType<SchemaBlockProps> & {
  __blockSchema: BlockSchema;
};

/** 不应出现在区块 this.props 中的属性 */
const BLOCK_INTERNAL_PROPS = new Set(['data-id', 'data-tag', 'children', 'key']);

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
 * 根据 schema 定义 React 组件：属性通过 this.props 读取，事件通过 this.dispatchEvent 派发，
 * schema 中的 Slot 由使用方的 JSSlot 属性（具名插槽）或 children（默认插槽）填充。注册到 materials.blocks 后即可按组件名使用，
 * 也可以像普通组件一样直接渲染，区块内部会自己挂载 SchemaRenderer。
 */
export function defineBlock(name: string, schema: BlockSchema): SchemaBlockComponent {
  const eventKeys = getBlockEventNames(schema);

  function SchemaBlock(props: SchemaBlockProps) {
    // dispatchEvent 每次渲染重建闭包：捕获当次 props，随 runtime 的 props 同步进上下文，
    // 事件触发时读到的就是最近一次渲染的使用方监听器（onXxx props 每次渲染都在变，稳定引用无收益）
    const dispatchEvent: BlockEventDispatcher = (event, ...args) => {
      if (typeof event !== 'string' || !event) {
        console.warn(`[schema-renderer] Block "${name}" dispatchEvent expects an event name string.`);
        return;
      }
      const handlerName = getHandlerName(event);
      const handler = props[handlerName];
      if (typeof handler === 'function') {
        (handler as (...payload: unknown[]) => void)(...args);
        return;
      }
      // 宿主未监听已声明的事件属正常情况，未声明才需要告警
      if (!eventKeys.includes(handlerName)) {
        console.warn(`[schema-renderer] Block "${name}" does not declare output event "${event}".`);
      }
    };

    const { children, ...restProps } = props;
    const blockProps = pickBlockProps(restProps);

    // 默认插槽：使用方写在 children 里的内容已在使用方上下文中求值，作为 default 插槽下传；
    // 具名插槽（JSSlot 编译出的渲染函数）已在编译时固定使用方上下文，无需在此加工
    if (children != null && blockProps.default === undefined) {
      blockProps.default = () => children;
    }

    // 插槽渲染函数留在 props 里，与普通属性同通道传入区块渲染器，区块内的 Slot 出口直接消费
    return createElement(SchemaRenderer, { schema, props: blockProps, dispatchEvent, blockName: name });
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
  return loadBlock(name, context);
}
