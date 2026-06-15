import React, { memo, type ComponentType } from 'react';
import { isHtmlTag } from './builtin/html-tags';
import {
  parseData,
  parseCondition,
  getLoopScope,
  getBindProps,
} from './engine';
import type { Node } from './engine';
import { useRendererContext } from './context';
import type { ComponentRegistry, MaterialComponent } from './materials';
import { getResolvedMaterials } from './materials';
import { normalizeDomProps } from './engine/parse-inline-style';

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
 * 将 schema children 统一为节点数组；纯字符串转为 Text 节点。
 *
 * @param children - schema 上的 children 字段
 * @returns 规范化后的子节点列表
 */
export function normalizeChildren(children: Node['children']): Node[] {
  if (children == null) return [];
  if (typeof children === 'string') {
    return [{ componentName: 'Text', props: { text: children } }];
  }
  if (Array.isArray(children)) return children;
  return [];
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

function renderChildren(
  nodes: Node[],
  scope: Record<string, unknown>,
): React.ReactNode {
  if (!nodes.length) return null;
  return nodes.map((child, i) => (
    <SchemaNodeRenderer
      key={child.id ?? `child-${i}`}
      schema={child}
      scope={scope}
    />
  ));
}

export interface SchemaNodeRendererProps {
  schema: Node;
  scope?: Record<string, unknown>;
}

/**
 * 递归渲染单个 schema 节点，处理 condition、loop 与 componentName 解析。
 * 物料在内部通过 getResolvedMaterials() 解析，无需上层传入。
 */
export const SchemaNodeRenderer = memo(function SchemaNodeRenderer({
  schema,
  scope = {},
}: SchemaNodeRendererProps) {
  const context = useRendererContext();
  const materials = getResolvedMaterials();

  const renderNode = (node: Node, nodeScope: Record<string, unknown>): React.ReactNode => {
    const { componentName, loop, loopArgs, condition, children } = node;
    if (!componentName) return null;

    const resolved = resolveComponent(componentName, materials);
    if (!resolved) {
      if (import.meta.env.DEV) {
        console.warn(`[genui-react] Unknown component: ${componentName}`);
      }
      return (
        <span
          key={node.id ?? componentName}
          style={{ color: '#999', fontSize: 12, display: 'inline-block', margin: 2 }}
        >
          [{componentName}]
        </span>
      );
    }

    const loopList = loop ? (parseData(loop, nodeScope, context) as unknown[]) : null;

    const renderOne = (item?: unknown, index?: number) => {
      const mergeScope =
        index !== undefined
          ? getLoopScope({ scope: nodeScope, index, item, loopArgs })
          : nodeScope;

      if (!parseCondition(condition, mergeScope, context)) return null;

      const bindProps = getBindProps(node, mergeScope, context);

      const childNodes = normalizeChildren(children);
      const childContent = renderChildren(childNodes, mergeScope);
      const elementProps = propsFromBind(bindProps);

      return React.createElement(
        resolved as string | ComponentType,
        { key: node.id ?? `${componentName}-${index ?? 0}`, ...elementProps },
        childContent,
      );
    };

    if (loop && Array.isArray(loopList)) {
      return loopList.map((item, index) => renderOne(item, index));
    }
    return renderOne();
  };

  return <>{renderNode(schema, scope)}</>;
});
