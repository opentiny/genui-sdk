import type { IRendererConfig } from '@opentiny/genui-sdk-core';
import { reactRendererConfig, whiteList as reactWhiteList } from '@opentiny/genui-sdk-react/render-config';
import antdBundle from './bundle.json' with { type: 'json' };
import { antdWhiteList } from './white-list';
import { antdExamples } from './example-schema';

export const reactAntdRendererConfig: IRendererConfig = {
  materialsList: [...reactRendererConfig.materialsList, antdBundle],
  whiteList: [...reactWhiteList, ...antdWhiteList],
  examples: [...reactRendererConfig.examples, ...antdExamples],
  wrapperComponent: 'AntCard',
};

export { antdExamples, antdFormExample } from './example-schema';
export { antdWhiteList } from './white-list';
