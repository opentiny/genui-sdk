import type { Component } from 'vue';
import * as TinyVue from '@opentiny/vue';
import { Notify } from '@opentiny/vue';
import TinySelectWrap from './components/TinySelectWrap.vue';
import TinyTabsWrap from './components/TinyTabsWrap.vue';
import TinyChartPie from '@opentiny/vue-chart-pie';
import TinyChartRadar from '@opentiny/vue-chart-radar';
import TinyChartBar from '@opentiny/vue-chart-bar';
import TinyChartHistogram from '@opentiny/vue-chart-histogram';
import TinyChartLine from '@opentiny/vue-chart-line';
import TinyChartRing from '@opentiny/vue-chart-ring';

export const MATERIAL_NAME = 'vue-opentiny';

export const componentMap: Record<string, Component> = {
  TinySelect: TinySelectWrap,
  TinyTabs: TinyTabsWrap,
  TinyChartPie,
  TinyChartRadar,
  TinyChartBar,
  TinyChartHistogram,
  TinyChartLine,
  TinyChartRing,
};

export const componentResolver = (name: string) => (TinyVue as Record<string, Component | undefined>)?.[name];

export const notifyAdapter = (opts: { type: string; title: string; message: string }) => {
  Notify({ type: opts.type, title: opts.title, message: opts.message });
};

/** @deprecated 请改用 registerMaterial + MaterialRegistry，仅保留兼容旧代码 */
export let extened = false;
export const extendMapper = (Mapper: Record<string, Component>, customComponents: Record<string, Component>) => {
  if (extened) return;
  extened = true;
  Object.assign(Mapper, componentMap);
  Object.keys(customComponents).forEach((key) => {
    Mapper[key] = customComponents[key];
  });
};
