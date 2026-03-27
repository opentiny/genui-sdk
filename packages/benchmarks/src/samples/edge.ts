import type { LlmBenchmarkSampleCase } from '../framework/index';

/**
 * 边界场景：空态、异常、极端输入与回退处理。
 */
export const edgeLlmBenchmarkSampleCases: LlmBenchmarkSampleCase[] = [
  {
    id: 'empty-state-table',
    prompt: '生成一个数据列表页面，默认无数据，展示空态提示与“新建数据”按钮。',
  },
  {
    id: 'long-content-card',
    prompt: '生成一个详情卡片，包含超长文本描述，支持折叠/展开并保留布局稳定。',
  },
  {
    id: 'error-retry-panel',
    prompt: '生成一个请求失败态面板，包含错误说明、重试按钮和联系客服入口。',
  },
];
