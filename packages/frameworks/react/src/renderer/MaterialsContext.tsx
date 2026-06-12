import { createContext, useContext, useMemo } from 'react';
import type { ComponentRegistry } from '@opentiny/tiny-schema-renderer-react';

/** Schema 渲染器使用的 Genui 组件物料表，对齐 Vue 的 `GenuiMaterials`。 */
export type GenuiMaterials = ComponentRegistry;

const defaultMaterials: GenuiMaterials = {};

/**
 * 全局物料 Context，对齐 Vue 的 `inject(GENUI_MATERIALS)`。
 * 由 `GenuiConfigProvider` 注入，供 `SchemaCardRenderer` 与基础渲染器合并使用。
 */
export const MaterialsContext = createContext<GenuiMaterials>(defaultMaterials);

/**
 * 读取 Context 中注入的 Genui 物料表。
 *
 * @returns 当前作用域内的物料注册表
 */
export function useGenuiMaterials(): GenuiMaterials {
  return useContext(MaterialsContext);
}

export interface GenuiConfigProviderProps {
  /** 运行时物料表，对齐 Vue `GenuiConfigProvider` 的 `materials` prop */
  materials?: GenuiMaterials;
  children: React.ReactNode;
}

/**
 * 全局配置 Provider，对齐 Vue 的 `GenuiConfigProvider`。
 * 当前提供物料 Context 注入；后续可扩展 theme、locale 等配置。
 */
export function GenuiConfigProvider({ materials, children }: GenuiConfigProviderProps) {
  const value = useMemo(() => materials ?? defaultMaterials, [materials]);

  return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}
