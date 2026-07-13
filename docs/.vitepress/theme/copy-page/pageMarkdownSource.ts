import type { PageData } from 'vitepress';

interface DocPageData extends PageData {
  markdownSource?: string;
}

export function getPageMarkdownEncoded(page: PageData): string | undefined {
  return (page as DocPageData).markdownSource;
}

export function decodeMarkdownSource(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function getPageMarkdownSource(page: PageData): string {
  const encoded = getPageMarkdownEncoded(page);
  if (!encoded) {
    return '';
  }

  try {
    return decodeMarkdownSource(encoded);
  } catch {
    return '';
  }
}

export function hasPageMarkdownSource(page: PageData): boolean {
  return Boolean(getPageMarkdownEncoded(page));
}
