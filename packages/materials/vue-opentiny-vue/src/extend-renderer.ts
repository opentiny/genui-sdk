import type { Component } from 'vue';
import TinySelectWrap from './components/TinySelectWrap.vue';
// TODO: to be remove
// import ActionButton from './components/ActionButton.vue';
import TinyTabsWrap from './components/TinyTabsWrap.vue';
// import GridStack from './components/GridStack.vue';
// import GridStackItem from './components/GridStackItem.vue';
import { TinyHuichartsLine, TinyHuichartsHistogram, TinyHuichartsBar, TinyHuichartsRadar, TinyHuichartsRing, TinyHuichartsPie, TinyHuichartsFunnel, TinyHuichartsScatter, TinyHuichartsWaterfall, TinyHuichartsGauge, TinyHuichartsGraph, TinyHuichartsProcess } from '@opentiny/vue-huicharts';


export let extened = false;
export const extendMapper = (Mapper: any, customComponents: Record<string, Component>) => {
  if (extened) return;
  extened = true;
  Mapper.TinySelect = TinySelectWrap;
  // Mapper.ActionButton = ActionButton;
  Mapper.TinyTabs = TinyTabsWrap;
  Mapper.TinyHuichartsLine = TinyHuichartsLine;
  Mapper.TinyHuichartsHistogram = TinyHuichartsHistogram;
  Mapper.TinyHuichartsBar = TinyHuichartsBar;
  Mapper.TinyHuichartsRadar = TinyHuichartsRadar;
  Mapper.TinyHuichartsRing = TinyHuichartsRing;
  Mapper.TinyHuichartsPie = TinyHuichartsPie;
  Mapper.TinyHuichartsFunnel = TinyHuichartsFunnel;
  Mapper.TinyHuichartsScatter = TinyHuichartsScatter;
  Mapper.TinyHuichartsWaterfall = TinyHuichartsWaterfall;
  Mapper.TinyHuichartsGauge = TinyHuichartsGauge;
  Mapper.TinyHuichartsGraph = TinyHuichartsGraph;
  Mapper.TinyHuichartsProcess = TinyHuichartsProcess;

  Object.keys(customComponents).forEach((key) => {
    Mapper[key] = customComponents[key];
  });
  // Mapper.GridStack = GridStack;
  // Mapper.GridStackItem = GridStackItem;
};
