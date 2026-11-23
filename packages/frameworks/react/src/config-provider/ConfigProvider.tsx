import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
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

/**
 * 从 materials 中解析去重后的运行时工厂列表。
 */
function resolveRuntimeFactories(materials: IMaterials): MaterialsRuntimeFactory[] {
  const runtimeFactory = (materials as MergedMaterials).runtimeFactory;
  if (!runtimeFactory) {
    return [];
  }
  return [...new Set(Array.isArray(runtimeFactory) ? runtimeFactory : [runtimeFactory])];
}

/**
 * 监听系统深浅色偏好，供 `theme: 'auto'` 使用；不支持 `matchMedia` 的环境固定返回 `light`。
 */
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

// 在布局阶段应用运行时配置，保证首帧绘制前 root 已包裹内容；SSR 环境退化为 useEffect。
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * ConfigProvider 的 React 实现。
 *
 * 运行时的创建、apply、dispose 全部发生在提交后的 effect 中，渲染阶段保持纯净：
 * 并发渲染被打断时不会误销毁提交树仍在使用的运行时；工厂不变时复用已有实例，
 * root 引用保持稳定，主题或语言切换不会导致包裹的子树重挂载。
 */
export function GenuiConfigProvider({ theme, locale, materials, notify, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);
  const runtimeFactories = useMemo(() => resolveRuntimeFactories(materialsValue), [materialsValue]);
  const runtimeInstancesRef = useRef<Map<MaterialsRuntimeFactory, IMaterialsRuntime>>(new Map());
  const runtimeGenerationRef = useRef(0);
  const [runtimeRoots, setRuntimeRoots] = useState<RuntimeRoot[]>([]);
  const systemColorScheme = useSystemColorScheme();

  const resolvedTheme = theme || 'light';
  const resolvedLocale = locale || 'zh_CN';
  const isAutoTheme = resolvedTheme === 'auto';
  const themeSystemColorScheme = isAutoTheme ? systemColorScheme : null;

  useIsomorphicLayoutEffect(() => {
    const instances = runtimeInstancesRef.current;

    // dispose 仅针对本次提交中已移除的工厂；仍在配置中的工厂复用实例并重新 apply。
    for (const [factory, runtime] of instances) {
      if (!runtimeFactories.includes(factory)) {
        runtime.dispose?.();
        instances.delete(factory);
      }
    }

    const roots: RuntimeRoot[] = [];
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

    // 每次应用后都更新 roots，让闭包式 root（如 Ant Design）重新渲染拿到最新配置。
    setRuntimeRoots(roots);
  }, [runtimeFactories, resolvedTheme, resolvedLocale, themeSystemColorScheme]);

  useEffect(() => {
    const instances = runtimeInstancesRef.current;
    runtimeGenerationRef.current += 1;
    const generation = runtimeGenerationRef.current;
    return () => {
      // 延迟到宏任务再回收：React 18 StrictMode 会在清理后同步重放 effect，
      // 重放会递增 generation；真正卸载时不会发生重放，定时器回调据此区分两种场景。
      setTimeout(() => {
        if (runtimeGenerationRef.current === generation) {
          instances.forEach((runtime) => runtime.dispose?.());
          instances.clear();
        }
      }, 0);
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
