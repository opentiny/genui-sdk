import type { LlmBenchmarkSampleCase } from '../framework/index';

/**
 * 基础场景：常规页面生成能力。
 */
export const basicLlmBenchmarkSampleCases: LlmBenchmarkSampleCase[] = [
  {
    id: 'simple-form',
    messages: [{ role: 'user', content: '生成一个用户信息表单，包含姓名、手机号、邮箱、提交按钮。' }],
  },
  {
    id: 'dashboard-card',
    messages: [{ role: 'user', content: '生成一个仪表盘卡片，包含指标总览、趋势区域和一个最近活动列表。' }],
  },
  {
    id: 'table-and-filter',
    messages: [{ role: 'user', content: '生成一个带筛选栏和表格的页面，支持按状态筛选和分页。' }],
  },
  {
    id: 'settings-page',
    messages: [{ role: 'user', content: '生成一个系统设置页面，包含主题切换、通知设置和保存按钮。' }],
  },
  {
    id: 'order-detail',
    messages: [{ role: 'user', content: '生成一个订单详情页面，包含订单基础信息、商品列表、金额汇总和操作按钮。' }],
  },
  {
    id: 'responsive-form',
    messages: [{ role: 'user', content: '生成一个响应式表单，包含姓名、手机号、邮箱、提交按钮。' }],
  },
];
