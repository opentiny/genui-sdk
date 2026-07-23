# Chat Component - Custom Examples

Custom Examples provide component usage samples to help the LLM learn how to compose more polished and rich UI. Use them together with prompts so the LLM outputs the corresponding schemaJson to apply these examples.

## Example Definition Format

Each Example must include the following fields:

```typescript
interface IGenPromptExample {
  name: string;
  description?: string;
  schema: CardSchema;
}
```

- `name`: Example name
- `description`: Example description to help the LLM understand the purpose
- `schema`: Component schema example demonstrating usage

## Developer Profile Card Example

The following example shows how to use the TinyCard component to create a developer profile card with a vibrant gradient background:

```vue
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat :url="url" model="deepseek-v3.2" :customExamples="customExamples" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customExamples = [
  {
    name: 'Developer Profile Card',
    description: 'Demonstrates how to use TinyCard to create a vibrant user profile card with avatar, name, email, tags, and more',
    schema: {
      componentName: 'TinyCard',
      props: {
        style:
          'background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%); padding: 24px; border-radius: 16px;',
      },
      children: [
        {
          componentName: 'div',
          props: {
            style: 'display: flex; align-items: center; margin-bottom: 20px;',
          },
          children: [
            {
              componentName: 'div',
              props: {
                style:
                  'width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #fff; margin-right: 16px; border: 3px solid rgba(255,255,255,0.5);',
              },
              children: 'Z',
            },
            {
              componentName: 'div',
              props: {
                style: 'flex: 1;',
              },
              children: [
                {
                  componentName: 'div',
                  props: {
                    style:
                      'font-size: 24px; font-weight: bold; color: #fff; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);',
                  },
                  children: 'Zhang San',
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 12px;',
                  },
                  children: 'zhangsan@example.com',
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'display: flex; gap: 8px; flex-wrap: wrap;',
                  },
                  children: [
                    {
                      componentName: 'div',
                      props: {
                        style:
                          'background: rgba(255,255,255,0.25); color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);',
                      },
                      children: 'Frontend Developer',
                    },
                    {
                      componentName: 'div',
                      props: {
                        style:
                          'background: rgba(255,255,255,0.25); color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);',
                      },
                      children: 'Vue.js',
                    },
                    {
                      componentName: 'div',
                      props: {
                        style:
                          'background: rgba(255,255,255,0.25); color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);',
                      },
                      children: '5 Years Experience',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          componentName: 'div',
          props: {
            style: 'border-top: 1px solid rgba(255,255,255,0.2); padding-top: 16px; margin-top: 16px;',
          },
          children: [
            {
              componentName: 'div',
              props: {
                style: 'display: flex; justify-content: space-around;',
              },
              children: [
                {
                  componentName: 'div',
                  props: {
                    style: 'text-align: center;',
                  },
                  children: [
                    {
                      componentName: 'div',
                      props: {
                        style: 'font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 4px;',
                      },
                      children: '128',
                    },
                    {
                      componentName: 'div',
                      props: {
                        style: 'font-size: 12px; color: rgba(255,255,255,0.8);',
                      },
                      children: 'Projects',
                    },
                  ],
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'text-align: center;',
                  },
                  children: [
                    {
                      componentName: 'div',
                      props: {
                        style: 'font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 4px;',
                      },
                      children: '1.2K',
                    },
                    {
                      componentName: 'div',
                      props: {
                        style: 'font-size: 12px; color: rgba(255,255,255,0.8);',
                      },
                      children: 'Followers',
                    },
                  ],
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'text-align: center;',
                  },
                  children: [
                    {
                      componentName: 'div',
                      props: {
                        style: 'font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 4px;',
                      },
                      children: '856',
                    },
                    {
                      componentName: 'div',
                      props: {
                        style: 'font-size: 12px; color: rgba(255,255,255,0.8);',
                      },
                      children: 'Likes',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
];
</script>
```

## Full Example

<demo vue="../../../../demos/en/chat/custom-examples.vue" />
