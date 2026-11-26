import { createContext, type ReactNode } from 'react';
import type { PageContextValue } from './engine';

export const PageContext = createContext<PageContextValue | null>(null);

/** 渲染器实例 id，嵌套的区块渲染器复用父级，保证同名区块共享 css scope */
export const RENDERER_INSTANCE_ID = Symbol('RENDERER_INSTANCE_ID');

export interface PageContextProviderProps {
  value: PageContextValue;
  children: ReactNode;
}

export function PageContextProvider({ value, children }: PageContextProviderProps) {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}
