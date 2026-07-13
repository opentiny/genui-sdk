import { createContext, useContext, useMemo } from 'react';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import type { GenuiMaterials, MaterialDefaultValueMap } from '../injection-tokens';

const defaultMaterials: GenuiMaterials = {};
const defaultPropsMap: MaterialDefaultValueMap = {};

const MaterialsContext = createContext<GenuiMaterials>(defaultMaterials);
const DefaultPropsMapContext = createContext<MaterialDefaultValueMap>(defaultPropsMap);

export function useGenuiMaterials(): GenuiMaterials {
  return useContext(MaterialsContext);
}

export function useGenuiDefaultPropsMap(): MaterialDefaultValueMap {
  return useContext(DefaultPropsMapContext);
}

export interface GenuiConfigProviderProps {
  materials?: IMaterials;
  children: React.ReactNode;
}

// TODO: 多个ConfigProvider怎么处理，以谁为准
export function GenuiConfigProvider({ materials, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(
    () => (materials?.components ?? defaultMaterials) as GenuiMaterials,
    [materials],
  );
  const defaultPropsMapValue = useMemo(
    () => materials?.defaultPropsMap ?? defaultPropsMap,
    [materials],
  );

  return (
    <MaterialsContext.Provider value={materialsValue}>
      <DefaultPropsMapContext.Provider value={defaultPropsMapValue}>{children}</DefaultPropsMapContext.Provider>
    </MaterialsContext.Provider>
  );
}
