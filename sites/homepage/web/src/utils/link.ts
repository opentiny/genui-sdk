
const linkMap = {
  devDoc: 'https://docs.opentiny.design/genui-sdk',
  playground: 'https://playground.opentiny.design/genui-sdk',
  chatDoc: 'https://docs.opentiny.design/genui-sdk/components/chat',
  dcologicalCompatibility: 'https://docs.opentiny.design/genui-sdk/examples/chat/custom-fetch',
  defineTheme: 'https://docs.opentiny.design/genui-sdk/examples/config-provider/theme',
  defineComponent: 'https://docs.opentiny.design/genui-sdk/examples/chat/custom-components',
  defineAction: 'https://docs.opentiny.design/genui-sdk/examples/chat/custom-actions',
  multiTechnology: 'https://docs.opentiny.design/genui-sdk/advanced/angular-support',
  moreFeatures: 'https://docs.opentiny.design/genui-sdk/examples/chat/custom-examples',
}

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

export function openLink(key: LinkKey) {
  window.open(linkMap[key], '_blank')
}