import type { Component } from 'vue';
import TinyAutocomplete from '@opentiny/vue-autocomplete';
import TinyButton from '@opentiny/vue-button';
import TinyButtonGroup from '@opentiny/vue-button-group';
import TinyBreadcrumb from '@opentiny/vue-breadcrumb';
import TinyBreadcrumbItem from '@opentiny/vue-breadcrumb-item';
import TinyCard from '@opentiny/vue-card';
import TinyCarousel from '@opentiny/vue-carousel';
import TinyCarouselItem from '@opentiny/vue-carousel-item';
import TinyCascader from '@opentiny/vue-cascader';
import TinyCollapse from '@opentiny/vue-collapse';
import TinyCollapseItem from '@opentiny/vue-collapse-item';
import TinyColorPicker from '@opentiny/vue-color-picker';
import TinyDialogBox from '@opentiny/vue-dialog-box';
import TinyHuichartsBar from '@opentiny/vue-huicharts-bar';
import TinyHuichartsFunnel from '@opentiny/vue-huicharts-funnel';
import TinyHuichartsGauge from '@opentiny/vue-huicharts-gauge';
import TinyHuichartsGraph from '@opentiny/vue-huicharts-graph';
import TinyHuichartsHistogram from '@opentiny/vue-huicharts-histogram';
import TinyHuichartsLine from '@opentiny/vue-huicharts-line';
import TinyHuichartsPie from '@opentiny/vue-huicharts-pie';
import TinyHuichartsProcess from '@opentiny/vue-huicharts-process';
import TinyHuichartsRadar from '@opentiny/vue-huicharts-radar';
import TinyHuichartsRing from '@opentiny/vue-huicharts-ring';
import TinyHuichartsScatter from '@opentiny/vue-huicharts-scatter';
import TinyHuichartsWaterfall from '@opentiny/vue-huicharts-waterfall';
import TinyCheckbox from '@opentiny/vue-checkbox';
import TinyCheckboxButton from '@opentiny/vue-checkbox-button';
import TinyCheckboxGroup from '@opentiny/vue-checkbox-group';
import TinyCol from '@opentiny/vue-col';
import TinyDatePicker from '@opentiny/vue-date-picker';
import TinyForm from '@opentiny/vue-form';
import TinyFormItem from '@opentiny/vue-form-item';
import TinyGrid from '@opentiny/vue-grid';
import TinyInput from '@opentiny/vue-input';
import TinyIpAddress from '@opentiny/vue-ip-address';
import TinyLayout from '@opentiny/vue-layout';
import TinyNumeric from '@opentiny/vue-numeric';
import TinyPager from '@opentiny/vue-pager';
import TinyPopeditor from '@opentiny/vue-popeditor';
import TinyPopover from '@opentiny/vue-popover';
import TinyRadio from '@opentiny/vue-radio';
import TinyRadioGroup from '@opentiny/vue-radio-group';
import TinyRow from '@opentiny/vue-row';
import TinySearch from '@opentiny/vue-search';
import TinySteps from '@opentiny/vue-steps';
import TinySwitch from '@opentiny/vue-switch';
import TinyTabItem from '@opentiny/vue-tab-item';
import TinyTimeLine from '@opentiny/vue-time-line';
import TinyTooltip from '@opentiny/vue-tooltip';
import TinyTransfer from '@opentiny/vue-transfer';
import TinyTree from '@opentiny/vue-tree';
import TinySelect from '@opentiny/vue-select';

import TinyTabs from './TinyTabsWrap.vue';
import TinyIcon from './TinyIcon.vue';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  TinyIcon,
  TinyAutocomplete,
  TinyCarouselItem,
  TinyCarousel,
  TinyCascader,
  TinyColorPicker,
  TinyRow,
  TinyLayout,
  TinyForm,
  TinyFormItem,
  TinyCol,
  TinyButton,
  TinyButtonGroup,
  TinyBreadcrumb,
  TinyBreadcrumbItem,
  TinyCollapse,
  TinyCollapseItem,
  TinyDialogBox,
  TinyInput,
  TinyIpAddress,
  TinyRadio,
  TinyRadioGroup,
  TinySwitch,
  TinySearch,
  TinySteps,
  TinyCheckbox,
  TinyCheckboxButton,
  TinyCheckboxGroup,
  TinyTabItem,
  TinyGrid,
  TinyCard,
  TinyTree,
  TinyDatePicker,
  TinyNumeric,
  TinyPager,
  TinyPopeditor,
  TinyPopover,
  TinyTooltip,
  TinyTimeLine,
  TinyTransfer,
  TinyHuichartsLine,
  TinyHuichartsHistogram,
  TinyHuichartsBar,
  TinyHuichartsRadar,
  TinyHuichartsRing,
  TinyHuichartsPie,
  TinyHuichartsFunnel,
  TinyHuichartsScatter,
  TinyHuichartsWaterfall,
  TinyHuichartsGauge,
  TinyHuichartsGraph,
  TinyHuichartsProcess,
  TinyTabs,
  TinySelect,
};
