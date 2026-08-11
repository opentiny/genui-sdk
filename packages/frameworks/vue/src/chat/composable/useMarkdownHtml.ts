import { onMounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue';

export function useMarkdownHtml(source: MaybeRefOrGetter<string>) {
  const html = ref('');
  const ready = ref(false);

  let markdownIt: { render: (src: string) => string } | null = null;
  let dompurify: { sanitize: (html: string) => string } | null = null;

  const render = () => {
    const text = toValue(source);
    if (!markdownIt || !dompurify || !text) {
      html.value = '';
      return;
    }
    html.value = dompurify.sanitize(markdownIt.render(text));
  };

  onMounted(async () => {
    const [{ default: MarkdownIt }, { default: DOMPurify }] = await Promise.all([
      import('markdown-it'),
      import('dompurify'),
    ]);
    markdownIt = new MarkdownIt({ html: false });
    dompurify = DOMPurify;
    ready.value = true;
    render();
  });

  watch(() => toValue(source), render);

  return { html, ready };
}
