import React, { memo, type ComponentType } from 'react';
import { isHtmlTag } from './builtin/html-tags';
import {
  parseData,
  parseCondition,
  getLoopScope,
  getBindProps,
} from './engine';
import type { Node, RootNode } from './types';
import type { PageContextValue } from './engine';
import type { ComponentRegistry, MaterialComponent } from './materials';
import { getResolvedMaterials } from './materials';
import { normalizeDomProps } from './engine/parse-inline-style';
import { usePageContext } from './page-context';

/**
 * 按 componentName 从物料表或 HTML 标签名解析可渲染目标。
 *
 * @param name - schema 节点上的 componentName
 * @param materials - 合并后的物料表
 * @returns 物料组件、HTML 标签名，或未知时为 null
 */
function resolveComponent(
  name: string,
  materials: ComponentRegistry,
): MaterialComponent | string | null {
  return materials[name] || (isHtmlTag(name) ? name : null);
}

/**
 * 将 bindProps 转为 createElement 可用的 props。
 *
 * @param bindProps - getBindProps 解析结果
 * @returns 传给 React.createElement 的 props
 */
function propsFromBind(bindProps: Record<string, unknown>): Record<string, unknown> {
  const { children: _c, schema: _schema, ...rest } = bindProps;
  return normalizeDomProps({ ...rest });
}

/**
 * 将 schema children 统一为节点数组；纯字符串转为 Text 节点。
 *
 * @param children - schema 上的 children 字段
 * @returns 规范化后的子节点列表
 */
// TODO: 移除 验证直接写text
export function normalizeChildren(children: Node['children']): Node[] {
  if (children == null) return [];
  if (typeof children === 'string') {
    return [{ componentName: 'Text', props: { text: children } }];
  }
  if (Array.isArray(children)) return children;
  return [];
}

/**
 * 递归渲染 schema 子节点列表，对齐 Vue renderDefault。
 *
 * @param children - 规范化后的子节点
 * @param scope - 当前作用域
 * @param context - 页面上下文
 * @returns React 子树
 */
function renderChildren(
  children: Node[],
  scope: Record<string, unknown>,
  context: PageContextValue,
): React.ReactNode {
  if (!children.length) return null;
  return children
    .map((child) => renderComponent(child, scope, context))
    .filter(Boolean);
}

/**
 * 渲染单个 schema 节点，对齐 Vue renderComponent(schema, scope, context)。
 *
 * @param schema - 当前节点 schema
 * @param scope - 当前作用域
 * @param context - 页面上下文
 * @returns React 节点或 null
 */
function renderComponent(
  schema: Node,
  scope: Record<string, unknown>,
  context: PageContextValue,
): React.ReactNode {
  const { componentName, loop, loopArgs, condition, children } = schema;

  if (!componentName) {
    return null;
  }

  const materials = getResolvedMaterials();
  const component = resolveComponent(componentName, materials);

  if (!component) {
    if (import.meta.env.DEV) {
      console.warn(`[genui-react] Unknown component: ${componentName}`);
    } else {
      return null;
    }
    return (
      <span
        key={schema.id ?? componentName}
        style={{ color: '#999', fontSize: 12, display: 'inline-block', margin: 2 }}
      >
        [{componentName}]
      </span>
    );
  }

  const loopList = parseData(loop, scope, context);

  const renderElement = (item?: unknown, loopIndex?: number) => {
    const mergeScope =
      loopIndex !== undefined
        ? getLoopScope({ scope, index: loopIndex, item, loopArgs })
        : scope;

    if (!parseCondition(condition, mergeScope, context)) {
      return null;
    }

    const bindProps = getBindProps(schema, mergeScope, context);
    const childNodes = normalizeChildren(children);
    const childContent = renderChildren(childNodes, mergeScope, context);
    const elementProps = propsFromBind(bindProps);
    const key = schema.id ?? `${componentName}-${loopIndex ?? 0}`;

    return React.createElement(
      component as string | ComponentType,
      { key, ...elementProps },
      childContent,
    );
  };

  if (loop) {
    const list = loopList as unknown[] | null | undefined;
    return list?.map(renderElement);
  }

  return renderElement();
}

export interface SchemaNodeRendererProps {
  schema: Node;
  scope?: Record<string, unknown>;
  parent?: RootNode | null;
}

/**
 * 递归渲染单个 schema 节点，对齐 Vue renderer 组件。
 */
export const SchemaNodeRenderer = memo(function SchemaNodeRenderer({
  schema,
  scope = {},
}: SchemaNodeRendererProps) {
  const context = usePageContext();
  return <>{renderComponent(schema, scope, context)}</>;
});
