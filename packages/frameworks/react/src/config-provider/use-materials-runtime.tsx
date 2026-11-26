import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  getSystemColorScheme,
  type IMaterials,
  type IMaterialsRuntime,
  type IMaterialsRuntimeApplyResult,
  type MaterialsLocaleId,
  type MaterialsRuntimeFactory,
  type MergedMaterials,
  type ThemeColorScheme,
} from '@opentiny/genui-sdk-core';

export type RuntimeRoot = ComponentType<{ children?: ReactNode }>;

/**
 * 监听系统深浅色偏好，供 `theme: 'auto'` 使用；不支持 `matchMedia` 的环境固定返回 `light`。
 */
export function useSystemColorScheme(): ThemeColorScheme {
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

/**
 * 从 materials 中解析去重后的运行时工厂列表。
 */
function resolveRuntimeFactories(materials: IMaterials | undefined): MaterialsRuntimeFactory[] {
  const runtimeFactory = (materials as MergedMaterials | undefined)?.runtimeFactory;
  if (!runtimeFactory) {
    return [];
  }
  return [...new Set(Array.isArray(runtimeFactory) ? runtimeFactory : [runtimeFactory])];
}

function resolveColorScheme(
  results: IMaterialsRuntimeApplyResult[],
  systemColorScheme: ThemeColorScheme,
): ThemeColorScheme {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const colorScheme = results[index].theme?.colorScheme;
    if (colorScheme) {
      return colorScheme;
    }
  }
  return systemColorScheme;
}

// 在布局阶段应用运行时配置，保证首帧绘制前 root 已包裹内容；SSR 环境退化为 useEffect。
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface UseMaterialsRuntimeOptions {
  materials?: IMaterials;
  theme?: string;
  locale?: MaterialsLocaleId;
  systemColorScheme: ThemeColorScheme;
}

export interface UseMaterialsRuntimeResult {
  colorScheme: ThemeColorScheme;
  runtimeRoots: RuntimeRoot[];
}

export function useMaterialsRuntime(options: UseMaterialsRuntimeOptions): UseMaterialsRuntimeResult {
  const runtimeFactories = useMemo(() => resolveRuntimeFactories(options.materials), [options.materials]);
  const runtimeInstancesRef = useRef<Map<MaterialsRuntimeFactory, IMaterialsRuntime>>(new Map());
  const runtimeGenerationRef = useRef(0);
  const [runtimeRoots, setRuntimeRoots] = useState<RuntimeRoot[]>([]);
  const [colorScheme, setColorScheme] = useState<ThemeColorScheme>('light');

  const resolvedTheme = options.theme || 'light';
  const resolvedLocale = options.locale || 'zh_CN';
  const isAutoTheme = resolvedTheme === 'auto';
  const themeSystemColorScheme = isAutoTheme ? options.systemColorScheme : null;

  useIsomorphicLayoutEffect(() => {
    const instances = runtimeInstancesRef.current;

    for (const [factory, runtime] of instances) {
      if (!runtimeFactories.includes(factory)) {
        runtime.dispose?.();
        instances.delete(factory);
      }
    }

    const roots: RuntimeRoot[] = [];
    const results: IMaterialsRuntimeApplyResult[] = [];
    for (const factory of runtimeFactories) {
      let runtime = instances.get(factory);
      if (!runtime) {
        runtime = factory();
        instances.set(factory, runtime);
      }
      const result = runtime.apply({ theme: resolvedTheme, locale: resolvedLocale });
      results.push(result);
      if (result.root) {
        roots.push(result.root as RuntimeRoot);
      }
    }

    // 每次应用后都更新 roots，让闭包式 root（如 Ant Design）重新渲染拿到最新配置。
    setRuntimeRoots(roots);
    setColorScheme(resolveColorScheme(results, options.systemColorScheme));
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

  return { colorScheme, runtimeRoots };
}

export function MaterialsRuntimeRoots({ roots, children }: { roots: RuntimeRoot[]; children?: ReactNode }) {
  let content: ReactNode = children;
  for (let index = roots.length - 1; index >= 0; index -= 1) {
    const RuntimeRootComponent = roots[index];
    content = <RuntimeRootComponent>{content}</RuntimeRootComponent>;
  }
  return <>{content}</>;
}
