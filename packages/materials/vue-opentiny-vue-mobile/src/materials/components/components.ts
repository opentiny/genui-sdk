import type { Component } from 'vue';
import TinyActionSheet from '@opentiny/vue-action-sheet';
import TinyAlert from '@opentiny/vue-alert';
import TinyBadge from '@opentiny/vue-badge';
import TinyButton from '@opentiny/vue-button';
import TinyCard from '@opentiny/vue-card';
import TinyCarousel from '@opentiny/vue-carousel';
import TinyCarouselItem from '@opentiny/vue-carousel-item';
import TinyCascader from '@opentiny/vue-cascader';
import TinyCheckbox from '@opentiny/vue-checkbox';
import TinyCheckboxGroup from '@opentiny/vue-checkbox-group';
import TinyCollapse from '@opentiny/vue-collapse';
import TinyCollapseItem from '@opentiny/vue-collapse-item';
import TinyDialogBox from '@opentiny/vue-dialog-box';
import TinyDivider from '@opentiny/vue-divider';
import TinyDrawer from '@opentiny/vue-drawer';
import TinyForm from '@opentiny/vue-form';
import TinyFormItem from '@opentiny/vue-form-item';
import TinyImage from '@opentiny/vue-image';
import TinyInput from '@opentiny/vue-input';
import TinyLoadList from '@opentiny/vue-load-list';
import TinyNumeric from '@opentiny/vue-numeric';
import TinyPager from '@opentiny/vue-pager';
import TinyPopover from '@opentiny/vue-popover';
import TinyPopup from '@opentiny/vue-popup';
import TinyProgress from '@opentiny/vue-progress';
import TinyPullRefresh from '@opentiny/vue-pull-refresh';
import TinyRadio from '@opentiny/vue-radio';
import TinyRadioGroup from '@opentiny/vue-radio-group';
import TinyRate from '@opentiny/vue-rate';
import TinySearch from '@opentiny/vue-search';
import TinySelect from '@opentiny/vue-select';
import TinySkeleton from '@opentiny/vue-skeleton';
import TinySpace from '@opentiny/vue-space';
import TinySteps from '@opentiny/vue-steps';
import TinySticky from '@opentiny/vue-sticky';
import TinySwitch from '@opentiny/vue-switch';
import TinyTabItem from '@opentiny/vue-tab-item';
import TinyTabs from '@opentiny/vue-tabs';
import TinyTag from '@opentiny/vue-tag';
import TinyTagGroup from '@opentiny/vue-tag-group';
import TinyTimeLine from '@opentiny/vue-time-line';
import TinyTooltip from '@opentiny/vue-tooltip';
import TinyUserHead from '@opentiny/vue-user-head';
import TinyIcon from './TinyIcon.vue';
import TinySlider from './TinySlider.vue';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  TinyIcon,
  TinyForm,
  TinyFormItem,
  TinyButton,
  TinyInput,
  TinyRadio,
  TinyRadioGroup,
  TinySelect,
  TinySwitch,
  TinyNumeric,
  TinyCheckbox,
  TinyCheckboxGroup,
  TinyTabs,
  TinyTabItem,
  TinyCollapse,
  TinyCollapseItem,
  TinySteps,
  TinyTimeLine,
  TinyCarousel,
  TinyCarouselItem,
  TinyDialogBox,
  TinyPager,
  TinyPopover,
  TinyTooltip,
  TinySearch,
  TinyCascader,
  TinyCard,
  TinyActionSheet,
  TinyPopup,
  TinyPullRefresh,
  TinyAlert,
  TinyBadge,
  TinyTag,
  TinyTagGroup,
  TinyProgress,
  TinyLoadList,
  TinySlider,
  TinyDrawer,
  TinySticky,
  TinyDivider,
  TinySpace,
  TinyImage,
  TinyUserHead,
  TinySkeleton,
  TinyRate,
};
