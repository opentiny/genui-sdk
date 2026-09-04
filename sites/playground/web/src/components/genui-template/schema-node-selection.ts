import { t } from '../../i18n';
import { findComponentPath, getComponentItem } from './template-chat-utils/schema-path';

export interface SelectedSchemaNode {
  id: string;
  componentName: string;
  path: string;
  node: Record<string, unknown>;
}

interface ComponentBlock {
  start: number;
  end: number;
  id?: string;
  componentName: string;
}

interface MonacoTextModel {
  getValue(): string;
  getPositionAt(offset: number): { lineNumber: number; column: number };
  getOffsetAt(position: { lineNumber: number; column: number }): number;
}

interface MonacoCodeEditor {
  getModel(): MonacoTextModel | null;
  getPosition(): { lineNumber: number; column: number } | null;
  deltaDecorations(oldDecorations: string[], newDecorations: unknown[]): string[];
  revealLineInCenter(lineNumber: number): void;
}

function findObjectStart(text: string, pos: number): number {
  const stack: number[] = [];
  let inString = false;
  let escaped = false;
  const last = Math.min(pos, text.length - 1);
  for (let i = 0; i <= last; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      stack.push(i);
    } else if (ch === '}') {
      stack.pop();
    }
  }
  return stack.length ? stack[stack.length - 1] : -1;
}

function findObjectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function collectComponentBlocks(jsonText: string): ComponentBlock[] {
  const blocks: ComponentBlock[] = [];
  const regex = /"componentName"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(jsonText)) !== null) {
    const objStart = findObjectStart(jsonText, match.index);
    const objEnd = findObjectEnd(jsonText, objStart);
    if (objStart < 0 || objEnd < 0) {
      continue;
    }
    const slice = jsonText.slice(objStart, objEnd + 1);
    const idMatch = slice.match(/"id"\s*:\s*"((?:\\.|[^"\\])*)"/);
    blocks.push({
      start: objStart,
      end: objEnd + 1,
      id: idMatch?.[1],
      componentName: match[1],
    });
  }
  return blocks;
}

export function findComponentBlockAtOffset(jsonText: string, offset: number): ComponentBlock | null {
  const blocks = collectComponentBlocks(jsonText);
  let matched: ComponentBlock | null = null;
  for (const block of blocks) {
    if (offset >= block.start && offset <= block.end) {
      matched = block;
    }
  }
  return matched;
}

export function blockToSelectedNode(
  block: ComponentBlock,
  schema: Record<string, unknown> | null,
): SelectedSchemaNode | null {
  if (!schema) {
    return null;
  }
  if (block.id) {
    const path = findComponentPath(schema, block.id);
    if (!path) {
      return null;
    }
    const { node } = getComponentItem(schema, path);
    if (!node || typeof node !== 'object') {
      return null;
    }
    return {
      id: block.id,
      componentName: block.componentName,
      path,
      node: node as Record<string, unknown>,
    };
  }
  if (schema.componentName === block.componentName) {
    return {
      id: (schema.id as string) || '',
      componentName: block.componentName,
      path: '/',
      node: schema,
    };
  }
  return null;
}

export function selectedNodeFromSchemaById(
  schema: Record<string, unknown>,
  id: string,
): SelectedSchemaNode | null {
  const path = findComponentPath(schema, id);
  if (!path) {
    return null;
  }
  const { node } = getComponentItem(schema, path);
  if (!node || typeof node !== 'object') {
    return null;
  }
  const componentName = (node as Record<string, unknown>).componentName;
  if (typeof componentName !== 'string') {
    return null;
  }
  return {
    id,
    componentName,
    path,
    node: node as Record<string, unknown>,
  };
}

let decorationIds: string[] = [];

export function highlightBlockInEditor(
  editorInstance: MonacoCodeEditor,
  block: ComponentBlock | null,
) {
  const model = editorInstance.getModel();
  if (!model) {
    return;
  }
  if (!block) {
    decorationIds = editorInstance.deltaDecorations(decorationIds, []);
    return;
  }
  const start = model.getPositionAt(block.start);
  const end = model.getPositionAt(block.end);
  decorationIds = editorInstance.deltaDecorations(decorationIds, [
    {
      range: {
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      },
      options: {
        className: 'schema-node-selection-highlight',
        isWholeLine: false,
      },
    },
  ]);
  editorInstance.revealLineInCenter(start.lineNumber);
}

export function formatSelectedNodesContext(nodes: SelectedSchemaNode[]): string {
  if (!nodes.length) {
    return '';
  }
  const blocks = nodes.map(
    (node) =>
      `- componentName: ${node.componentName}\n- id: ${node.id}\n- path: ${node.path}\n\`\`\`json\n${JSON.stringify(node.node, null, 2)}\n\`\`\``,
  );
  return `\n\n[${t('templateEditor.selectedComponents')}]\n${blocks.join('\n\n')}\n`;
}

export function findBlockByNodeId(jsonText: string, id: string): ComponentBlock | null {
  return collectComponentBlocks(jsonText).find((block) => block.id === id) ?? null;
}
