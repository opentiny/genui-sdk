import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { PageContextValue } from './engine';
import type { PageContextApi } from './use-context';

const PageContext = createContext<PageContextApi | null>(null);

export interface PageContextProviderProps {
  value: PageContextApi;
  children: ReactNode;
}

/**
 * 向子树注入 pageContext store，对齐 Vue provide('pageContext', context)。
 */
export function PageContextProvider({ value, children }: PageContextProviderProps) {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

/**
 * 订阅并读取当前页面运行时上下文（state / methods / refs 等）。
 */
export function usePageContext(): PageContextValue {
  const page = useContext(PageContext);
  if (!page) {
    throw new Error('usePageContext must be used within SchemaRenderer');
  }
  return useSyncExternalStore(page.subscribe, page.getContext, page.getContext);
}
