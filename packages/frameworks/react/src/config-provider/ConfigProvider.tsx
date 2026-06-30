import { createContext, useContext, useMemo } from 'react';
import { buildMaterialDefaultValueMap, type IRendererConfig } from '@opentiny/genui-sdk-core';
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
  materials?: GenuiMaterials;
  rendererConfig?: Partial<IRendererConfig>;
  children: React.ReactNode;
}

// TODO: 多个ConfigProvider怎么处理，以谁为准
export function GenuiConfigProvider({ materials, rendererConfig, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);
  const defaultPropsMapValue = useMemo(
    () => buildMaterialDefaultValueMap(rendererConfig ?? {}),
    [rendererConfig],
  );

  return (
    <MaterialsContext.Provider value={materialsValue}>
      <DefaultPropsMapContext.Provider value={defaultPropsMapValue}>{children}</DefaultPropsMapContext.Provider>
    </MaterialsContext.Provider>
  );
}
