export const componentMap: Record<string, string> = {
    TiButton: 'TiButtonComponent',
    TiSelect: 'TiSelectComponent',
    TiText: 'TiTextComponent',
    TiTable: 'TiTableComponent',
    TiModal: 'TiModalComponent',
    TiDate: 'TiDateComponent',
    TiPagination: 'TiPaginationComponent',
    TiTabs: 'TiTabsComponent',
    TiTab: 'TiTabComponent',
    TiCheckbox: 'TiCheckboxComponent',
    TiCheckboxGroup: 'TiCheckboxGroupComponent',
    TiRadio: 'TiRadioComponent',
    TiRadioGroup: 'TiRadioGroupComponent',
    TiSwitch: 'TiSwitchComponent',
    TiCard: 'TiCardComponent',
    TiUpload: 'TiUploadComponent',
    TiFormField: 'TiFormfieldComponent',
    TiCardHeader: 'TiCardHeaderComponent',
    TiItem: 'TiItemComponent',
    TiDateRange: 'TiDateRangeComponent',
    TiSlider: 'TiSliderComponent',
    TiRate: 'TiRateComponent',
    TiTextArea: 'TiTextareaComponent',
  };
  
  export const moduleRefMap: Record<string, string> = {
    TiButton: 'TiButtonModule'  ,
    TiSelect: 'TiSelectModule',
    TiText: 'TiTextModule',
    TiTable: 'TiTableModule',
    TiModal: 'TiModalModule',
    TiDate: 'TiDateModule',
    TiPagination: 'TiPaginationModule',
    TiTabs: 'TiTabModule',
    TiTab: 'TiTabModule',
    TiCheckbox: 'TiCheckboxModule',
    TiCheckboxGroup: 'TiCheckboxModule',  
    TiRadio: 'TiRadioModule',
    TiRadioGroup: 'TiRadioModule',
    TiSwitch: 'TiSwitchModule',
    TiCard: 'TiCardModule',
    TiUpload: 'TiUploadModule',
    TiFormField: 'TiFormfieldModule',
    TiCardHeader: 'TiCardModule',
    TiItem: 'TiFormfieldModule',
    TiDateRange: 'TiDateRangeModule',
    TiSlider: 'TiSliderModule',
    TiRate: 'TiRateModule',
    TiTextArea: 'TiTextareaModule',
  };
  
//   export const directiveMap: Record<string, Type<any>> = {
//     ngModel: NgModel,
//     defaultValueAccessor: DefaultValueAccessor,
//     checkboxValueAccessor: CheckboxControlValueAccessor,
//     log: LogDirective,
//     TiTip: TiTipDirective,
//   };

  export const insideComponentMapper = {
    Text: 'span',
    Img: 'img',
  };

  export const componentSelector = {
    TiButton: 'button',
    TiSelect: 'ti-select',
    TiText: 'input',
    TiTable: 'ti-table',
    TiModal: 'ti-modal',
    TiDate: 'input',
    TiPagination: 'ti-pagination',
    TiTabs: 'ti-tabs',
    TiTab: 'ti-tab',
    TiCheckbox: 'input',
    TiCheckboxGroup: 'ti-checkbox-group',
    TiRadio: 'input',
    TiRadioGroup: 'ti-radio-group',
    TiSwitch: 'ti-switch',
    TiCard: 'ti-card',
    TiUpload: 'ti-upload',
    TiFormField: 'ti-formfield',
    TiCardHeader: 'ti-card-header',
    TiItem: 'ti-item',
    TiDateRange: 'ti-date-range',
    TiSlider: 'ti-slider',
    TiRate: 'ti-rate',
    TiTextArea: 'textarea',
  };

  export const componentExtraSelector = {
    TiButton: 'tiButton',
    TiText: 'tiText',
    TiTextArea: 'tiTextarea',
    TiRadio: 'tiRadio',
    TiCheckbox: 'tiCheckbox',
    TiDate: 'tiDate',
  }

export const componentMapWithPackage = Object.fromEntries(Object.entries(componentMap).map(([key, value]) => [key, {exportName: value, package: '@opentiny/ng'}]));
export const moduleMapWithPackage = Object.fromEntries(Object.entries(moduleRefMap).map(([key, value]) => [key, {module: value, package: '@opentiny/ng'}]));
