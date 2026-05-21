const DOCS_BASE = import.meta.env.VITE_GENUI_DOCS_BASE || 'https://docs.opentiny.design/genui-sdk';
const PLAYGROUND_HREF = import.meta.env.VITE_GENUI_PLAYGROUND_HREF || 'https://playground.opentiny.design/genui-sdk';

export const linkMap = {
  devDoc: `${DOCS_BASE}/guide/quick-start`,
  playground: PLAYGROUND_HREF,
  chatDoc: `${DOCS_BASE}/components/chat`,
  dcologicalCompatibility: `${DOCS_BASE}/examples/chat/custom-fetch`,
  defineTheme: `${DOCS_BASE}/examples/config-provider/theme`,
  defineComponent: `${DOCS_BASE}/examples/chat/custom-components`,
  defineAction: `${DOCS_BASE}/examples/chat/custom-actions`,
  multiTechnology: `${DOCS_BASE}/components/angular/renderer`,
  moreFeatures: `${DOCS_BASE}/examples/chat/custom-examples`,
};

export enum LinkKey {
  DevDoc = 'devDoc',
  Playground = 'playground',
  ChatDoc = 'chatDoc',
  DcologicalCompatibility = 'dcologicalCompatibility',
  DefineTheme = 'defineTheme',
  DefineComponent = 'defineComponent',
  DefineAction = 'defineAction',
  MultiTechnology = 'multiTechnology',
  MoreFeatures = 'moreFeatures',
}

export function openLink(key: keyof typeof linkMap) {
  window.open(linkMap[key], '_blank');
}
