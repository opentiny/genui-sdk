import type { Component } from 'vue';
import TinySelectWrap from './components/TinySelectWrap.vue';
// TODO: to be remove
// import ActionButton from './components/ActionButton.vue';
import TinyTabsWrap from './components/TinyTabsWrap.vue';
import GridStack from './components/GridStack.vue';
import GridStackItem from './components/GridStackItem.vue';

export let extened = false;
export const extendMapper = (Mapper: any, customComponents: Record<string, Component>) => {
  if (extened) return;
  extened = true;
  Mapper.TinySelect = TinySelectWrap;
  // Mapper.ActionButton = ActionButton;
  Mapper.TinyTabs = TinyTabsWrap;

  Object.keys(customComponents).forEach((key) => {
    Mapper[key] = customComponents[key];
  });
  Mapper.GridStack = GridStack;
  Mapper.GridStackItem = GridStackItem;
};
