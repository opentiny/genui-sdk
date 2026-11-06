import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import isNil from 'lodash/isNil';
import get from 'lodash/get';
import dayjs from 'dayjs';

import { EventBus } from './event-bus';
import { formatDate, formatMoney } from './format';

/**
 * 页面可用的工具注册表，分为两类：
 * - 外部引入：npm 包（如 lodash）安装为依赖后直接导出
 * - JSFunction 类型：物料包内联实现的工具（函数 / 类）
 *
 * 运行时由渲染器统一注入页面上下文，在 JSFunction / JSExpression 中通过 `this.utils.xxx` 调用，
 * schema 中无需声明 utils 字段。
 */
export const utils: Record<string, unknown> = {
  // 外部引入：npm 包安装为依赖后直接导出（lodash 按需引入，避免整库打包）
  cloneDeep,
  debounce,
  throttle,
  isNil,
  get,
  // 外部整库导入：Day.js 日期时间库（依赖示例）
  dayjs,
  // JSFunction 类型：物料包内联实现
  formatDate,
  formatMoney,
  EventBus,
};
