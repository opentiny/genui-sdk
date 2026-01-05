import bundleJson from './bundle.json' with { type: 'json' };
import builtinJson from './builtin.json' with { type: 'json' };
import chartJson from './chart.json' with { type: 'json' };
import extendJson from './extend.json' with { type: 'json' };
import { examples } from './example-schema';
import { whiteList } from './white-list';

// 定义渲染器配置的类型
export interface IRendererConfig {
  materialsList: any[];
  examples: any[];
  whiteList: string[];
}

export const rendererConfig: IRendererConfig = {
  materialsList: [bundleJson, builtinJson, chartJson, extendJson],
  examples,
  whiteList,
};
