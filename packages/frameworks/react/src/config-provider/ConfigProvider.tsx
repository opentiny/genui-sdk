import { createContext, useContext, useMemo } from 'react';
import type { GenuiMaterials } from '../injection-tokens';

const defaultMaterials: GenuiMaterials = {};

const MaterialsContext = createContext<GenuiMaterials>(defaultMaterials);

/**
 * 读取 ConfigProvider 注入的物料表。
 *
 * @returns 当前作用域内的物料注册表
 */
export function useGenuiMaterials(): GenuiMaterials {
  return useContext(MaterialsContext);
}

export interface GenuiConfigProviderProps {
  /** 运行时物料表 */
  materials?: GenuiMaterials;
  children: React.ReactNode;
}

/**
 * 全局配置 Provider，通过 Context 向下注入物料表。
 */
export function GenuiConfigProvider({ materials, children }: GenuiConfigProviderProps) {
  const value = useMemo(() => materials ?? defaultMaterials, [materials]);

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}
