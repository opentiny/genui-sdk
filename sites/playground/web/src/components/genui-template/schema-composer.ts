import { generateId } from '../../utils';
import { formatSelectedNodesContext, type SelectedSchemaNode } from './schema-node-selection';

export interface ComposerTag {
  instanceId: string;
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

const TAG_CLASS = 'composer-tag';

export function createComposerTagElement(tag: ComposerTag): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = TAG_CLASS;
  span.contentEditable = 'false';
  span.dataset.instanceId = tag.instanceId;
  span.dataset.nodeId = tag.id;
  span.dataset.componentName = tag.componentName;
  span.dataset.path = tag.path;
  span.dataset.nodeJson = JSON.stringify(tag.node);

  const name = document.createElement('span');
  name.className = 'composer-tag__name';
  name.textContent = tag.componentName;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'composer-tag__remove';
  removeBtn.setAttribute('aria-label', 'remove');
  removeBtn.textContent = '×';

  span.append(name, removeBtn);
  return span;
}

export function parseComposerDom(root: HTMLElement): ComposerSegment[] {
  const segments: ComposerSegment[] = [];
  let textBuffer = '';

  const flushText = () => {
    const value = textBuffer.replace(/\u200b/g, '');
    if (value) {
      segments.push({ type: 'text', value });
    }
    textBuffer = '';
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textBuffer += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const el = node as HTMLElement;
    if (el.classList.contains(TAG_CLASS)) {
      flushText();
      segments.push({
        type: 'tag',
        tag: {
          instanceId: el.dataset.instanceId || '',
          id: el.dataset.nodeId || '',
          componentName: el.dataset.componentName || '',
          path: el.dataset.path || '',
          node: JSON.parse(el.dataset.nodeJson || '{}'),
        },
      });
      return;
    }
    if (el.tagName === 'BR') {
      textBuffer += '\n';
      return;
    }
    el.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  flushText();
  return segments;
}

export function getComposerContent(root: HTMLElement): ComposerContent {
  const segments = parseComposerDom(root);
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
      tagById.set(seg.tag.id, {
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

export function getRangeAtEnd(el: HTMLElement): Range {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  return range;
}

export function saveSelection(editor: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) {
    return null;
  }
  return range.cloneRange();
}

export function restoreSelection(range: Range) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertTagAtCursor(
  editor: HTMLElement,
  node: SelectedSchemaNode,
  savedRange: Range | null,
) {
  editor.focus();
  const selection = window.getSelection();
  const range =
    savedRange && editor.contains(savedRange.startContainer)
      ? savedRange
      : getRangeAtEnd(editor);

  const tag: ComposerTag = {
    instanceId: generateId(),
    id: node.id,
    componentName: node.componentName,
    path: node.path,
    node: node.node,
  };
  const tagEl = createComposerTagElement(tag);
  range.deleteContents();
  range.insertNode(tagEl);

  const spacer = document.createTextNode('\u200b');
  range.setStartAfter(tagEl);
  range.collapse(true);
  range.insertNode(spacer);
  range.setStartAfter(spacer);
  range.collapse(true);

  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function removeComposerTag(tagEl: HTMLElement) {
  const parent = tagEl.parentNode;
  if (!parent) {
    return;
  }
  const next = tagEl.nextSibling;
  if (next?.nodeType === Node.TEXT_NODE && next.textContent === '\u200b') {
    parent.removeChild(next);
  }
  parent.removeChild(tagEl);
}

export function removeTagBeforeCursor(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }
  const range = selection.getRangeAt(0);
  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return false;
  }
  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const text = startContainer.textContent || '';
    if (startOffset > 0 && text[startOffset - 1] !== '\u200b') {
      return false;
    }
    let prev: Node | null = startContainer;
    if (startOffset === 0) {
      prev = startContainer.previousSibling;
    } else if (text.slice(0, startOffset).replace(/\u200b/g, '') === '') {
      prev = startContainer.previousSibling;
    }
    if (prev instanceof HTMLElement && prev.classList.contains(TAG_CLASS)) {
      removeComposerTag(prev);
      return true;
    }
  }
  if (startContainer === editor && startOffset > 0) {
    const prev = editor.childNodes[startOffset - 1];
    if (prev instanceof HTMLElement && prev.classList.contains(TAG_CLASS)) {
      removeComposerTag(prev);
      return true;
    }
  }
  return false;
}
