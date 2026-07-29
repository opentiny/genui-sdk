import type { UserItem } from '@opentiny/tiny-robot';
import { formatSelectedNodesContext, type SelectedSchemaNode } from './schema-node-selection';

export interface ComposerTag {
  id: string;
  componentName: string;
  path: string;
  node: Record<string, unknown>;
}

export type ComposerSegment =
  | { type: 'text'; value: string }
  | { type: 'tag'; tag: ComposerTag };

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
  const usedIds = new Set<string>();

  for (const item of templateData) {
    if (item.type === 'text') {
      const value = (item.content || '').replace(/\u200b/g, '');
      if (value) {
        segments.push({ type: 'text', value });
      }
      continue;
    }

    let node: SelectedSchemaNode | undefined;
    if (item.id && nodeMap.has(item.id)) {
      node = nodeMap.get(item.id);
      usedIds.add(item.id);
    } else {
      for (const [id, candidate] of nodeMap) {
        if (!usedIds.has(id) && candidate.componentName === item.content) {
          node = candidate;
          usedIds.add(id);
          break;
        }
      }
    }

    if (node) {
      segments.push({
        type: 'tag',
        tag: {
          id: node.id,
          componentName: node.componentName,
          path: node.path,
          node: node.node,
        },
      });
    } else if (item.content) {
      segments.push({
        type: 'tag',
        tag: {
          id: item.id || '',
          componentName: item.content,
          path: '',
          node: {},
        },
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
  const text = segments
    .map((seg) => (seg.type === 'text' ? seg.value : ''))
    .join('')
    .trim();
  const tagById = new Map<string, SelectedSchemaNode>();
  for (const seg of segments) {
    if (seg.type === 'tag') {
      tagById.set(seg.tag.id || seg.tag.componentName, {
        id: seg.tag.id,
        componentName: seg.tag.componentName,
        path: seg.tag.path,
        node: seg.tag.node,
      });
    }
  }
  const tags = [...tagById.values()];
  if (!tags.length) {
    return text;
  }
  return `${text}${formatSelectedNodesContext(tags)}`;
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
