import type { IExample } from '@opentiny/genui-sdk-core';
import mobileFormSchema from './examples/mobile-form.json' with { type: 'json' };
import mobileTabbarSchema from './examples/mobile-tabbar.json' with { type: 'json' };

export const examples = [
  { id: 'mobile-form', name: '移动端表单', schema: mobileFormSchema },
  { id: 'mobile-tabbar', name: '底部导航页面', schema: mobileTabbarSchema },
] as IExample[];
