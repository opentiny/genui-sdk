import type { IExample } from '@opentiny/genui-sdk-core';
import mobileFormSchema from './examples/mobile-form.json' with { type: 'json' };
import mobileProfileSchema from './examples/mobile-profile.json' with { type: 'json' };
import mobileListSchema from './examples/mobile-list.json' with { type: 'json' };
import mobileActionSheetSchema from './examples/mobile-action-sheet.json' with { type: 'json' };

export const examples = [
  { id: 'mobile-form', name: '移动端表单', schema: mobileFormSchema },
  { id: 'mobile-profile', name: '个人信息页', schema: mobileProfileSchema },
  { id: 'mobile-list', name: '下拉刷新与滚动加载列表', schema: mobileListSchema },
  { id: 'mobile-action-sheet', name: '操作面板与确认弹窗', schema: mobileActionSheetSchema },
] as IExample[];
