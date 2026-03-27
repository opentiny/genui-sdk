import type { LlmBenchmarkSampleCase } from '../framework/index';

/**
 * 约束场景：显式业务/技术约束下的生成能力。
 */
export const constraintLlmBenchmarkSampleCases: LlmBenchmarkSampleCase[] = [
  {
    id: 'form-validation',
    prompt: '生成一个带表单校验的注册页面，姓名必填、手机号需符合格式、邮箱需符合格式，错误信息需就近展示。',
  },
  {
    id: 'permission-ui',
    prompt: '生成一个用户管理页面，区分管理员和访客权限：管理员可新增/删除，访客仅可查看。',
  },
  {
    id: 'mobile-priority-page',
    prompt: '生成一个移动端优先页面：小屏幕单列布局，大屏幕双列布局，按钮区在移动端固定底部。',
  },
];
