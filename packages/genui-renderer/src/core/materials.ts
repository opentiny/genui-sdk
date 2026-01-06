// Bundle.json 类型定义

// 基础类型
export interface II18nText {
  zh_CN: string;
  [key: string]: string;
}

export interface ILabel {
  text: II18nText;
}

export interface IDescription {
  zh_CN: string;
  [key: string]: string;
}

// 组件配置相关类型
export interface INpmConfig {
  package: string;
  exportName: string;
  destructuring: boolean;
}

export interface INestingRule {
  childWhitelist: string;
  parentWhitelist: string;
  descendantBlacklist: string;
  ancestorWhitelist: string;
}

export interface IShortcuts {
  properties: string[];
}

export interface IContextMenu {
  actions: string[];
  disable: string[];
}

export interface IConfigure {
  loop: boolean;
  condition: boolean;
  styles: boolean;
  isContainer: boolean;
  isModal: boolean;
  isPopper: boolean;
  nestingRule: INestingRule;
  isNullNode: boolean;
  isLayout: boolean;
  rootSelector: string;
  shortcuts: IShortcuts;
  contextMenu: IContextMenu;
  invalidity: string[];
  clickCapture: boolean;
  framework: string;
}

// 属性配置相关类型
export interface IWidgetProps {
  [key: string]: any;
}

export interface IWidget {
  component: string;
  props: IWidgetProps;
}

export interface IPropertyContent {
  property: string;
  label: ILabel;
  description: IDescription;
  required: boolean;
  readOnly: boolean;
  disabled: boolean;
  cols: number;
  labelPosition: string;
  type: string;
  widget: IWidget;
  defaultValue?: any;
  device?: string[];
}

export interface IPropertyGroup {
  name: string;
  label: II18nText;
  content: IPropertyContent[];
  description: II18nText;
}

// 事件相关类型
export interface IFunctionParam {
  name: string;
  type: string;
  defaultValue: string;
  description: II18nText;
}

export interface IFunctionInfo {
  params: IFunctionParam[];
  returns: Record<string, any>;
}

export interface IEventConfig {
  label: II18nText;
  description: II18nText;
  type?: string;
  functionInfo?: IFunctionInfo;
  defaultValue?: string;
}

// 插槽相关类型
export interface ISlotConfig {
  label: II18nText;
  description: II18nText;
}

// Schema 相关类型
export interface IComponentSchema {
  properties?: IPropertyGroup[];
  events?: Record<string, IEventConfig>;
  slots?: Record<string, ISlotConfig>;
}

// 组件定义
export interface IComponent {
  id?: number;
  version?: string;
  name?: II18nText;
  component?: string;
  icon?: string;
  description?: string;
  doc_url?: string;
  screenshot?: string;
  tags?: string;
  keywords?: string;
  dev_mode?: string;
  npm?: INpmConfig;
  group?: string;
  category?: string;
  configure?: IConfigure;
  schema?: IComponentSchema;
}

// 包配置
export interface IPackage {
  name: string;
  package: string;
  version: string;
  destructuring: boolean;
  script: string;
  css: string;
}

// 模板相关类型
export interface ITemplate {
  name: II18nText;
  icon: string;
  screenshot: string;
  snippetName: string;
  schema: {
    props: Record<string, any>;
  };
}

export interface ISnippetGroup {
  group?: string;
  label?: II18nText;
  children?: ISnippet[];
}

export interface ISnippet {
  name?: II18nText;
  icon?: string;
  screenshot?: string;
  snippetName: string;
  schema: IComponentSchema;
}

export type IBlock = any;

export interface IMaterials {
  data: {
    framework: 'Vue' | 'React' | 'Angular' | 'Vanilla';
    materials: {
      components?: IComponent[];
      packages?: IPackage[];
      snippets?: Array<ISnippetGroup | ISnippet>;
      blocks?: IBlock[];
    };
  };
}
