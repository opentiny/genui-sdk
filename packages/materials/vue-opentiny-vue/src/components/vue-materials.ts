import type { Component } from 'vue';
import TinyButton from '@opentiny/vue-button';
import TinyCard from '@opentiny/vue-card';
import TinyCarousel from '@opentiny/vue-carousel';
import TinyCarouselItem from '@opentiny/vue-carousel-item';
import TinyChartBar from '@opentiny/vue-chart-bar';
import TinyChartHistogram from '@opentiny/vue-chart-histogram';
import TinyChartLine from '@opentiny/vue-chart-line';
import TinyChartPie from '@opentiny/vue-chart-pie';
import TinyChartRadar from '@opentiny/vue-chart-radar';
import TinyChartRing from '@opentiny/vue-chart-ring';
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

import TinySelectWrap from './TinySelectWrap.vue';
import TinyTabsWrap from './TinyTabsWrap.vue';

export const vueMaterials: Record<string, Component> = {
  TinyCarouselItem: TinyCarouselItem,
  TinyCarousel: TinyCarousel,
  TinyRow: TinyRow,
  TinyLayout: TinyLayout,
  TinyForm: TinyForm,
  TinyFormItem: TinyFormItem,
  TinyCol: TinyCol,
  TinyButton: TinyButton,
  TinyInput: TinyInput,
  TinyRadio: TinyRadio,
  TinyRadioGroup: TinyRadioGroup,
  TinySwitch: TinySwitch,
  TinySearch: TinySearch,
  TinyCheckbox: TinyCheckbox,
  TinyCheckboxButton: TinyCheckboxButton,
  TinyCheckboxGroup: TinyCheckboxGroup,
  TinyTabItem: TinyTabItem,
  TinyGrid: TinyGrid,
  TinyCard: TinyCard,
  TinyTree: TinyTree,
  TinyDatePicker: TinyDatePicker,
  TinyNumeric: TinyNumeric,
  TinyPager: TinyPager,
  TinyTransfer: TinyTransfer,
  TinyChartPie: TinyChartPie,
  TinyChartLine: TinyChartLine,
  TinyChartHistogram: TinyChartHistogram,
  TinyChartBar: TinyChartBar,
  TinyChartRadar: TinyChartRadar,
  TinyChartRing: TinyChartRing,
  TinyTabs: TinyTabsWrap,
  TinySelect: TinySelectWrap,
};
