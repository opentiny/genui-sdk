import postcss from 'postcss';
import scopedPlugin from './scope-css-plugin';

export function handleScopedCss(id: string, content: string) {
  // TODO: 针对Angular进行优化
  return postcss([scopedPlugin(id)]).process(content, { from: undefined });
}

export function setPageCss(content: string, id: string) {
  if (!content) {
    return;
  }

  let styleSheet = document.querySelector(`#${id}`);

  if (!styleSheet) {
    styleSheet = document.createElement('style');
    styleSheet.setAttribute('id', id);
    document.head.appendChild(styleSheet);
  }

  handleScopedCss(id, content).then((scopedCss) => {
    styleSheet.textContent = scopedCss.css;
  });
}
