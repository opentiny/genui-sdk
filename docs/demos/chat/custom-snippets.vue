<template>
  <GenuiChat :url="url" :customSnippets="customSnippets" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// 自定义片段 - 标签页组合
const customSnippets = [
  {
    componentName: 'TinyTabs',
    props: {
      modelValue: 'tab1',
    },
    children: [
      {
        componentName: 'TinyTabItem',
        props: {
          title: '标签页1',
          name: 'tab1',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: '标签页1的内容',
          },
        ],
      },
      {
        componentName: 'TinyTabItem',
        props: {
          title: '标签页2',
          name: 'tab2',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: '标签页2的内容',
          },
        ],
      },
    ],
  },
];

// 默认消息，用于展示自定义片段
const messages = [
  {
    role: 'user',
    content: '创建一个包含三个标签页的界面，分别显示个人信息、工作经历和项目经验',
  },
  {
    role: 'assistant',
    content: '',
    messages: [
      {
        type: 'schema-card',
        content: JSON.stringify({
          componentName: 'Page',
          children: [
            {
              componentName: 'TinyCard',
              children: [
                {
                  componentName: 'TinyTabs',
                  props: {
                    modelValue: 'personal',
                  },
                  children: [
                    {
                      componentName: 'TinyTabItem',
                      props: {
                        title: '个人信息',
                        name: 'personal',
                      },
                      children: [
                        {
                          componentName: 'div',
                          props: {
                            style: 'padding: 20px;',
                          },
                          children: [
                            {
                              componentName: 'div',
                              props: {
                                style: 'font-size: 18px; font-weight: bold; margin-bottom: 16px;',
                              },
                              children: '个人信息',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 8px;',
                              },
                              children: '姓名：张三',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 8px;',
                              },
                              children: '邮箱：zhangsan@example.com',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 8px;',
                              },
                              children: '电话：13800138000',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      componentName: 'TinyTabItem',
                      props: {
                        title: '工作经历',
                        name: 'work',
                      },
                      children: [
                        {
                          componentName: 'div',
                          props: {
                            style: 'padding: 20px;',
                          },
                          children: [
                            {
                              componentName: 'div',
                              props: {
                                style: 'font-size: 18px; font-weight: bold; margin-bottom: 16px;',
                              },
                              children: '工作经历',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px;',
                              },
                              children: [
                                {
                                  componentName: 'div',
                                  props: {
                                    style: 'font-weight: bold; margin-bottom: 4px;',
                                  },
                                  children: '前端开发工程师 - ABC公司',
                                },
                                {
                                  componentName: 'div',
                                  props: {
                                    style: 'font-size: 14px; color: #666;',
                                  },
                                  children: '2020.01 - 至今',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      componentName: 'TinyTabItem',
                      props: {
                        title: '项目经验',
                        name: 'project',
                      },
                      children: [
                        {
                          componentName: 'div',
                          props: {
                            style: 'padding: 20px;',
                          },
                          children: [
                            {
                              componentName: 'div',
                              props: {
                                style: 'font-size: 18px; font-weight: bold; margin-bottom: 16px;',
                              },
                              children: '项目经验',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px;',
                              },
                              children: [
                                {
                                  componentName: 'div',
                                  props: {
                                    style: 'font-weight: bold; margin-bottom: 4px;',
                                  },
                                  children: '企业管理系统',
                                },
                                {
                                  componentName: 'div',
                                  props: {
                                    style: 'font-size: 14px; color: #666;',
                                  },
                                  children: '负责前端架构设计和核心功能开发',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            }
          ],
        }),
      },
    ],
  },
];
</script>

