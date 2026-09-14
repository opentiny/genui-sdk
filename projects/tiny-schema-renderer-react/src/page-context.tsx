import { createContext, type ReactNode } from 'react';
import type { PageContextValue } from './engine';

export const PageContext = createContext<PageContextValue | null>(null);

export interface PageContextProviderProps {
  value: PageContextValue;
  children: ReactNode;
}

export function PageContextProvider({ value, children }: PageContextProviderProps) {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}
