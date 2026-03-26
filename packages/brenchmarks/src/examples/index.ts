import type { LlmBenchmarkExample } from '../framework/index';

export const coreLlmBenchmarkExamples: LlmBenchmarkExample[] = [
  {
    id: 'simple-form',
    prompt: '生成一个用户信息表单，包含姓名、手机号、邮箱、提交按钮。输出必须是 schemaJson 代码块。',
  },
  {
    id: 'dashboard-card',
    prompt: '生成一个仪表盘卡片，包含指标总览、趋势区域和一个最近活动列表。输出必须是 schemaJson 代码块。',
  },
  {
    id: 'table-and-filter',
    prompt: '生成一个带筛选栏和表格的页面，支持按状态筛选和分页。输出必须是 schemaJson 代码块。',
  },
  {
    id: 'settings-page',
    prompt: '生成一个系统设置页面，包含主题切换、通知设置和保存按钮。输出必须是 schemaJson 代码块。',
  },
  {
    id: 'order-detail',
    prompt: '生成一个订单详情页面，包含订单基础信息、商品列表、金额汇总和操作按钮。输出必须是 schemaJson 代码块。',
  },
];
