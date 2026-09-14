// 原生 HTML 元素 + 内置组件，所有 tier 通用。
const NATIVE_AND_BUILTIN = [
  'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ol', 'ul', 'li',
  'input', 'video', 'label', 'div', 'span', 'img', 'button', 'table', 'tr', 'td',
  'th', 'thead', 'tbody', 'form', 'select', 'option', 'textarea',
  'Text', 'Icon', 'Img', 'Slot',
];

/** base：基础组件 + 表单控件 + Card + MatTable */
export const baseWhiteList = [
  'MatButton',
  'MatIconButton',
  'MatFabButton',
  'MatMiniFabButton',
  'MatIcon',
  'MatDivider',
  'MatFormField',
  'MatLabel',
  'MatHint',
  'MatError',
  'MatCheckbox',
  'MatSlideToggle',
  'MatSlider',
  'MatSelect',
  'MatOption',
  'MatRadioGroup',
  'MatRadioButton',
  'MatButtonToggleGroup',
  'MatButtonToggle',
  'MatCard',
  'MatCardHeader',
  'MatCardTitle',
  'MatCardSubtitle',
  'MatCardContent',
  'MatCardActions',
  'MatCardFooter',
  'MatCardTitleGroup',
  'MatTable',
  'MatTextColumn',
  'MatHeaderRow',
  'MatRow',
  'MatFooterRow',
  'MatHeaderCell',
  'MatCell',
  'MatFooterCell',
  'ng-container',
  ...NATIVE_AND_BUILTIN,
];

/** 向后兼容旧导出 */
export const whiteList = baseWhiteList;

/** plus：base + 布局壳 + 导航 + 表单增强 */
export const plusWhiteList = [
  ...baseWhiteList,
  'MatToolbar',
  'MatSidenavContainer',
  'MatSidenav',
  'MatSidenavContent',
  'MatGridList',
  'MatGridTile',
  'MatList',
  'MatListItem',
  'MatNavList',
  'MatActionList',
  'MatSelectionList',
  'MatListOption',
  'MatAccordion',
  'MatExpansionPanel',
  'MatExpansionPanelHeader',
  'MatExpansionPanelTitle',
  'MatExpansionPanelDescription',
  'MatExpansionPanelActionRow',
  'MatTabs',
  'MatTab',
  'MatTabNav',
  'MatTabLink',
  'MatTabNavPanel',
  'MatAutocomplete',
  'MatDatepicker',
  'MatDateRangePicker',
  'MatDatepickerToggle',
  'MatTimepicker',
  'MatTimepickerToggle',
  'MatStepper',
  'MatStep',
];

/** max：plus + 反馈 + 菜单 */
export const maxWhiteList = [
  ...plusWhiteList,
  'MatProgressSpinner',
  'MatProgressBar',
  'MatMenu',
  'MatMenuItem',
];

/** pro：max + 数据展示增强（碎片 / Paginator / Sort / Tree），全量 */
export const proWhiteList = [
  ...maxWhiteList,
  'MatChipSet',
  'MatChip',
  'MatChipListbox',
  'MatChipOption',
  'MatChipGrid',
  'MatChipRow',
  'MatPaginator',
  'MatSortHeader',
  'MatTree',
  'MatTreeNode',
];
