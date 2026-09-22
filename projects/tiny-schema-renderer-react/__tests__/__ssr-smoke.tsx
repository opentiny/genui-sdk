import React from 'react';
import { renderToString } from 'react-dom/server';
import { SchemaRenderer } from '../src/RenderMain';

const schema = {
  version: '1.0.0',
  state: { counter: 1 },
  methods: {},
  render: [
    { id: 'text', component: 'text', props: { text: 'hello {{counter}}' } },
  ],
};
const html = renderToString(React.createElement(SchemaRenderer, { schema }));
console.log('SSR OK, contains hello:', html.includes('hello'));
