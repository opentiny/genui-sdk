import type { LlmBenchmarkSampleCase } from '../framework/index';

/**
 * 复杂场景：多模块联动、状态切换与交互组合。
 */
export const complexLlmBenchmarkSampleCases: LlmBenchmarkSampleCase[] = [
  {
    id: 'wizard-form',
    prompt: '生成一个三步向导表单：基础信息、地址信息、确认提交。每一步包含上一步/下一步，最后一步展示汇总并提交。',
  },
  {
    id: 'editable-table',
    prompt: '生成一个支持行内编辑的用户列表，支持编辑、保存、取消，并展示操作结果提示。',
  },
  {
    id: 'master-detail',
    prompt: '生成一个主从布局页面，左侧为订单列表，右侧显示选中订单详情，支持切换后同步更新详情。',
  },
  {
    id: 'chart-dashboard-combo',
    prompt: '生成一个仪表盘页面，包含筛选栏、3个指标卡、折线图和表格，筛选条件变化时联动更新图表和表格。',
  },
];
