import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  getSystemColorScheme,
  type IMaterials,
  type IMaterialsRuntime,
  type MaterialsRuntimeFactory,
  type MergedMaterials,
  type ThemeColorScheme,
} from '@opentiny/genui-sdk-core';
import type { NotifyHandler } from './notify.types';

const defaultMaterials: IMaterials = {};

const MaterialsContext = createContext<IMaterials>(defaultMaterials);
const NotifyContext = createContext<NotifyHandler | undefined>(undefined);

type RuntimeRoot = ComponentType<{ children?: ReactNode }>;

export function useGenuiMaterials(): IMaterials {
  return useContext(MaterialsContext);
}

export function useGenuiNotify(): NotifyHandler | undefined {
  return useContext(NotifyContext);
}

function resolveRuntimeFactories(materials: IMaterials): MaterialsRuntimeFactory[] {
  const runtimeFactory = (materials as MergedMaterials).runtimeFactory;
  if (!runtimeFactory) {
    return [];
  }
  return [...new Set(Array.isArray(runtimeFactory) ? runtimeFactory : [runtimeFactory])];
}

function useSystemColorScheme(): ThemeColorScheme {
  const [colorScheme, setColorScheme] = useState<ThemeColorScheme>(getSystemColorScheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setColorScheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return colorScheme;
}

export interface GenuiConfigProviderProps {
  theme?: string;
  locale?: string;
  materials?: IMaterials;
  notify?: NotifyHandler;
  children: React.ReactNode;
}

export function GenuiConfigProvider({ theme, locale, materials, notify, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);
  const runtimeFactories = useMemo(() => resolveRuntimeFactories(materialsValue), [materialsValue]);
  const runtimeInstancesRef = useRef<Map<MaterialsRuntimeFactory, IMaterialsRuntime>>(new Map());
  const systemColorScheme = useSystemColorScheme();

  const resolvedTheme = theme || 'light';
  const isAutoTheme = resolvedTheme === 'auto';
  const themeSystemColorScheme = isAutoTheme ? systemColorScheme : null;

  const runtimeRoots = useMemo(() => {
    const instances = runtimeInstancesRef.current;

    for (const [factory, runtime] of instances) {
      if (!runtimeFactories.includes(factory)) {
        runtime.dispose?.();
        instances.delete(factory);
      }
    }

    const roots: RuntimeRoot[] = [];
    const resolvedLocale = locale || 'zh_CN';

    for (const factory of runtimeFactories) {
      let runtime = instances.get(factory);
      if (!runtime) {
        runtime = factory();
        instances.set(factory, runtime);
      }
      const result = runtime.apply({ theme: resolvedTheme, locale: resolvedLocale });
      if (result.root) {
        roots.push(result.root as RuntimeRoot);
      }
    }

    return roots;
  }, [runtimeFactories, theme, locale, themeSystemColorScheme]);

  useEffect(() => {
    const instances = runtimeInstancesRef.current;
    return () => {
      instances.forEach((runtime) => runtime.dispose?.());
      instances.clear();
    };
  }, []);

  let content: ReactNode = children;
  for (let index = runtimeRoots.length - 1; index >= 0; index -= 1) {
    const RuntimeRootComponent = runtimeRoots[index];
    content = <RuntimeRootComponent>{content}</RuntimeRootComponent>;
  }

  return (
    <MaterialsContext.Provider value={materialsValue}>
      <NotifyContext.Provider value={notify}>{content}</NotifyContext.Provider>
    </MaterialsContext.Provider>
  );
}
