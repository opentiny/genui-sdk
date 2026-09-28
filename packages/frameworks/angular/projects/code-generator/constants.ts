export const UNWRAP_QUOTES = {
  start: '#QUOTES_START#',
  end: '#QUOTES_END#',
};

export const [JS_EXPRESSION, JS_FUNCTION, JS_SLOT] = [
  'JSExpression',
  'JSFunction',
  'JSSlot'
]

// 这里原先还有一份 HTML_TAGS(原生标签全集),用来区分「原生元素」与「物料组件」。
// 判据改成「名字有没有被物料配置声明过」之后(见 angular-code-generator.ts 的
// configDeclaresComponent),它全仓库再无引用,已删。别再按标签名判断组件,
// 理由见 README §2:TiText / TiCheckbox / TiRadio / TiTextArea / TiButton 的宿主标签
// 本身就是原生标签,按标签判会把物料当成原生元素。
