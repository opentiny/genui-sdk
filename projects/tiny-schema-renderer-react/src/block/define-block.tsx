import { createElement, type ComponentType, type ReactNode } from 'react';
import { SchemaRenderer } from '../RenderMain';
import { BLOCKS, MATERIALS } from '../context-symbols';
import { getBlockSlotNames } from './slots';
import type { BlockSchema } from './schema';

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

function getBlockAllowedPropNames(schema: BlockSchema): Set<string> {
  return new Set<string>([
    ...getBlockPropertyNames(schema),
    ...getBlockEventNames(schema),
    ...getBlockSlotNames(schema),
    'default',
  ]);
}

function pickBlockProps(props: Record<string, unknown>, allowed: Set<string>): Record<string, unknown> {
  const blockProps: Record<string, unknown> = {};
  Object.keys(props).forEach((key) => {
    if (allowed.has(key)) blockProps[key] = props[key];
  });
  return blockProps;
}

/**
 * 根据 schema 定义 React 组件：只有 schema 声明过的输入（properties 属性、events 的
 * onXxx 事件监听、slots 插槽渲染函数）进入区块内的 this.props，与 Vue 按声明过滤
 * props 的机制一致；区块内像 React 原生一样直接调用，未声明的属性与渲染器内部标记
 * 不会混入。schema 中的 Slot 出口由使用方的 JSSlot 属性（具名插槽）或 children
 * （默认插槽）填充。注册到 materials.blocks 后即可按组件名使用，也可以像普通组件
 * 一样直接渲染，区块内部会自己挂载 SchemaRenderer。
 */
export function defineBlock(name: string, schema: BlockSchema): SchemaBlockComponent {
  // schema 引用在 defineBlock 时固定，声明白名单只需构建一次
  const allowedProps = getBlockAllowedPropNames(schema);

  function SchemaBlock(props: SchemaBlockProps) {
    const { children, ...restProps } = props;
    const blockProps = pickBlockProps(restProps, allowedProps);

    // 默认插槽：使用方写在 children 里的内容已在使用方上下文中求值，作为 default 插槽下传；
    // 具名插槽（JSSlot 编译出的渲染函数）已在编译时固定使用方上下文，无需在此加工
    if (children != null && blockProps.default === undefined) {
      blockProps.default = () => children;
    }

    return createElement(SchemaRenderer, { schema, props: blockProps, blockName: name });
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
