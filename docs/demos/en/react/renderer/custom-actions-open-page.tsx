import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;

const content = {
  componentName: 'Page',
  children: [
    {
      componentName: 'AntButton',
      props: {
        type: 'primary',
        onClick: {
          type: 'JSFunction',
          value:
            "function() { this.callAction('openPage', { url: 'https://opentiny.design/', target: '_blank' }); }",
        },
      },
      children: [
        {
          componentName: 'Text',
          props: {
            text: 'Open a new page',
          },
        },
      ],
    },
  ],
};

const customActions = {
  openPage: {
    name: 'openPage',
    description: 'Open a new page',
    execute: (params: { url: string; target?: string }) => {
      const { url, target = '_self' } = params;
      window.open(url, target);
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to open',
        },
        target: {
          type: 'string',
          description: 'Target window: _self (same tab) or _blank (new tab)',
        },
      },
      required: ['url', 'target'],
    },
  },
};

export default function Demo() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer
        content={content}
        generating={generating}
        customActions={customActions}
        isJsonComplete
      />
    </GenuiConfigProvider>
  );
}
