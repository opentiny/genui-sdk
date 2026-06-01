/**
 * 使用 createElement 避免继承 @vue/tsconfig 的 jsxImportSource: vue
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { GenuiRenderer } from '@opentiny/genui-sdk-react';
import { antdRegistry } from '@opentiny/genui-sdk-materials-react-antd/extend-renderer';
import { antdFormExample } from '@opentiny/genui-sdk-materials-react-antd/render-config';
import 'antd/dist/reset.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    createElement(
      'div',
      { style: { padding: 24, fontFamily: 'system-ui, sans-serif' } },
      createElement('h1', { style: { marginBottom: 16 } }, 'GenUI React Renderer Demo'),
      createElement(
        'p',
        { style: { color: '#666', marginBottom: 24 } },
        'Ant Design schema demo — AntForm, AntInput, AntSelect, AntButton.',
      ),
      createElement(GenuiRenderer, {
        content: antdFormExample,
        isJsonComplete: true,
        customComponents: antdRegistry,
      }),
    ),
  );
}
