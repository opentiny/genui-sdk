import TinyUser from './TinyUser.vue';
import type { IGenPromptComponent } from '@opentiny/genui-sdk-core';

type IGenPromptComponent2 = IGenPromptComponent;

export const customComponents: Record<string, any> = {
  TinyUser,
};

export const customComponentsSchema: IGenPromptComponent2[] = [
  {
    name: '选择用户组件',
    description: '选择用户组件，用于选择用户，支持模糊搜索',
    component: 'TinyUser',
    schema: {
      properties: [
        {
          property: 'name',
          description: '搜索用户名称，支持模糊搜索',
          type: 'string',
          required: true,
        },
      ],
    },
  },
];

export const customExamples = {
  name: '选择用户示例',
  schema: {
    componentName: 'Page',
    children: [
      {
        componentName: 'h3',
        props: {},
        children: '输入用户名搜索工号并选择用户',
      },
      {
        componentName: 'TinyUser',
        props: {
          name: '张三',
        },
      },
    ],
  },
};
