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
    content += `[id:${seg.tag.id || seg.tag.componentName}]`;
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
