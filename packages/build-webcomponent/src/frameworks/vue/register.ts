export const GENUI_CONFIG_RENDERER_TAG = 'genui-config-renderer';

export function defineGenuiConfigRenderer(tagName: string, element: CustomElementConstructor): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tagName)) return;
  try {
    customElements.define(tagName, element);
  } catch (error) {
    console.error(`Failed to define custom element ${tagName}:`, error);
  }
}
