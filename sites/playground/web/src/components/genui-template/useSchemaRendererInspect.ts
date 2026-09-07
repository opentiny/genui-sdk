import { ref, watch, type Ref } from 'vue';
import { selectedNodeFromSchemaById, type SelectedSchemaNode } from './schema-node-selection';

export function useSchemaRendererInspect(options: {
  isDevMode: Ref<boolean>;
  schema: Ref<Record<string, unknown> | null>;
  insertComposerTag: (node: SelectedSchemaNode) => void;
}) {
  const containerRef = ref<HTMLElement | null>(null);
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

  const setHovered = (el: HTMLElement | null) => {
    if (hoveredEl === el) {
      return;
    }
    hoveredEl?.classList.remove('is-schema-hovered');
    hoveredEl = el;
    hoveredEl?.classList.add('is-schema-hovered');
  };

  const clearInspectState = () => {
    setHovered(null);
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

  watch(options.isDevMode, (enabled) => {
    if (!enabled) {
      clearInspectState();
    }
  });

  return {
    containerRef,
    onMouseMove,
    onMouseLeave,
    onClick,
  };
}
