import type { Component } from 'vue';
import TinyButton from '@opentiny/vue-button';
import TinyCard from '@opentiny/vue-card';
import TinyCarousel from '@opentiny/vue-carousel';
import TinyCarouselItem from '@opentiny/vue-carousel-item';
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
import TinyLayout from '@opentiny/vue-layout';
import TinyNumeric from '@opentiny/vue-numeric';
import TinyPager from '@opentiny/vue-pager';
import TinyRadio from '@opentiny/vue-radio';
import TinyRadioGroup from '@opentiny/vue-radio-group';
import TinyRow from '@opentiny/vue-row';
import TinySearch from '@opentiny/vue-search';
import TinySwitch from '@opentiny/vue-switch';
import TinyTabItem from '@opentiny/vue-tab-item';
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
  TinyCarouselItem,
  TinyCarousel,
  TinyRow,
  TinyLayout,
  TinyForm,
  TinyFormItem,
  TinyCol,
  TinyButton,
  TinyInput,
  TinyRadio,
  TinyRadioGroup,
  TinySwitch,
  TinySearch,
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
