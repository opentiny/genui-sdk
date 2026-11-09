import type { Component } from 'vue';
import { materials as baseMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import TinyActionSheet from '@opentiny/vue-action-sheet';
import TinyPopup from '@opentiny/vue-popup';
import TinyPullRefresh from '@opentiny/vue-pull-refresh';
import TinyTabbar from '@opentiny/vue-tabbar';
import TinyTabbarItem from '@opentiny/vue-tabbar-item';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  ...baseMaterials.components,
  TinyActionSheet,
  TinyPopup,
  TinyPullRefresh,
  TinyTabbar,
  TinyTabbarItem,
};
