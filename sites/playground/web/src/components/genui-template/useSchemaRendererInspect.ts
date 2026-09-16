import { ref, watch, onBeforeUnmount, type Ref } from 'vue';
import { selectedNodeFromSchemaById, type SelectedSchemaNode } from './schema-node-selection';

export interface SchemaInspectHighlight {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
  labelInside: boolean;
}

export function useSchemaRendererInspect(options: {
  isDevMode: Ref<boolean>;
  schema: Ref<Record<string, unknown> | null>;
  insertComposerTag: (node: SelectedSchemaNode) => void;
}) {
  const containerRef = ref<HTMLElement | null>(null);
  const highlight = ref<SchemaInspectHighlight | null>(null);
  let hoveredEl: HTMLElement | null = null;

  const findInspectableElement = (target: EventTarget | null) => {
    let el = target as HTMLElement | null;
    const container = containerRef.value;
    while (el && el !== container) {
      if (el.dataset?.id) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  };

  const updateHighlight = () => {
    const host = containerRef.value?.parentElement;
    if (!host || !hoveredEl) {
      highlight.value = null;
      return;
    }
    const hostRect = host.getBoundingClientRect();
    const rect = hoveredEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      highlight.value = null;
      return;
    }
    const top = rect.top - hostRect.top;
    highlight.value = {
      top,
      left: rect.left - hostRect.left,
      width: rect.width,
      height: rect.height,
      label: hoveredEl.tagName.toLowerCase(),
      labelInside: top < 20,
    };
  };

  const setHovered = (el: HTMLElement | null) => {
    hoveredEl = el;
    updateHighlight();
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!options.isDevMode.value) {
      return;
    }
    setHovered(findInspectableElement(event.target));
  };

  const onMouseLeave = () => {
    setHovered(null);
  };

  const onClick = (event: MouseEvent) => {
    if (!options.isDevMode.value || !options.schema.value) {
      return;
    }
    const el = findInspectableElement(event.target);
    if (!el?.dataset.id) {
      return;
    }
    const node = selectedNodeFromSchemaById(options.schema.value, el.dataset.id);
    if (!node) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    options.insertComposerTag(node);
  };

  const syncHighlight = () => {
    if (options.isDevMode.value) {
      updateHighlight();
    }
  };

  const addSyncListeners = () => {
    document.addEventListener('scroll', syncHighlight, true);
    window.addEventListener('resize', syncHighlight);
  };

  const removeSyncListeners = () => {
    document.removeEventListener('scroll', syncHighlight, true);
    window.removeEventListener('resize', syncHighlight);
  };

  watch(options.isDevMode, (enabled) => {
    if (enabled) {
      addSyncListeners();
    } else {
      setHovered(null);
      removeSyncListeners();
    }
  });

  onBeforeUnmount(() => {
    removeSyncListeners();
    hoveredEl = null;
    highlight.value = null;
  });

  return {
    containerRef,
    highlight,
    onMouseMove,
    onMouseLeave,
    onClick,
  };
}
