import type { Component } from 'vue';
import {
  ElInput,
  ElDatePicker,
  ElButton,
  ElForm,
  ElFormItem,
  ElTable,
  ElCard,
  ElRow,
  ElCol,
  ElSelect,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
  ElCheckbox,
  ElTag,
  ElDivider,
  ElTabs,
  ElTabPane,
} from 'element-plus';
import ElIconSvg from './ElIconSvg.vue';
import ElTableColumn from './ElTableColumn';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  ElIconSvg,
  ElInput,
  ElDatePicker,
  ElButton,
  ElForm,
  ElFormItem,
  ElTable,
  // 包装版：解决流式渲染下 props.type 晚于列挂载导致 type 不生效的问题
  ElTableColumn,
  ElCard,
  ElRow,
  ElCol,
  ElSelect,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
  ElCheckbox,
  ElTag,
  ElDivider,
  ElTabs,
  ElTabPane,
};
