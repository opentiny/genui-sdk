/**
 * Short-term workaround: keep TrSender template chips atomic until the editor
 * natively supports non-editable tags. Playground code owns templateData plus
 * selectedNodeMap (with tombstones for undo). `block` / prefix / suffix are
 * TrSender internal wrappers that share a template's data-id, not UserItems.
 * Only the outermost chip host is contenteditable=false so the caret skips
 * the whole tag in one arrow key; nested prefix/template/suffix stay unlocked.
 */

export const COMPOSER_TAG_SELECTOR = '[data-type="template"]';
export const COMPOSER_CHIP_SELECTOR = '[data-type="template"], [data-type="block"]';
export const COMPOSER_CHIP_HOST_SELECTOR = '[data-type="block"], [data-type="template"]';

const CHIP_WRAPPER_TYPES = new Set(['template', 'block', 'prefix', 'suffix']);

export interface ComposerUserItem {
  type: string;
  content?: string;
  id?: string;
}

export interface ComposerTagNode {
  componentName: string;
}

const COMPOSITION_INPUT_TYPES = new Set([
  'insertCompositionText',
  'insertFromComposition',
  'deleteCompositionText',
]);

const BACKWARD_DELETE_TYPES = new Set([
  'deleteContentBackward',
  'deleteWordBackward',
  'deleteHardLineBackward',
  'deleteSoftLineBackward',
]);

const FORWARD_DELETE_TYPES = new Set([
  'deleteContentForward',
  'deleteWordForward',
  'deleteHardLineForward',
  'deleteSoftLineForward',
]);

export function isComposerTagElement(el: Element | null | undefined): el is HTMLElement {
  return !!el && el instanceof HTMLElement && el.dataset.type === 'template';
}

export function isComposerChipHost(el: Element | null | undefined): el is HTMLElement {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  if (el.dataset.type === 'block') {
    return !el.parentElement?.closest('[data-type="block"]');
  }
  if (el.dataset.type === 'template') {
    return !el.closest('[data-type="block"]');
  }
  return false;
}

export function getComposerChipHost(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el;
  let host: HTMLElement | null = null;
  while (current) {
    if (isComposerChipHost(current)) {
      host = current;
    }
    current = current.parentElement;
  }
  return host;
}

export const COMPOSER_CHIP_HOST_CLASS = 'genui-composer-chip-host';

export function lockComposerTagElement(el: HTMLElement) {
  const host = getComposerChipHost(el);
  if (!host) {
    return;
  }
  if (host.contentEditable !== 'false') {
    host.contentEditable = 'false';
  }
  host.classList.add(COMPOSER_CHIP_HOST_CLASS);
  host.querySelectorAll('[contenteditable="false"]').forEach((child) => {
    if (child !== host && child instanceof HTMLElement) {
      child.removeAttribute('contenteditable');
    }
  });
}

function collectChipHosts(node: HTMLElement): HTMLElement[] {
  const hosts: HTMLElement[] = [];
  if (isComposerChipHost(node)) {
    hosts.push(node);
  }
  node.querySelectorAll(COMPOSER_CHIP_HOST_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement && isComposerChipHost(el)) {
      hosts.push(el);
    }
  });
  return hosts;
}

export function getComposerEditor(root: ParentNode | null | undefined): ParentNode | null {
  if (!root) {
    return null;
  }
  if (root instanceof Element) {
    return root.querySelector('.editor') ?? root;
  }
  return root;
}

export function isTagAffectingInput(event: Pick<InputEvent, 'inputType' | 'isComposing'>): boolean {
  if (event.isComposing) {
    return false;
  }
  const inputType = event.inputType;
  if (!inputType || COMPOSITION_INPUT_TYPES.has(inputType)) {
    return false;
  }
  return inputType.startsWith('delete');
}

export function toRange(source: AbstractRange): Range | null {
  const doc = source.startContainer.ownerDocument ?? source.endContainer.ownerDocument;
  if (!doc) {
    return null;
  }
  try {
    const range = doc.createRange();
    range.setStart(source.startContainer, source.startOffset);
    range.setEnd(source.endContainer, source.endOffset);
    return range;
  } catch {
    return null;
  }
}

function rangeIntersectsNode(range: Range, node: Node): boolean {
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
}

export function resolveComposerTagId(node: Node | null | undefined, root: ParentNode): string | undefined {
  let current: Node | null | undefined = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.type === 'template' && current.dataset.id) {
      return current.dataset.id;
    }
    current = current.parentNode;
  }

  current = node;
  while (current && current !== root) {
    if (
      current instanceof HTMLElement &&
      current.dataset.id &&
      CHIP_WRAPPER_TYPES.has(current.dataset.type || '')
    ) {
      return current.dataset.id;
    }
    current = current.parentNode;
  }
  return undefined;
}

function isZwspOnly(text: string): boolean {
  return text.length === 0 || [...text].every((ch) => ch === '\u200b');
}

function isIgnorableBoundaryNode(node: Node | null): boolean {
  if (!node) {
    return true;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return isZwspOnly(node.textContent ?? '');
  }
  if (node instanceof HTMLElement) {
    const type = node.dataset.type;
    return type === 'prefix' || type === 'suffix';
  }
  return false;
}

function skipIgnorableSiblings(node: Node | null, direction: 'previousSibling' | 'nextSibling'): Node | null {
  let current = node;
  while (current && isIgnorableBoundaryNode(current)) {
    current = current[direction];
  }
  return current;
}

function nodeImmediatelyBefore(range: AbstractRange): Node | null {
  const { startContainer, startOffset } = range;
  let node: Node | null = null;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const before = (startContainer.textContent ?? '').slice(0, startOffset);
    if (!isZwspOnly(before)) {
      return null;
    }
    node = startContainer.previousSibling ?? startContainer.parentElement?.previousSibling ?? null;
  } else if (startContainer instanceof Element) {
    node = startContainer.childNodes[startOffset - 1] ?? null;
  }
  return skipIgnorableSiblings(node, 'previousSibling');
}

function nodeImmediatelyAfter(range: AbstractRange): Node | null {
  const { startContainer, startOffset } = range;
  let node: Node | null = null;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const after = (startContainer.textContent ?? '').slice(startOffset);
    if (!isZwspOnly(after)) {
      return null;
    }
    node = startContainer.nextSibling ?? startContainer.parentElement?.nextSibling ?? null;
  } else if (startContainer instanceof Element) {
    node = startContainer.childNodes[startOffset] ?? null;
  }
  return skipIgnorableSiblings(node, 'nextSibling');
}

export function isDirectionalDelete(inputType: string | undefined): boolean {
  return !!inputType && (BACKWARD_DELETE_TYPES.has(inputType) || FORWARD_DELETE_TYPES.has(inputType));
}

export function getCollapsedCaretRange(event: Event, editor?: ParentNode | null): Range | null {
  const target = event.target;
  const doc = target instanceof Node ? target.ownerDocument : typeof document !== 'undefined' ? document : null;
  const selection = doc?.getSelection();
  if (!selection?.rangeCount) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    return null;
  }
  if (editor instanceof Node && editor !== range.startContainer && !editor.contains(range.startContainer)) {
    return null;
  }
  return range;
}

export function collectTagIdsFromRange(source: AbstractRange, editor: ParentNode, inputType?: string): string[] {
  const range = toRange(source);
  const ids = new Set<string>();
  const collapsed = (range ?? source).collapsed;

  const addFromNode = (node: Node | null | undefined) => {
    const id = resolveComposerTagId(node, editor);
    if (id) {
      ids.add(id);
    }
  };

  if (collapsed && inputType && (BACKWARD_DELETE_TYPES.has(inputType) || FORWARD_DELETE_TYPES.has(inputType))) {
    const boundary = range ?? source;
    if (BACKWARD_DELETE_TYPES.has(inputType)) {
      addFromNode(nodeImmediatelyBefore(boundary));
    } else {
      addFromNode(nodeImmediatelyAfter(boundary));
    }
    return [...ids];
  }

  addFromNode(source.startContainer);
  addFromNode(source.endContainer);

  const root = editor instanceof Element ? editor : editor instanceof Document ? editor.body : null;
  if (range && root) {
    root.querySelectorAll(COMPOSER_CHIP_SELECTOR).forEach((el) => {
      if (!(el instanceof HTMLElement) || !el.dataset.id) {
        return;
      }
      if (rangeIntersectsNode(range, el)) {
        ids.add(el.dataset.id);
      }
    });
  }

  return [...ids];
}

export function getInputRanges(event: InputEvent): AbstractRange[] {
  if (typeof event.getTargetRanges === 'function') {
    const ranges = event.getTargetRanges();
    if (ranges.length) {
      return [...ranges];
    }
  }

  const target = event.target;
  const doc = target instanceof Node ? target.ownerDocument : typeof document !== 'undefined' ? document : null;
  const selection = doc?.getSelection();
  if (!selection?.rangeCount) {
    return [];
  }
  return Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index));
}

export function collectTagIdsFromInputEvent(event: InputEvent, editor: ParentNode | null): string[] {
  if (!editor || !isTagAffectingInput(event)) {
    return [];
  }
  if (isDirectionalDelete(event.inputType)) {
    const caret = getCollapsedCaretRange(event, editor);
    if (caret) {
      return collectTagIdsFromRange(caret, editor, event.inputType);
    }
  }
  const ids = new Set<string>();
  for (const range of getInputRanges(event)) {
    for (const id of collectTagIdsFromRange(range, editor, event.inputType)) {
      ids.add(id);
    }
  }
  return [...ids];
}

export interface PendingRemovalTransaction {
  record(event: InputEvent, editor: ParentNode | null, root: HTMLElement): void;
  mark(ids: Iterable<string>): void;
  consume(): Set<string>;
  clear(): void;
}

export function createPendingRemovalTransaction(pending: Set<string>): PendingRemovalTransaction {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inputRoot: HTMLElement | null = null;
  let inputListener: (() => void) | null = null;

  const detachInput = () => {
    if (inputRoot && inputListener) {
      inputRoot.removeEventListener('input', inputListener, true);
    }
    inputRoot = null;
    inputListener = null;
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const finish = (token: number) => {
    if (token !== generation) {
      return;
    }
    generation += 1;
    pending.clear();
    clearTimer();
    detachInput();
  };

  const scheduleFinish = (root: HTMLElement) => {
    const token = generation;
    detachInput();
    clearTimer();
    inputRoot = root;
    inputListener = () => {
      queueMicrotask(() => finish(token));
    };
    root.addEventListener('input', inputListener, { once: true, capture: true });
    timer = setTimeout(() => finish(token), 0);
  };

  return {
    record(event, editor, root) {
      const ids = collectTagIdsFromInputEvent(event, editor);
      if (!ids.length) {
        return;
      }
      for (const id of ids) {
        pending.add(id);
      }
      generation += 1;
      scheduleFinish(root);
    },
    mark(ids) {
      for (const id of ids) {
        pending.add(id);
      }
    },
    consume() {
      const ids = new Set(pending);
      generation += 1;
      pending.clear();
      clearTimer();
      detachInput();
      return ids;
    },
    clear() {
      generation += 1;
      pending.clear();
      clearTimer();
      detachInput();
    },
  };
}

export function lookupComposerTagNode<T extends ComposerTagNode>(
  id: string,
  selectedNodeMap: Map<string, T>,
  tombstones: Map<string, T>,
): T | undefined {
  return selectedNodeMap.get(id) ?? tombstones.get(id);
}

export function reconcileAtomicTemplateData<T extends ComposerUserItem, N extends ComposerTagNode>(
  value: T[],
  selectedNodeMap: Map<string, N>,
  tombstones: Map<string, N> = new Map(),
  removedIds?: Set<string>,
): T[] {
  return value.filter((item) => {
    if (item.type !== 'template') {
      return true;
    }
    if (!item.id || removedIds?.has(item.id)) {
      return false;
    }
    const source = lookupComposerTagNode(item.id, selectedNodeMap, tombstones);
    if (!source) {
      return false;
    }
    return item.content === source.componentName;
  });
}

export function syncComposerTagNodes<T extends ComposerUserItem, N extends ComposerTagNode>(
  value: T[],
  selectedNodeMap: Map<string, N>,
  tombstones: Map<string, N>,
) {
  const next = new Map<string, N>();
  for (const item of value) {
    if (item.type !== 'template' || !item.id) {
      continue;
    }
    const node = lookupComposerTagNode(item.id, selectedNodeMap, tombstones);
    if (node) {
      next.set(item.id, node);
    }
  }
  for (const [id, node] of selectedNodeMap) {
    if (!next.has(id)) {
      tombstones.set(id, node);
    }
  }
  for (const id of next.keys()) {
    tombstones.delete(id);
  }
  selectedNodeMap.clear();
  next.forEach((node, id) => selectedNodeMap.set(id, node));
}

export function observeNewComposerTags(
  root: ParentNode,
  onAdded: (el: HTMLElement) => void,
): MutationObserver {
  const lockAdded = (node: Node) => {
    if (node instanceof HTMLElement) {
      collectChipHosts(node).forEach(onAdded);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(lockAdded);
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return observer;
}

export function bindAtomicComposerTags(
  root: HTMLElement,
  transaction: PendingRemovalTransaction,
  onAtomicDelete?: (ids: string[]) => void,
) {
  const lockExisting = () => {
    collectChipHosts(root).forEach(lockComposerTagElement);
  };

  lockExisting();
  const observer = observeNewComposerTags(root, lockComposerTagElement);

  const handleBeforeInput = (event: Event) => {
    const inputEvent = event as InputEvent;
    const editor = getComposerEditor(root);
    // TrSender always preventDefault()s then deletes every item from
    // getTargetRanges() startId to endId. A collapsed caret between chips
    // still produces a wide target range, so we have to own this delete.
    if (editor && isDirectionalDelete(inputEvent.inputType) && getCollapsedCaretRange(inputEvent, editor)) {
      const ids = collectTagIdsFromInputEvent(inputEvent, editor);
      if (ids.length) {
        inputEvent.preventDefault();
        inputEvent.stopImmediatePropagation();
        transaction.mark(ids);
        onAtomicDelete?.(ids);
        return;
      }
    }
    transaction.record(inputEvent, editor, root);
  };

  root.addEventListener('beforeinput', handleBeforeInput, true);

  return () => {
    observer.disconnect();
    root.removeEventListener('beforeinput', handleBeforeInput, true);
    transaction.clear();
  };
}

export function createComposerTagController<N extends ComposerTagNode>() {
  const selectedNodeMap = new Map<string, N>();
  const tombstones = new Map<string, N>();
  const pendingRemovedTagIds = new Set<string>();
  const transaction = createPendingRemovalTransaction(pendingRemovedTagIds);
  let unbindFn: (() => void) | null = null;

  return {
    selectedNodeMap,
    tombstones,
    pendingRemovedTagIds,
    trackTag(id: string, node: N) {
      selectedNodeMap.set(id, node);
      tombstones.delete(id);
    },
    applyTemplateData<T extends ComposerUserItem>(value: T[]): T[] {
      const removedIds = transaction.consume();
      const next = reconcileAtomicTemplateData(value, selectedNodeMap, tombstones, removedIds);
      syncComposerTagNodes(next, selectedNodeMap, tombstones);
      return next;
    },
    bind(root: HTMLElement, onAtomicDelete?: (ids: string[]) => void) {
      unbindFn?.();
      unbindFn = bindAtomicComposerTags(root, transaction, onAtomicDelete);
    },
    unbind() {
      unbindFn?.();
      unbindFn = null;
      transaction.clear();
    },
    clear() {
      selectedNodeMap.clear();
      tombstones.clear();
      transaction.clear();
    },
  };
}
