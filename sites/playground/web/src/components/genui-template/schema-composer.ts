import type { UserItem } from '@opentiny/tiny-robot';
import type { SelectedSchemaNode } from './schema-node-selection';

export type ComposerSegment =
  | { type: 'text'; value: string }
  | { type: 'tag'; tag: SelectedSchemaNode };

export interface ComposerContent {
  segments: ComposerSegment[];
  apiContent: string;
  isEmpty: boolean;
  textLength: number;
}

export function templateDataToSegments(
  templateData: UserItem[],
  nodeMap: Map<string, SelectedSchemaNode>,
): ComposerSegment[] {
  const segments: ComposerSegment[] = [];

  for (const item of templateData) {
    if (item.type === 'text') {
      const value = (item.content || '').replace(/\u200b/g, '');
      if (value) {
        segments.push({ type: 'text', value });
      }
      continue;
    }

    const node = item.id ? nodeMap.get(item.id) : undefined;
    if (node) {
      segments.push({
        type: 'tag',
        tag: node,
      });
    }
  }

  return segments;
}

export function segmentsToPlainText(segments: ComposerSegment[]): string {
  return segments
    .map((seg) => (seg.type === 'text' ? seg.value : seg.tag.componentName))
    .join('')
    .trim();
}

/**
 * 展示场景（版本卡片标题等）：标签渲染为 [id:xxx]，与发送给模型的 apiContent 中
 * 的组件 id 引用一一对应，避免展示成组件标签名造成误解。
 */
export function segmentsToDisplayText(segments: ComposerSegment[]): string {
  return segments
    .map((seg) => (seg.type === 'text' ? seg.value : `[id:${seg.tag.id || seg.tag.componentName}]`))
    .join('')
    .trim();
}

/**
 * 点选组件在 API 内容中的内联标记：id 来自发送时正在预览的 schema；
 * componentName + props 让模型在标记位置直接获得组件上下文（全量 schemaJson 由服务端另行追加）。
 */
function formatSelectedComponentMarker(tag: SelectedSchemaNode): string {
  const props = (tag.node as { props?: unknown } | undefined)?.props;
  const propsPart = props && typeof props === 'object' ? ` props=${JSON.stringify(props)}` : '';
  return `[选中组件 id="${tag.id || tag.componentName}" componentName="${tag.componentName}"${propsPart}]`;
}

export function segmentsToApiContent(segments: ComposerSegment[]): string {
  const seenTagKeys = new Set<string>();
  let content = '';
  for (const seg of segments) {
    if (seg.type === 'text') {
      content += seg.value;
      continue;
    }
    const key = seg.tag.id || seg.tag.componentName;
    if (seenTagKeys.has(key)) {
      continue;
    }
    seenTagKeys.add(key);
    content += formatSelectedComponentMarker(seg.tag);
  }
  return content.trim();
}

export function getComposerContent(
  templateData: UserItem[],
  nodeMap: Map<string, SelectedSchemaNode>,
): ComposerContent {
  const segments = templateDataToSegments(templateData, nodeMap);
  const textLength = segments.reduce(
    (sum, seg) => (seg.type === 'text' ? sum + seg.value.length : sum),
    0,
  );
  const isEmpty =
    segments.length === 0 ||
    (!segments.some((seg) => seg.type === 'tag') &&
      segments.every((seg) => seg.type === 'text' && !seg.value.trim()));
  return {
    segments,
    apiContent: segmentsToApiContent(segments),
    isEmpty,
    textLength,
  };
}
