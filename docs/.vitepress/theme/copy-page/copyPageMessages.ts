export const copyPageMessages = {
  'zh-CN': {
    copy: '复制页面',
    copied: '已复制',
  },
  'en-US': {
    copy: 'Copy page',
    copied: 'Copied',
  },
} as const;

export type CopyPageLocale = keyof typeof copyPageMessages;

export function getCopyPageMessages(lang: string) {
  if (lang in copyPageMessages) {
    return copyPageMessages[lang as CopyPageLocale];
  }

  return copyPageMessages['zh-CN'];
}
