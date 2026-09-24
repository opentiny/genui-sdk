import type { UserItem } from '@opentiny/tiny-robot';
import type { SelectedSchemaNode } from './schema-node-selection';

export type ComposerSegment =
  | { type: 'text'; value: string }
  | { type: 'node'; value: SelectedSchemaNode };

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
        type: 'node',
        value: node,
      });
    }
  }

  return segments;
}

export function segmentsToPlainText(segments: ComposerSegment[]): string {
  return segments
    .map((seg) => (seg.type === 'text' ? seg.value : seg.value.componentName))
    .join('')
    .trim();
}

/**
 * 展示场景（版本卡片标题等）：标签渲染为 [id:xxx]，与发送给模型的 apiContent 中
 * 的组件 id 引用一一对应，避免展示成组件标签名造成误解。
 */
export function segmentsToDisplayText(segments: ComposerSegment[]): string {
  return segments
    .map((seg) => (seg.type === 'text' ? seg.value : `[id:${seg.value.id || seg.value.componentName}]`))
    .join('')
    .trim();
}

/**
 * 点选组件在 API 内容中的 JSON 标记：每个组件在其原位置内联为一个独立的 JSON 对象
 * （仅含 id），不组装树；组件名/props 由服务端追加的全量 schemaJson 按 id 定位获取。
 */

export function segmentsToApiContent(segments: ComposerSegment[]): string {
  const seenKeys = new Set<string>();
  let content = '';

  for (const seg of segments) {
    if (seg.type === 'text') {
      content += seg.value;
      continue;
    }
    const key = seg.value.id || seg.value.componentName;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    content += JSON.stringify({ id: key });
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
    (!segments.some((seg) => seg.type === 'node') &&
      segments.every((seg) => seg.type === 'text' && !seg.value.trim()));
  return {
    segments,
    apiContent: segmentsToApiContent(segments),
    isEmpty,
    textLength,
  };
}
