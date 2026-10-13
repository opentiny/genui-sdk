import type { IMaterialsMeta, IExample, IMaterialsProtocol, IUtilsMeta } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import builtinJson from './materials/builtin.json' with { type: 'json' };
import chartJson from './materials/chart.json' with { type: 'json' };
import extendJson from './materials/extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList, plusWhiteList } from './white-list';

// TODO: 优化物料协议后，删除 as IMaterialsProtocol[]
const baseMetaMaterials = [bundleJson, builtinJson, extendJson] as IMaterialsProtocol[];

const standardMetaMaterials = [chartJson, ...baseMetaMaterials] as IMaterialsProtocol[];

const STANDARD_RULES = [
  '禁止设置饼图的 `settings.radius`',
];

/** 页面可用的工具说明：无需在 schema 中声明 utils，直接在 JSFunction / JSExpression 中使用 this.utils.xxx */
const utilsMeta: IUtilsMeta[] = [
  {
    name: 'formatDate',
    description: '格式化日期时间，支持 YYYY、MM、DD、HH、mm、ss 占位符',
    typeSchema: '(date: Date | number | string, format?: string) => string',
    usage: "this.utils.formatDate(Date.now(), 'YYYY-MM-DD HH:mm')",
  },
  {
    name: 'dayjs',
    description: 'Day.js 日期时间库（外部依赖导入示例），工厂函数，返回 Dayjs 对象，支持 add / subtract / format / startOf / endOf / isBefore 等链式方法',
    typeSchema: '(value?: string | number | Date) => Dayjs',
    usage: "const d = this.utils.dayjs('2026-09-21'); d.add(1, 'day').format('YYYY-MM-DD')",
  },
  {
    name: 'formatMoney',
    description: '格式化金额：千分位分隔 + 固定小数位',
    typeSchema: '(value: number | string, digits?: number) => string',
    usage: 'this.utils.formatMoney(12345.678, 2)',
  },
  {
    name: 'cloneDeep',
    description: '深拷贝一个对象或数组，返回与原值同类型的新副本',
    typeSchema: '<T>(value: T) => T',
    usage: 'this.utils.cloneDeep(obj)',
  },
  {
    name: 'debounce',
    description: '防抖：延迟 wait 毫秒后执行，多次调用只执行最后一次，返回带 cancel / flush 方法的防抖函数',
    typeSchema: '<T extends (...args: any[]) => any>(func: T, wait?: number) => T',
    usage: 'const fn = this.utils.debounce(() => { ... }, 300); fn.cancel()',
  },
  {
    name: 'throttle',
    description: '节流：wait 毫秒内最多执行一次',
    typeSchema: '<T extends (...args: any[]) => any>(func: T, wait?: number) => T',
    usage: 'this.utils.throttle(() => { ... }, 300)',
  },
  {
    name: 'isNil',
    description: '判断值是否为 null 或 undefined',
    typeSchema: '(value: unknown) => boolean',
    usage: 'this.utils.isNil(v)',
  },
  {
    name: 'get',
    description: '按路径安全读取对象属性，取不到时返回默认值',
    typeSchema: '(object: object, path: string | string[], defaultValue?: any) => any',
    usage: "this.utils.get(obj, 'a.b', 0)",
  },
  {
    name: 'EventBus',
    description: '事件总线类，用于页面内组件间通信，可通过 new this.utils.EventBus() 实例化',
    typeSchema:
      'class EventBus {\n  on(event: string, handler: (...args: unknown[]) => void): () => void;\n  emit(event: string, ...args: unknown[]): void;\n  off(event: string, handler: (...args: unknown[]) => void): void;\n}',
    usage: "const bus = new this.utils.EventBus(); bus.on('refresh', () => {}); bus.emit('refresh');",
  },
];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: standardMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs', 'utils']),
  rules: STANDARD_RULES,
  utils: utilsMeta,
};

export const miniMaterialsMeta: IMaterialsMeta = {
  materials: baseMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid', 'utils']),
  rules: [],
  utils: utilsMeta,
};

export const plusMaterialsMeta: IMaterialsMeta = {
  materials: standardMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: plusWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs', 'utils']),
  rules: STANDARD_RULES,
  utils: utilsMeta,
};
