import { z } from 'zod';

export type JSExpression = { type: 'JSExpression'; value: string; model?: boolean };

export type JSFunction = { type: 'JSFunction'; value: string; params?: string[] };

export type Methods = Record<string, JSFunction>;

export interface Node {
  id: string;
  componentName: string;
  props: Record<string, any> & { columns?: { slots?: Record<string, any> }[] };
  children?: Node[];
  componentType?: 'Block' | 'PageStart' | 'PageSection';
  slot?: string | Record<string, any>;
  params?: string[];
  loop?: Record<string, any>;
  loopArgs?: string[];
  condition?: boolean | Record<string, any>;
}

export type RootNode = Omit<Node, 'id'> & {
  id?: string;
  css?: string;
  fileName?: string;
  methods?: Methods;
  state?: Record<string, unknown>;
  lifeCycles?: Record<string, unknown>;
  children?: Node[];
  dataSource?: any;
  bridge?: any;
  inputs?: any[];
  outputs?: any[];
  schema?: any;
};

export const jsExpressionSchema = z
  .object({
    type: z.literal('JSExpression'),
    value: z.string().describe('表达式字符串内容'),
    model: z.boolean().optional().describe('是否为双向绑定模型值'),
  })
  .describe('JS 表达式包装');

export const jsFunctionSchema = z
  .object({
    type: z.literal('JSFunction').describe('固定为 JSFunction'),
    value: z.string().describe('函数体字符串（可序列化）'),
    params: z.array(z.string()).optional().describe('函数参数名列表'),
  })
  .describe('JS 函数包装');

export const jsSlotSchema = z
  .object({
    type: z.literal('JSSlot').describe('固定为 JSSlot'),
    value: z.union([z.string(), z.record(z.string(), z.any())]).describe('插槽内容，可为字符串或对象'),
  })
  .describe('插槽包装');

export const methodsSchema = z
  .record(z.string().describe('方法名'), jsFunctionSchema)
  .describe('方法集合') as z.ZodType<Methods>;

// recursive prop value schema to support primitives, expressions, functions, arrays and objects
const propValueSchema: z.ZodType<any> = z.lazy(() =>
  z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      jsExpressionSchema,
      jsFunctionSchema,
      jsSlotSchema,
      z.array(propValueSchema),
      z.record(z.string(), propValueSchema),
    ])
    .describe('通用属性值：原始值、JSExpression、JSFunction、JSSlot、数组、对象'),
);

export const genRootSchema = /* @__PURE__ */ (componentWhiteList?: string[]) => {
  const nodeSchema = genNodeSchema(componentWhiteList);
  const rootNodeSchema = z
    .object({
      id: z.string().optional().describe('根节点可选 id'),
      methods: methodsSchema.optional().describe('方法集合'),
      state: z.record(z.string(), propValueSchema).optional().describe('全局状态，表单双向绑定必须此字段'),
      componentName: z.string().describe('根组件名，通常为 Page'),
      props: z.record(z.string(), propValueSchema).describe('根组件属性集合'),
      children: z
        .array(z.lazy(() => nodeSchema))
        .optional()
        .describe('根子节点数组'),
      componentType: z.enum(['Block', 'PageStart', 'PageSection']).optional().describe('根节点类型'),
      slot: z
        .union([z.string(), jsSlotSchema, z.record(z.string(), propValueSchema)])
        .optional()
        .describe('根插槽内容'),
      params: z.array(z.string()).optional().describe('根参数名列表'),
      loop: z.record(z.string(), propValueSchema).optional().describe('根循环渲染配置'),
      loopArgs: z.array(z.string()).optional().describe('根循环参数名列表'),
      condition: z
        .union([z.boolean(), z.record(z.string(), propValueSchema)])
        .optional()
        .describe('根条件渲染配置'),
      css: z.string().optional().describe('全局 CSS 样式字符串'),
      fileName: z.string().optional().describe('文件名'),
      lifeCycles: z.record(z.string(), propValueSchema).optional().describe('生命周期配置'),
      dataSource: z.any().optional().describe('数据源配置'),
      bridge: z.any().optional().describe('桥接依赖/运行时注入'),
      inputs: z.array(z.any()).optional().describe('输入事件/参数'),
      outputs: z.array(z.any()).optional().describe('输出事件/参数'),
      schema: z.any().optional().describe('内嵌或外部 Schema'),
    })
    .describe('根节点') as z.ZodType<RootNode>;
  return rootNodeSchema;
};

export const genNodeSchema = /* @__PURE__ */ (componentWhiteList?: string[]) => {
  const componentNameSchema =
    (componentWhiteList?.length as number) > 0
      ? z.enum(componentWhiteList as Parameters<typeof z.enum>[0]).describe('组件名（白名单内）')
      : z.string().describe('组件名');
  const nodeSchema = z
    .object({
      id: z.string().describe('节点唯一标识'),
      componentName: componentNameSchema,
      props: z.record(z.string(), propValueSchema).describe('组件属性集合'),
      children: z
        .union([
          z.array(z.lazy(() => nodeSchema)),
          z.string(),
        ])
        .optional()
        .describe('子节点数组或字符串'),
      componentType: z.enum(['Block', 'PageStart', 'PageSection']).optional().describe('节点类型'),
      slot: z
        .union([z.string(), jsSlotSchema, z.record(z.string(), propValueSchema)])
        .optional()
        .describe('插槽内容'),
      params: z.array(z.string()).optional().describe('参数名列表'),
      loop: z.record(z.string(), propValueSchema).optional().describe('循环渲染配置'),
      loopArgs: z.array(z.string()).optional().describe('循环参数名列表'),
      condition: z
        .union([z.boolean(), z.record(z.string(), propValueSchema)])
        .optional()
        .describe('条件渲染配置'),
    })
    .describe('普通节点') as z.ZodType<Node>;
  return nodeSchema;
};

export const cardSchema = genRootSchema();

export const nodeSchema = genNodeSchema();

export type NodeSchema = z.infer<typeof nodeSchema>;

export type CardSchema = z.infer<typeof cardSchema>;

/**
 * 
 组件协议结构规范
字段	说明	类型
name	组件名称，已 i18n 形式配置	Object
component	组件名	String
icon	组件图标	String
screenshot	快照	String
description	组件介绍描述	String
npm	组件 NPM 包信息，会根据此描述引入 npm 源组件	Object
npm.package	npm 包名	
npm.exportName	需要从 npm 包中 import 的 名称	
npm.version	package 的版本	
npm.destructuring	是否以结构方式 import	
npm.script	ESModule格式的JS文件CDN地址	String
npm.css	样式文件CDN地址	String
group	组件分组	String
schema	组件元数据(定义属性、事件等)	Object
configure	组件的属性信息	Object
version	组件版本	Object
组件元数据结构规范
组件元数据规范用于描述组件的对外 API：属性、事件等，对应组件的 schema字段


 */
export const materialSchema = z
  .object({
    name: z
      .object({
        zh_CN: z.string().describe('组件中文名（i18n）'),
      })
      .describe('组件名称（多语言）'),
    component: z.string().describe('组件名'),
    icon: z.string().describe('组件图标'),
    screenshot: z.string().describe('组件快照'),
    description: z.string().describe('组件描述'),
    npm: z
      .object({
        package: z.string().describe('npm 包名'),
        exportName: z.string().describe('从包中 import 的导出名'),
        version: z.string().describe('包版本'),
        destructuring: z.boolean().describe('是否解构 import'),
        script: z.string().describe('ESM JS 文件 CDN 地址'),
        css: z.string().describe('样式文件 CDN 地址'),
      })
      .describe('npm 引入信息'),
    group: z.string().describe('组件分组'),
    category: z.string().describe('组件分类'),
    configure: z
      .object({
        loop: z.boolean().describe('是否支持循环渲染'),
        condition: z.boolean().describe('是否支持条件渲染'),
        styles: z.boolean().describe('是否支持样式配置'),
        isContainer: z.boolean().describe('是否容器组件'),
        isModal: z.boolean().describe('是否模态组件'),
        isPopper: z.boolean().describe('是否气泡/悬浮类组件'),
      })
      .describe('可视化搭建相关的能力配置'),
  })
  .describe('组件物料协议');
