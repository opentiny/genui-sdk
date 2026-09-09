// 一次性脚本：生成 Angular Material 物料包的 bundle.json 协议描述
// 用法：node scripts/gen-bundle.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../projects/mat-materials/src/meta/materials/bundle.json');
const VERSION = '20.2.14';

let seq = 0;

const toOptions = (list) => list.map((v) => ({ label: v, value: v }));

const strProp = (property, labelZh, descZh, extra = {}) => ({
  property,
  label: { text: { zh_CN: labelZh } },
  description: { zh_CN: descZh },
  required: false,
  readOnly: false,
  disabled: false,
  cols: 12,
  labelPosition: 'left',
  type: extra.type ?? 'string',
  widget: { component: extra.widget ?? 'InputConfigurator', props: extra.widgetProps ?? {} },
  ...(extra.defaultValue !== undefined ? { defaultValue: extra.defaultValue } : {}),
});

const boolProp = (property, labelZh, descZh, extra = {}) => ({
  property,
  label: { text: { zh_CN: labelZh } },
  description: { zh_CN: descZh },
  required: false,
  readOnly: false,
  disabled: false,
  cols: 12,
  labelPosition: 'left',
  type: 'boolean',
  widget: { component: 'CheckBoxConfigurator', props: {} },
  ...(extra.defaultValue !== undefined ? { defaultValue: extra.defaultValue } : {}),
});

const numProp = (property, labelZh, descZh, extra = {}) => ({
  property,
  label: { text: { zh_CN: labelZh } },
  description: { zh_CN: descZh },
  required: false,
  readOnly: false,
  disabled: false,
  cols: 12,
  labelPosition: 'left',
  type: 'number',
  widget: { component: 'NumberConfigurator', props: {} },
  ...(extra.defaultValue !== undefined ? { defaultValue: extra.defaultValue } : {}),
});

const selectProp = (property, labelZh, descZh, options, extra = {}) =>
  strProp(property, labelZh, descZh, {
    ...extra,
    widget: 'SelectConfigurator',
    widgetProps: { options: toOptions(options) },
  });

const arrayProp = (property, labelZh, descZh, extra = {}) => ({
  property,
  label: { text: { zh_CN: labelZh } },
  description: { zh_CN: descZh },
  required: false,
  readOnly: false,
  disabled: false,
  cols: 12,
  labelPosition: 'left',
  type: 'array',
  widget: { component: 'ArrayConfigurator', props: {} },
  ...(extra.defaultValue !== undefined ? { defaultValue: extra.defaultValue } : {}),
});

const event = (labelZh, descZh, params = []) => ({
  label: { zh_CN: labelZh },
  description: { zh_CN: descZh },
  type: 'event',
  functionInfo: { params, returns: {} },
});

/** Schema / LLM 协议与 OpenTiny 物料一致：事件名是 onXxx（click → onClick）。 */
const toOnEventName = (name) =>
  /^on[A-Z]/.test(name) ? name : `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;

const withOnEvents = (events = {}) =>
  Object.fromEntries(Object.entries(events).map(([name, cfg]) => [toOnEventName(name), cfg]));

const param = (name, type, descZh) => ({
  name,
  type,
  defaultValue: '',
  description: { zh_CN: descZh },
});

const ngModelEvent = () =>
  event('值改变事件', '值改变时触发（双向绑定 ngModel 自动生成 onNgModelChange）', [
    param('value', 'any', '当前的值'),
  ]);

const group = (content) => ({
  name: '0',
  label: { zh_CN: '基础属性' },
  content,
  description: { zh_CN: '' },
});

const colorOptions = ['primary', 'accent', 'warn'];

const componentEntry = ({
  component,
  nameZh,
  icon,
  description,
  docUrl,
  groupName,
  keywords,
  tags,
  isContainer = false,
  isModal = false,
  isLayout = false,
  properties = [],
  events = {},
  slots = {},
}) => ({
  id: ++seq,
  version: VERSION,
  name: { zh_CN: nameZh },
  component,
  icon,
  description,
  doc_url: docUrl,
  screenshot: '',
  tags,
  keywords,
  dev_mode: 'proCode',
  npm: { package: '@angular/material', exportName: component, destructuring: false },
  group: groupName,
  category: 'angular-material',
  configure: {
    loop: true,
    condition: true,
    styles: true,
    isContainer,
    isModal,
    isPopper: false,
    nestingRule: {
      childWhitelist: '',
      parentWhitelist: '',
      descendantBlacklist: '',
      ancestorWhitelist: '',
    },
    isNullNode: false,
    isLayout,
    rootSelector: '',
    shortcuts: { properties: [] },
    contextMenu: {
      actions: ['copy', 'remove', 'insert', 'updateAttr', 'bindEvent', 'createBlock'],
      disable: [],
    },
    invalidity: [],
    clickCapture: true,
    framework: 'Angular',
  },
  schema: {
    properties: properties.length ? [group(properties)] : [],
    events: withOnEvents(events),
    slots,
  },
});

const defaultSlot = (labelZh, descZh) => ({
  default: { label: { zh_CN: labelZh }, description: { zh_CN: descZh } },
});

const components = [
  // ============ 基础组件 ============
  componentEntry({
    component: 'MatButton',
    nameZh: '按钮',
    icon: 'button',
    description: 'Material Design 按钮组件，支持多种外观样式和主题色',
    docUrl: 'https://material.angular.dev/components/button/overview',
    groupName: '基础组件',
    keywords: 'button,按钮,点击',
    tags: 'button,按钮,基础组件',
    properties: [
      selectProp('appearance', '外观', '按钮外观：text、filled、elevated、outlined、tonal', ['text', 'filled', 'elevated', 'outlined', 'tonal'], { defaultValue: 'filled' }),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      boolProp('disabled', '禁用', '是否禁用按钮', { defaultValue: false }),
      boolProp('disableRipple', '禁用涟漪', '是否禁用点击涟漪效果'),
      boolProp('disabledInteractive', '禁用可交互', '禁用状态下仍可交互（接收点击与焦点）'),
    ],
    events: {
      click: event('点击事件', '按钮点击时触发', [param('event', 'Event', '原生点击事件对象')]),
    },
  }),
  componentEntry({
    component: 'MatIconButton',
    nameZh: '图标按钮',
    icon: 'button',
    description: 'Material Design 图标按钮，对应 button[matIconButton]，用于工具栏等只显示图标的操作',
    docUrl: 'https://material.angular.dev/components/button/overview',
    groupName: '基础组件',
    keywords: 'icon button,图标按钮',
    tags: 'button,图标按钮,基础组件',
    properties: [
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions),
      boolProp('disabled', '禁用', '是否禁用按钮', { defaultValue: false }),
      boolProp('disableRipple', '禁用涟漪', '是否禁用点击涟漪效果'),
      boolProp('disabledInteractive', '禁用可交互', '禁用状态下仍可交互（接收点击与焦点）'),
    ],
    events: {
      click: event('点击事件', '按钮点击时触发', [param('event', 'Event', '原生点击事件对象')]),
    },
  }),
  componentEntry({
    component: 'MatIcon',
    nameZh: '图标',
    icon: 'icon',
    description: 'Material Design 图标组件，展示矢量图标',
    docUrl: 'https://material.angular.dev/components/icon/overview',
    groupName: '基础组件',
    keywords: 'icon,图标',
    tags: 'icon,图标,基础组件',
    properties: [
      strProp('fontIcon', '图标名称', 'Material Icons 字体图标名称，如 home、favorite、settings'),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions),
      boolProp('inline', '行内模式', '是否以行内方式展示图标'),
    ],
  }),
  componentEntry({
    component: 'MatDivider',
    nameZh: '分割线',
    icon: 'divider',
    description: '用于分隔内容的分割线',
    docUrl: 'https://material.angular.dev/components/divider/overview',
    groupName: '基础组件',
    keywords: 'divider,分割线,分隔',
    tags: 'divider,分割线,基础组件',
    properties: [
      boolProp('vertical', '垂直', '是否为垂直方向的分割线'),
      boolProp('inset', '内缩', '是否内缩分割线'),
    ],
  }),

  // ============ 表单组件 ============
  componentEntry({
    component: 'MatFormField',
    nameZh: '表单容器',
    icon: 'form-field',
    description: '表单控件容器，为输入类控件提供 Material 风格的标签、提示与校验样式',
    docUrl: 'https://material.angular.dev/components/form-field/overview',
    groupName: '表单组件',
    keywords: 'form-field,表单,输入容器',
    tags: 'form-field,表单,容器',
    isContainer: true,
    properties: [
      selectProp('appearance', '外观', '表单外观：fill、outline', ['fill', 'outline'], { defaultValue: 'outline' }),
      selectProp('floatLabel', '标签浮动', '标签浮动方式：auto、always', ['auto', 'always'], { defaultValue: 'auto' }),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      boolProp('hideRequiredMarker', '隐藏必填标记', '是否隐藏必填星号标记'),
      strProp('hintLabel', '提示文本', '表单字段的提示文本'),
    ],
    slots: defaultSlot('控件内容', '表单控件内容，通常放置 input(matInput) 输入框或 MatSelect 等控件'),
  }),
  componentEntry({
    component: 'MatLabel',
    nameZh: '表单标签',
    icon: 'label',
    description: '表单字段的浮动标签文本，用于 MatFormField 内部',
    docUrl: 'https://material.angular.dev/components/form-field/overview',
    groupName: '表单组件',
    keywords: 'label,标签',
    tags: 'label,标签,表单',
    properties: [],
    slots: defaultSlot('标签内容', '标签文本内容'),
  }),
  componentEntry({
    component: 'MatCheckbox',
    nameZh: '复选框',
    icon: 'checkbox',
    description: 'Material Design 复选框，支持双向绑定',
    docUrl: 'https://material.angular.dev/components/checkbox/overview',
    groupName: '表单组件',
    keywords: 'checkbox,复选框',
    tags: 'checkbox,复选框,表单',
    properties: [
      boolProp('ngModel', '选中状态', '是否选中（双向绑定）', { defaultValue: false }),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      selectProp('labelPosition', '标签位置', '标签位置：after、before', ['after', 'before'], { defaultValue: 'after' }),
      boolProp('disabled', '禁用', '是否禁用'),
      boolProp('indeterminate', '不确定状态', '是否显示为不确定状态'),
    ],
    events: { ngModelChange: ngModelEvent() },
    slots: defaultSlot('标签内容', '复选框的标签文本'),
  }),
  componentEntry({
    component: 'MatSlideToggle',
    nameZh: '开关',
    icon: 'switch',
    description: 'Material Design 滑动开关，支持双向绑定',
    docUrl: 'https://material.angular.dev/components/slide-toggle/overview',
    groupName: '表单组件',
    keywords: 'slide-toggle,开关',
    tags: 'slide-toggle,开关,表单',
    properties: [
      boolProp('ngModel', '开关状态', '是否打开（双向绑定）', { defaultValue: false }),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      selectProp('labelPosition', '标签位置', '标签位置：after、before', ['after', 'before'], { defaultValue: 'after' }),
      boolProp('disabled', '禁用', '是否禁用'),
    ],
    events: { ngModelChange: ngModelEvent() },
    slots: defaultSlot('标签内容', '开关的标签文本'),
  }),
  componentEntry({
    component: 'MatSlider',
    nameZh: '滑块',
    icon: 'slider',
    description: 'Material Design 滑块，通过拖动选择数值，支持双向绑定',
    docUrl: 'https://material.angular.dev/components/slider/overview',
    groupName: '表单组件',
    keywords: 'slider,滑块',
    tags: 'slider,滑块,表单',
    isContainer: true,
    properties: [
      numProp('min', '最小值', '滑块最小值', { defaultValue: 0 }),
      numProp('max', '最大值', '滑块最大值', { defaultValue: 100 }),
      numProp('step', '步长', '滑块步长', { defaultValue: 1 }),
      boolProp('discrete', '离散显示', '拖动时是否显示离散数值标签'),
      boolProp('showTickMarks', '刻度线', '是否显示刻度线'),
      boolProp('disabled', '禁用', '是否禁用'),
    ],
    slots: defaultSlot('滑块拇指', '必须放置 input，并声明 matSliderThumb: true；ngModel 写在该 input 上'),
  }),
  componentEntry({
    component: 'MatSelect',
    nameZh: '选择器',
    icon: 'select',
    description: 'Material Design 下拉选择器，支持单选、多选与双向绑定',
    docUrl: 'https://material.angular.dev/components/select/overview',
    groupName: '表单组件',
    keywords: 'select,选择器,下拉',
    tags: 'select,选择器,表单',
    isContainer: true,
    properties: [
      strProp('ngModel', '选中值', '当前选中的值（双向绑定）', { widget: 'ObjectConfigurator' }),
      strProp('placeholder', '占位文本', '未选中时的占位提示'),
      boolProp('multiple', '多选', '是否支持多选'),
      boolProp('required', '必填', '是否必填'),
      boolProp('disabled', '禁用', '是否禁用'),
    ],
    events: {
      ngModelChange: ngModelEvent(),
      selectionChange: event('选择变化事件', '选中项变化时触发', [param('event', 'MatSelectChange', '选择变化事件对象')]),
    },
    slots: defaultSlot('选项内容', '通常放置多个 MatOption 选项组件'),
  }),
  componentEntry({
    component: 'MatOption',
    nameZh: '选项',
    icon: 'option',
    description: 'MatSelect 的下拉选项',
    docUrl: 'https://material.angular.dev/components/select/overview',
    groupName: '表单组件',
    keywords: 'option,选项',
    tags: 'option,选项,表单',
    properties: [
      strProp('value', '选项值', '选项的值'),
      boolProp('disabled', '禁用', '是否禁用该选项'),
    ],
    slots: defaultSlot('选项文本', '选项显示的文本'),
  }),
  componentEntry({
    component: 'MatRadioGroup',
    nameZh: '单选框组',
    icon: 'radio-group',
    description: '单选框分组容器，管理一组 MatRadioButton，支持双向绑定',
    docUrl: 'https://material.angular.dev/components/radio/overview',
    groupName: '表单组件',
    keywords: 'radio,单选框',
    tags: 'radio-group,单选框,表单',
    isContainer: true,
    properties: [
      strProp('ngModel', '选中值', '当前选中的值（双向绑定）', { widget: 'ObjectConfigurator' }),
      strProp('name', '名称', '单选框组名称（同一组保持一致）'),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      selectProp('labelPosition', '标签位置', '标签位置：after、before', ['after', 'before'], { defaultValue: 'after' }),
      boolProp('disabled', '禁用', '是否禁用整组'),
    ],
    events: { ngModelChange: ngModelEvent() },
    slots: defaultSlot('单选项内容', '放置多个 MatRadioButton 单选项'),
  }),
  componentEntry({
    component: 'MatRadioButton',
    nameZh: '单选项',
    icon: 'radio',
    description: '单选项，需放置在 MatRadioGroup 内',
    docUrl: 'https://material.angular.dev/components/radio/overview',
    groupName: '表单组件',
    keywords: 'radio,单选项',
    tags: 'radio,单选框,表单',
    properties: [
      strProp('value', '选项值', '该单选项的值'),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      boolProp('disabled', '禁用', '是否禁用该选项'),
    ],
    slots: defaultSlot('选项文本', '单选项的标签文本'),
  }),
  componentEntry({
    component: 'MatButtonToggleGroup',
    nameZh: '按钮开关组',
    icon: 'button-toggle-group',
    description: '按钮开关组，可单选或多选，支持双向绑定',
    docUrl: 'https://material.angular.dev/components/button-toggle/overview',
    groupName: '表单组件',
    keywords: 'button-toggle,按钮开关',
    tags: 'button-toggle,按钮开关,表单',
    isContainer: true,
    properties: [
      strProp('ngModel', '选中值', '当前选中的值（双向绑定）', { widget: 'ObjectConfigurator' }),
      boolProp('multiple', '多选', '是否允许多选'),
      boolProp('disabled', '禁用', '是否禁用'),
    ],
    events: {
      ngModelChange: ngModelEvent(),
      change: event('切换事件', '选中项变化时触发', [param('event', 'MatButtonToggleChange', '切换事件对象')]),
    },
    slots: defaultSlot('按钮开关内容', '放置多个 MatButtonToggle'),
  }),
  componentEntry({
    component: 'MatButtonToggle',
    nameZh: '按钮开关',
    icon: 'button-toggle',
    description: '单个按钮开关，需放置在 MatButtonToggleGroup 内',
    docUrl: 'https://material.angular.dev/components/button-toggle/overview',
    groupName: '表单组件',
    keywords: 'button-toggle,按钮开关',
    tags: 'button-toggle,按钮开关,表单',
    properties: [
      strProp('value', '选项值', '该按钮开关的值'),
      boolProp('checked', '选中', '是否默认选中'),
      boolProp('disabled', '禁用', '是否禁用'),
    ],
    slots: defaultSlot('按钮文本', '按钮开关显示的文本'),
  }),

  // ============ 布局组件 ============
  componentEntry({
    component: 'MatCard',
    nameZh: '卡片',
    icon: 'card',
    description: 'Material Design 卡片容器，用于聚合展示信息',
    docUrl: 'https://material.angular.dev/components/card/overview',
    groupName: '布局组件',
    keywords: 'card,卡片,容器',
    tags: 'card,卡片,布局',
    isContainer: true,
    isLayout: true,
    properties: [
      selectProp('appearance', '外观', '卡片外观：outlined、raised', ['outlined', 'raised'], { defaultValue: 'outlined' }),
    ],
    slots: {
      default: { label: { zh_CN: '卡片内容' }, description: { zh_CN: '卡片主体内容' } },
      header: { label: { zh_CN: '卡片头部' }, description: { zh_CN: '放置 MatCardHeader 卡片头部' } },
    },
  }),
  componentEntry({
    component: 'MatCardHeader',
    nameZh: '卡片头部',
    icon: 'card-header',
    description: '卡片头部容器，通常包含标题与副标题',
    docUrl: 'https://material.angular.dev/components/card/overview',
    groupName: '布局组件',
    keywords: 'card-header,卡片头部',
    tags: 'card-header,卡片,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('头部内容', '通常放置 MatCardTitle 与 MatCardSubtitle'),
  }),
  componentEntry({
    component: 'MatCardTitle',
    nameZh: '卡片标题',
    icon: 'card-title',
    description: '卡片标题文本',
    docUrl: 'https://material.angular.dev/components/card/overview',
    groupName: '布局组件',
    keywords: 'card-title,卡片标题',
    tags: 'card-title,卡片,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('标题内容', '标题文本内容'),
  }),
  componentEntry({
    component: 'MatCardSubtitle',
    nameZh: '卡片副标题',
    icon: 'card-subtitle',
    description: '卡片副标题文本',
    docUrl: 'https://material.angular.dev/components/card/overview',
    groupName: '布局组件',
    keywords: 'card-subtitle,卡片副标题',
    tags: 'card-subtitle,卡片,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('副标题内容', '副标题文本内容'),
  }),
  componentEntry({
    component: 'MatCardContent',
    nameZh: '卡片内容',
    icon: 'card-content',
    description: '卡片主体内容容器',
    docUrl: 'https://material.angular.dev/components/card/overview',
    groupName: '布局组件',
    keywords: 'card-content,卡片内容',
    tags: 'card-content,卡片,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('内容', '卡片主体内容'),
  }),
  componentEntry({
    component: 'MatCardActions',
    nameZh: '卡片操作区',
    icon: 'card-actions',
    description: '卡片底部操作按钮容器',
    docUrl: 'https://material.angular.dev/components/card/overview',
    groupName: '布局组件',
    keywords: 'card-actions,卡片操作',
    tags: 'card-actions,卡片,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('操作区', '通常放置 MatButton 操作按钮'),
  }),
  componentEntry({
    component: 'MatToolbar',
    nameZh: '工具栏',
    icon: 'toolbar',
    description: '页面顶部工具栏容器，常用于标题栏',
    docUrl: 'https://material.angular.dev/components/toolbar/overview',
    groupName: '布局组件',
    keywords: 'toolbar,工具栏',
    tags: 'toolbar,工具栏,布局',
    isContainer: true,
    isLayout: true,
    properties: [
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
    ],
    slots: defaultSlot('工具栏内容', '工具栏内容，如标题文本或按钮'),
  }),
  componentEntry({
    component: 'MatList',
    nameZh: '列表',
    icon: 'list',
    description: 'Material Design 列表容器',
    docUrl: 'https://material.angular.dev/components/list/overview',
    groupName: '布局组件',
    keywords: 'list,列表',
    tags: 'list,列表,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('列表内容', '放置多个 MatListItem 列表项'),
  }),
  componentEntry({
    component: 'MatListItem',
    nameZh: '列表项',
    icon: 'list-item',
    description: '列表项，需放置在 MatList 内',
    docUrl: 'https://material.angular.dev/components/list/overview',
    groupName: '布局组件',
    keywords: 'list-item,列表项',
    tags: 'list-item,列表,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('列表项内容', '列表项文本或内容'),
  }),
  componentEntry({
    component: 'MatExpansionPanel',
    nameZh: '手风琴面板',
    icon: 'expansion-panel',
    description: '可展开/折叠的内容面板，常用于详情展示',
    docUrl: 'https://material.angular.dev/components/expansion/overview',
    groupName: '布局组件',
    keywords: 'expansion,手风琴,折叠面板',
    tags: 'expansion-panel,手风琴,布局',
    isContainer: true,
    properties: [
      boolProp('expanded', '展开', '是否展开', { defaultValue: false }),
      boolProp('disabled', '禁用', '是否禁用'),
      boolProp('hideToggle', '隐藏箭头', '是否隐藏展开箭头'),
    ],
    events: {
      opened: event('展开事件', '面板展开时触发'),
      closed: event('折叠事件', '面板折叠时触发'),
    },
    slots: defaultSlot('面板内容', '面板展开后的内容'),
  }),
  componentEntry({
    component: 'MatExpansionPanelHeader',
    nameZh: '手风琴面板头部',
    icon: 'expansion-panel-header',
    description: '手风琴面板的头部，可点击展开/折叠',
    docUrl: 'https://material.angular.dev/components/expansion/overview',
    groupName: '布局组件',
    keywords: 'expansion-header,手风琴头部',
    tags: 'expansion-panel-header,手风琴,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('头部内容', '通常放置 MatExpansionPanelTitle 标题'),
  }),
  componentEntry({
    component: 'MatExpansionPanelTitle',
    nameZh: '手风琴面板标题',
    icon: 'expansion-panel-title',
    description: '手风琴面板的标题文本',
    docUrl: 'https://material.angular.dev/components/expansion/overview',
    groupName: '布局组件',
    keywords: 'expansion-title,手风琴标题',
    tags: 'expansion-panel-title,手风琴,布局',
    isContainer: true,
    properties: [],
    slots: defaultSlot('标题内容', '标题文本'),
  }),

  // ============ 导航组件 ============
  componentEntry({
    component: 'MatTabs',
    nameZh: '标签页',
    icon: 'tabs',
    description: 'Material Design 标签页容器，用于切换不同内容区域',
    docUrl: 'https://material.angular.dev/components/tabs/overview',
    groupName: '导航组件',
    keywords: 'tabs,标签页',
    tags: 'tabs,标签页,导航',
    isContainer: true,
    isLayout: true,
    properties: [
      numProp('selectedIndex', '选中索引', '当前激活的标签索引（从 0 开始）', { defaultValue: 0 }),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
      boolProp('dynamicHeight', '动态高度', '是否随内容自动调整高度'),
      boolProp('stretchTabs', '拉伸标签', '是否拉伸标签填满头部'),
    ],
    events: {
      selectedIndexChange: event('选中索引变化', '选中标签索引变化时触发', [param('index', 'number', '当前索引')]),
      selectedTabChange: event('标签切换', '选中标签变化时触发', [param('event', 'MatTabChangeEvent', '标签切换事件对象')]),
    },
    slots: defaultSlot('标签页内容', '放置多个 MatTab 标签页'),
  }),
  componentEntry({
    component: 'MatTab',
    nameZh: '标签页项',
    icon: 'tab',
    description: '单个标签页，需放置在 MatTabs 内',
    docUrl: 'https://material.angular.dev/components/tabs/overview',
    groupName: '导航组件',
    keywords: 'tab,标签页项',
    tags: 'tab,标签页,导航',
    isContainer: true,
    properties: [
      strProp('label', '标签文本', '标签页标题文本'),
      boolProp('disabled', '禁用', '是否禁用该标签'),
    ],
    slots: defaultSlot('标签页内容', '该标签页的内容'),
  }),

  // ============ 数据展示 ============
  componentEntry({
    component: 'MatPaginator',
    nameZh: '分页器',
    icon: 'pagination',
    description: 'Material Design 分页器，通常配合表格使用',
    docUrl: 'https://material.angular.dev/components/paginator/overview',
    groupName: '数据展示',
    keywords: 'paginator,分页',
    tags: 'paginator,分页,数据',
    properties: [
      numProp('length', '总数', '数据总条数', { defaultValue: 0 }),
      numProp('pageSize', '每页条数', '每页显示条数', { defaultValue: 10 }),
      numProp('pageIndex', '当前页码', '当前页码（从 0 开始）', { defaultValue: 0 }),
      arrayProp('pageSizeOptions', '每页条数选项', '可选的每页条数，如 [10, 20, 50]', { defaultValue: [10, 20, 50] }),
      boolProp('hidePageSize', '隐藏每页条数', '是否隐藏每页条数选择器'),
      boolProp('showFirstLastButtons', '首尾按钮', '是否显示跳转首页/末页按钮'),
      boolProp('disabled', '禁用', '是否禁用'),
    ],
    events: {
      page: event('翻页事件', '翻页时触发', [param('event', 'PageEvent', '分页事件对象')]),
    },
  }),

  // ============ 反馈组件 ============
  componentEntry({
    component: 'MatProgressSpinner',
    nameZh: '加载圈',
    icon: 'progress-spinner',
    description: '圆形加载指示器',
    docUrl: 'https://material.angular.dev/components/progress-spinner/overview',
    groupName: '反馈组件',
    keywords: 'spinner,加载',
    tags: 'progress-spinner,加载,反馈',
    properties: [
      selectProp('mode', '模式', '加载模式：determinate、indeterminate', ['determinate', 'indeterminate'], { defaultValue: 'indeterminate' }),
      numProp('value', '进度值', 'determinate 模式下的进度值（0-100）', { defaultValue: 0 }),
      numProp('diameter', '直径', '加载圈直径（像素）', { defaultValue: 100 }),
      numProp('strokeWidth', '线宽', '圆环线宽（像素）', { defaultValue: 5 }),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
    ],
  }),
  componentEntry({
    component: 'MatProgressBar',
    nameZh: '进度条',
    icon: 'progress-bar',
    description: '水平进度条',
    docUrl: 'https://material.angular.dev/components/progress-bar/overview',
    groupName: '反馈组件',
    keywords: 'progress,进度条',
    tags: 'progress-bar,进度条,反馈',
    properties: [
      selectProp('mode', '模式', '进度模式：determinate、indeterminate、buffer、query', ['determinate', 'indeterminate', 'buffer', 'query'], { defaultValue: 'indeterminate' }),
      numProp('value', '进度值', '当前进度值（0-100）', { defaultValue: 0 }),
      numProp('bufferValue', '缓冲值', 'buffer 模式下的缓冲值'),
      selectProp('color', '颜色', '主题色：primary、accent、warn', colorOptions, { defaultValue: 'primary' }),
    ],
  }),
];

const snippets = [
  {
    group: 'basic',
    label: { zh_CN: '基础组件' },
    children: [
      {
        name: { zh_CN: '按钮' },
        icon: 'button',
        screenshot: '',
        snippetName: 'MatButton',
        schema: {
          componentName: 'MatButton',
          props: { appearance: 'filled', color: 'primary' },
          children: '按钮',
        },
      },
      {
        name: { zh_CN: '图标按钮' },
        icon: 'button',
        screenshot: '',
        snippetName: 'MatIconButton',
        schema: {
          componentName: 'MatIconButton',
          children: [
            {
              componentName: 'MatIcon',
              props: { matBadge: '4', matBadgeColor: 'warn' },
              directives: [{ directiveName: 'matBadge' }],
              children: 'notifications',
            },
          ],
        },
      },
      {
        name: { zh_CN: '图标' },
        icon: 'icon',
        screenshot: '',
        snippetName: 'MatIcon',
        schema: {
          componentName: 'MatIcon',
          props: { fontIcon: 'home' },
        },
      },
      {
        name: { zh_CN: '分割线' },
        icon: 'divider',
        screenshot: '',
        snippetName: 'MatDivider',
        schema: {
          componentName: 'MatDivider',
          props: {},
        },
      },
    ],
  },
  {
    group: 'form',
    label: { zh_CN: '表单组件' },
    children: [
      {
        name: { zh_CN: '输入框' },
        icon: 'input',
        screenshot: '',
        snippetName: 'MatFormFieldInput',
        schema: {
          componentName: 'MatFormField',
          props: { appearance: 'outline' },
          children: [
            { componentName: 'MatLabel', props: {}, children: '姓名' },
            {
              componentName: 'input',
              props: {
                matInput: true,
                placeholder: '请输入姓名',
                ngModel: { type: 'JSExpression', model: true, value: 'this.state.name' },
              },
              directives: [{ directiveName: 'ngModel' }, { directiveName: 'matInput' }],
            },
          ],
        },
      },
      {
        name: { zh_CN: '下拉选择器' },
        icon: 'select',
        screenshot: '',
        snippetName: 'MatSelect',
        schema: {
          componentName: 'MatFormField',
          props: { appearance: 'outline' },
          children: [
            {
              componentName: 'MatSelect',
              props: {
                placeholder: '请选择',
                ngModel: { type: 'JSExpression', model: true, value: 'this.state.department' },
              },
              directives: [{ directiveName: 'ngModel' }],
              children: [
                { componentName: 'MatOption', props: { value: '1' }, children: '选项1' },
                { componentName: 'MatOption', props: { value: '2' }, children: '选项2' },
              ],
            },
          ],
        },
      },
      {
        name: { zh_CN: '复选框' },
        icon: 'checkbox',
        screenshot: '',
        snippetName: 'MatCheckbox',
        schema: {
          componentName: 'MatCheckbox',
          props: {
            ngModel: { type: 'JSExpression', model: true, value: 'this.state.checked' },
            color: 'primary',
          },
          directives: [{ directiveName: 'ngModel' }],
          children: '同意协议',
        },
      },
      {
        name: { zh_CN: '开关' },
        icon: 'switch',
        screenshot: '',
        snippetName: 'MatSlideToggle',
        schema: {
          componentName: 'MatSlideToggle',
          props: {
            ngModel: { type: 'JSExpression', model: true, value: 'this.state.enabled' },
          },
          directives: [{ directiveName: 'ngModel' }],
          children: '启用',
        },
      },
      {
        name: { zh_CN: '滑块' },
        icon: 'slider',
        screenshot: '',
        snippetName: 'MatSlider',
        schema: {
          componentName: 'div',
          children: [
            {
              componentName: 'div',
              props: {
                style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;',
              },
              children: [
                { componentName: 'label', children: 'Value' },
                {
                  componentName: 'Text',
                  props: {
                    text: {
                      type: 'JSExpression',
                      value: 'this.refs.slider != null ? this.refs.slider.value : this.state.sliderValue',
                    },
                  },
                },
              ],
            },
            {
              componentName: 'MatSlider',
              props: {
                min: 0,
                max: 100,
                step: 1,
                discrete: true,
                showTickMarks: true,
              },
              children: [
                {
                  componentName: 'input',
                  props: {
                    matSliderThumb: true,
                    ref: { type: 'JSExpression', value: 'this.refs.slider' },
                    refName: 'slider',
                    ngModel: { type: 'JSExpression', model: true, value: 'this.state.sliderValue' },
                  },
                },
              ],
            },
          ],
        },
      },
      {
        name: { zh_CN: '单选框组' },
        icon: 'radio-group',
        screenshot: '',
        snippetName: 'MatRadioGroup',
        schema: {
          componentName: 'MatRadioGroup',
          props: {
            ngModel: { type: 'JSExpression', model: true, value: 'this.state.sex' },
          },
          directives: [{ directiveName: 'ngModel' }],
          children: [
            { componentName: 'MatRadioButton', props: { value: '男' }, children: '男' },
            { componentName: 'MatRadioButton', props: { value: '女' }, children: '女' },
          ],
        },
      },
      {
        name: { zh_CN: '按钮开关组' },
        icon: 'button-toggle-group',
        screenshot: '',
        snippetName: 'MatButtonToggleGroup',
        schema: {
          componentName: 'MatButtonToggleGroup',
          props: {
            ngModel: { type: 'JSExpression', model: true, value: 'this.state.view' },
          },
          directives: [{ directiveName: 'ngModel' }],
          children: [
            { componentName: 'MatButtonToggle', props: { value: 'list' }, children: '列表' },
            { componentName: 'MatButtonToggle', props: { value: 'grid' }, children: '网格' },
          ],
        },
      },
    ],
  },
  {
    group: 'layout',
    label: { zh_CN: '布局组件' },
    children: [
      {
        name: { zh_CN: '卡片' },
        icon: 'card',
        screenshot: '',
        snippetName: 'MatCard',
        schema: {
          componentName: 'MatCard',
          props: { appearance: 'outlined' },
          children: [
            {
              componentName: 'MatCardHeader',
              props: {},
              children: [
                { componentName: 'MatCardTitle', props: {}, children: '卡片标题' },
                { componentName: 'MatCardSubtitle', props: {}, children: '卡片副标题' },
              ],
            },
            {
              componentName: 'MatCardContent',
              props: {},
              children: [{ componentName: 'Text', props: { text: '卡片内容' } }],
            },
          ],
        },
      },
      {
        name: { zh_CN: '列表' },
        icon: 'list',
        screenshot: '',
        snippetName: 'MatList',
        schema: {
          componentName: 'MatList',
          props: {},
          children: [
            { componentName: 'MatListItem', props: {}, children: '列表项1' },
            { componentName: 'MatListItem', props: {}, children: '列表项2' },
          ],
        },
      },
      {
        name: { zh_CN: '手风琴面板' },
        icon: 'expansion-panel',
        screenshot: '',
        snippetName: 'MatExpansionPanel',
        schema: {
          componentName: 'MatExpansionPanel',
          props: { expanded: false },
          children: [
            {
              componentName: 'MatExpansionPanelHeader',
              props: {},
              children: [
                { componentName: 'MatExpansionPanelTitle', props: {}, children: '面板标题' },
              ],
            },
            { componentName: 'Text', props: { text: '面板内容' } },
          ],
        },
      },
    ],
  },
  {
    group: 'navigation',
    label: { zh_CN: '导航组件' },
    children: [
      {
        name: { zh_CN: '标签页' },
        icon: 'tabs',
        screenshot: '',
        snippetName: 'MatTabs',
        schema: {
          componentName: 'MatTabs',
          props: { selectedIndex: 0 },
          children: [
            {
              componentName: 'MatTab',
              props: { label: '标签页1' },
              children: [{ componentName: 'Text', props: { text: '第一个标签页内容' } }],
            },
            {
              componentName: 'MatTab',
              props: { label: '标签页2' },
              children: [{ componentName: 'Text', props: { text: '第二个标签页内容' } }],
            },
          ],
        },
      },
    ],
  },
  {
    group: 'data-display',
    label: { zh_CN: '数据展示' },
    children: [
      {
        name: { zh_CN: '分页器' },
        icon: 'pagination',
        screenshot: '',
        snippetName: 'MatPaginator',
        schema: {
          componentName: 'MatPaginator',
          props: {
            length: 100,
            pageSize: 10,
            pageSizeOptions: [10, 20, 50],
          },
        },
      },
      {
        name: { zh_CN: '加载圈' },
        icon: 'progress-spinner',
        screenshot: '',
        snippetName: 'MatProgressSpinner',
        schema: {
          componentName: 'MatProgressSpinner',
          props: { mode: 'indeterminate', diameter: 48 },
        },
      },
      {
        name: { zh_CN: '进度条' },
        icon: 'progress-bar',
        screenshot: '',
        snippetName: 'MatProgressBar',
        schema: {
          componentName: 'MatProgressBar',
          props: { mode: 'determinate', value: 60 },
        },
      },
    ],
  },
];

const bundle = {
  data: {
    framework: 'Angular',
    materials: {
      components,
      packages: [
        {
          name: '@angular/material',
          package: '@angular/material',
          version: VERSION,
          destructuring: false,
          script: '',
          css: '',
        },
      ],
      snippets,
      blocks: [],
    },
  },
};

writeFileSync(OUT, JSON.stringify(bundle, null, 2) + '\n');
console.log(`bundle.json generated: ${components.length} components, ${snippets.reduce((n, g) => n + g.children.length, 0)} snippets -> ${OUT}`);
