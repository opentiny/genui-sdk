import { type Type } from '@angular/core';
import { isHTMLTag } from './parser-utils';
import { RendererTextComponent } from '../buildin/renderer-text.component';
import { RendererImageComponent } from '../buildin/renderer-image.component';
import {
  TiButtonComponent,
  TiButtonModule,
  TiSelectComponent,
  TiSelectModule,
  TiTextComponent,
  TiTextModule,
  TiTableComponent,
  TiTableModule,
  TiModalComponent,
  TiModalModule,
  TiDateComponent,
  TiDateModule,
  TiPaginationComponent,
  TiPaginationModule,
  TiTabsComponent,
  TiTabModule,
  TiCheckboxComponent,
  TiCheckboxModule,
  TiCheckboxGroupComponent,
  TiRadioComponent,
  TiRadioModule,
  TiRadioGroupComponent,
  TiTabComponent,
  TiSwitchComponent,
  TiSwitchModule,
  TiTipDirective,
  TiCardComponent,
  TiCardModule,
  TiUploadComponent,
  TiUploadModule,
  TiFormfieldComponent,
  TiFormfieldModule,
  TiCardHeaderComponent,
  TiItemComponent,
  TiDateRangeComponent,
  TiDateRangeModule,
  TiSliderComponent,
  TiSliderModule,
  TiRateComponent,
  TiRateModule,
  TiTextareaComponent,
  TiTextareaModule,
} from '@opentiny/ng';
import { CheckboxControlValueAccessor, DefaultValueAccessor, NgModel } from '@angular/forms';
import { LogDirective } from '../buildin/log.directive';
import { nativeElementComponentFactory } from '../native-element.component';

export const Mapper: Record<string, Type<any>> = {
  Text: RendererTextComponent,
  Img: RendererImageComponent,
  TiButton: TiButtonComponent,
  TiSelect: TiSelectComponent,
  TiText: TiTextComponent,
  TiTable: TiTableComponent,
  TiModal: TiModalComponent,
  TiDate: TiDateComponent,
  TiPagination: TiPaginationComponent,
  TiTabs: TiTabsComponent,
  TiTab: TiTabComponent,
  TiCheckbox: TiCheckboxComponent,
  TiCheckboxGroup: TiCheckboxGroupComponent,
  TiRadio: TiRadioComponent,
  TiRadioGroup: TiRadioGroupComponent,
  TiSwitch: TiSwitchComponent,
  TiCard: TiCardComponent,
  TiUpload: TiUploadComponent,
  TiFormField: TiFormfieldComponent,
  TiCardHeader: TiCardHeaderComponent,
  TiItem: TiItemComponent,
  TiDateRange: TiDateRangeComponent,
  TiSlider: TiSliderComponent,
  TiRate: TiRateComponent,
  TiTextArea: TiTextareaComponent,
};

export const ModuleRef: Record<string, Type<any>> = {
  TiButton: TiButtonModule,
  TiSelect: TiSelectModule,
  TiText: TiTextModule,
  TiTable: TiTableModule,
  TiModal: TiModalModule,
  TiDate: TiDateModule,
  TiPagination: TiPaginationModule,
  TiTabs: TiTabModule,
  TiCheckbox: TiCheckboxModule,
  TiCheckboxGroup: TiCheckboxModule,
  TiRadio: TiRadioModule,
  TiRadioGroup: TiRadioModule,
  TiSwitch: TiSwitchModule,
  TiCard: TiCardModule,
  TiUpload: TiUploadModule,
  TiFormField: TiFormfieldModule,
  TiCardHeader: TiCardModule,
  TiItem: TiFormfieldModule,
  TiDateRange: TiDateRangeModule,
  TiSlider: TiSliderModule,
  TiRate: TiRateModule,
  TiTextArea: TiTextareaModule,
};

export const directiveMap: Record<string, Type<any>> = {
  ngModel: NgModel,
  defaultValueAccessor: DefaultValueAccessor,
  checkboxValueAccessor: CheckboxControlValueAccessor,
  log: LogDirective,
  TiTip: TiTipDirective,
};
// 指令需要标记为standalone
(NgModel['ɵdir'] as any).standalone = true;
(DefaultValueAccessor['ɵdir'] as any).standalone = true;
(CheckboxControlValueAccessor['ɵdir'] as any).standalone = true;
// 部分组件需要修改默认搭配的selector
(TiTextComponent['ɵcmp'] as any).selectors[0][0] = 'input';
(TiTextareaComponent['ɵcmp'] as any).selectors[0][0] = 'textarea';
(TiRadioComponent['ɵcmp'] as any).selectors[0][0] = 'input';
(TiCheckboxComponent['ɵcmp'] as any).selectors[0][0] = 'input';

export const iconMap: Record<string, any> = {};

export const customElements: Record<string, Type<any>> = {};

export const getComponent = (name: string): Type<any> | null => {
  return (
    Mapper[name] ||
    customElements[name] ||
    (isHTMLTag(name, true) ? createComponent(name as string) : null)
  );
};
export const getModuleRef = (name: string): Type<any> | undefined => {
  return ModuleRef[name] || undefined;
};
export const getDirective = (name: string): Type<any> | undefined => {
  return directiveMap[name] || undefined;
};

export const createComponent = (component: string): Type<any> => {
  const componentFactory = nativeElementComponentFactory(component);
  Mapper[component] = componentFactory;
  return componentFactory;
};

export const autoApplyDirectivePattern: Record<string, (schema: any) => boolean> = {
  ngModel: (schema: any) => !!(schema?.props?.ngModel || schema?.props?.onNgModelChange),
  defaultValueAccessor: (schema: any) => {
    const componentType = getComponent(schema?.componentName);
    if (!(componentType as any)?.['ɵcmp']) {
      return false;
    }
    const componentSelectors = (componentType as any)?.['ɵcmp']?.selectors;
    const selectorMatch = () => ['input', 'textarea'].includes(componentSelectors[0][0]);
    const propsMatch = () => schema?.props?.['ngModel'] && schema?.props?.type !== 'checkbox';
    return selectorMatch() && propsMatch();
  },
  checkboxValueAccessor: (schema: any) => {
    const componentType = getComponent(schema?.componentName);
    if (!(componentType as any)?.['ɵcmp']) {
      return false;
    }
    const componentSelectors = (componentType as any)?.['ɵcmp']?.selectors;
    const selectorMatch = () => ['input'].includes(componentSelectors[0][0]);
    const propsMatch = () => schema?.props?.['ngModel'] && schema?.props?.type === 'checkbox';
    return selectorMatch() && propsMatch();
  },
};
