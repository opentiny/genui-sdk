<template>
  <GenuiChat :url="url" :customSnippets="customSnippets" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// Custom snippets - Tabs combination
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
          title: 'Tab 1',
          name: 'tab1',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: 'Content of Tab 1',
          },
        ],
      },
      {
        componentName: 'TinyTabItem',
        props: {
          title: 'Tab 2',
          name: 'tab2',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: 'Content of Tab 2',
          },
        ],
      },
    ],
  },
];

// Default messages to demonstrate custom snippets
const messages = [
  {
    role: 'user',
    content: 'Create an interface with three tabs showing personal info, work experience, and project experience',
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
                        title: 'Personal Info',
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
                              children: 'Personal Information',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 8px;',
                              },
                              children: 'Name: John Doe',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 8px;',
                              },
                              children: 'Email: john@example.com',
                            },
                            {
                              componentName: 'div',
                              props: {
                                style: 'margin-bottom: 8px;',
                              },
                              children: 'Phone: +1-234-567-8900',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      componentName: 'TinyTabItem',
                      props: {
                        title: 'Work Experience',
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
                              children: 'Work Experience',
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
                                  children: 'Frontend Developer - ABC Company',
                                },
                                {
                                  componentName: 'div',
                                  props: {
                                    style: 'font-size: 14px; color: #666;',
                                  },
                                  children: '2020.01 - Present',
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
                        title: 'Projects',
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
                              children: 'Project Experience',
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
                                  children: 'Enterprise Management System',
                                },
                                {
                                  componentName: 'div',
                                  props: {
                                    style: 'font-size: 14px; color: #666;',
                                  },
                                  children: 'Responsible for frontend architecture and core feature development',
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
