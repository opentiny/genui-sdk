import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const scopedPlugin = (id: string) => {
  return {
    postcssPlugin: 'genui-schema-scoped',
    Rule(rule: postcss.Rule) {
      processRule(id, rule);
    },
  };
};

const processedRules = new WeakSet();

function processRule(id: string, rule: postcss.Rule) {
  if (processedRules.has(rule)) return;
  processedRules.add(rule);
  rule.selector = selectorParser((selectorRoot) => {
    selectorRoot.each((selector) => {
      rewriteSelector(id, selector);
    });
  }).processSync(rule.selector);
}

function rewriteSelector(id: string, selector: selectorParser.Selector) {
  // 找到最后一个普通节点（元素/类/id/属性等），在其后注入 [id] 作用域属性
  let node: selectorParser.Node | null = null;
  selector.each((n) => {
    if (n.type !== 'pseudo' && n.type !== 'combinator') {
      node = n;
    }
  });

  const attr = selectorParser.attribute({ attribute: id, value: id, raws: {}, quoteMark: '"' });
  if (node) {
    (node as { spaces: { after: string } }).spaces.after = '';
    selector.insertAfter(node, attr);
  } else {
    (selector.first as { spaces: { before: string } }).spaces.before = '';
    selector.insertBefore(selector.first!, attr);
  }
}

scopedPlugin.postcss = true;

export function handleScopedCss(id: string, content: string) {
  return postcss([scopedPlugin(id) as postcss.Plugin]).process(content, { from: undefined });
}
