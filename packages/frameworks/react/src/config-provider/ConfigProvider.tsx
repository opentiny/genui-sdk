import { createContext, useContext, useMemo } from 'react';
import type { GenuiMaterials } from '../injection-tokens';

const defaultMaterials: GenuiMaterials = {};

const MaterialsContext = createContext<GenuiMaterials>(defaultMaterials);

export function useGenuiMaterials(): GenuiMaterials {
  return useContext(MaterialsContext);
}

export interface GenuiConfigProviderProps {
  materials?: GenuiMaterials;
  children: React.ReactNode;
}

// TODO: 多个ConfigProvider怎么处理，以谁为准
export function GenuiConfigProvider({ materials, children }: GenuiConfigProviderProps) {
  const value = useMemo(() => materials ?? defaultMaterials, [materials]);

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}
