import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PageContextValue } from './engine';
import type { PageContextApi } from './use-context';

const PageContext = createContext<PageContextApi | null>(null);

export interface PageContextProviderProps {
  value: PageContextApi;
  children: ReactNode;
}

export function PageContextProvider({ value, children }: PageContextProviderProps) {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePageContext(): PageContextValue {
  const page = useContext(PageContext);
  if (!page) {
    throw new Error('usePageContext must be used within SchemaRenderer');
  }
  const [context, setContext] = useState<PageContextValue>(() => page.getContext());
  useEffect(() => page.subscribe(() => setContext(page.getContext())), [page]);
  return context;
}
