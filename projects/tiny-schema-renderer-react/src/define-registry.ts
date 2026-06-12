import type { ComponentRegistry, ComponentRenderer } from './types';

export function defineRegistry(
  components: ComponentRegistry,
): { registry: ComponentRegistry } {
  return { registry: components };
}

export function mergeRegistry(...registries: ComponentRegistry[]): ComponentRegistry {
  return Object.assign({}, ...registries);
}
