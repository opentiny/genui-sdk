const DOC_DOMAIN = import.meta.env.VITE_GENUI_DOC_DOMAIN || 'https://docs.opentiny.design';
const PLAYGROUND_HREF = import.meta.env.VITE_GENUI_PLAYGROUND_HREF || 'https://playground.opentiny.design/genui-sdk';

const linkMap = {
  devDoc: `${DOC_DOMAIN}/genui-sdk`,
  playground: PLAYGROUND_HREF,
  chatDoc: `${DOC_DOMAIN}/genui-sdk/components/chat`,
  dcologicalCompatibility: `${DOC_DOMAIN}/genui-sdk/examples/chat/custom-fetch`,
  defineTheme: `${DOC_DOMAIN}/genui-sdk/examples/config-provider/theme`,
  defineComponent: `${DOC_DOMAIN}/genui-sdk/examples/chat/custom-components`,
  defineAction: `${DOC_DOMAIN}/genui-sdk/examples/chat/custom-actions`,
  multiTechnology: `${DOC_DOMAIN}/genui-sdk/components/angular-renderer`,
  moreFeatures: `${DOC_DOMAIN}/genui-sdk/examples/chat/custom-examples`,
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
