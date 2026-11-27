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

/**
 * 解析实际生效的亮暗色系：最后一个给出 colorScheme 的运行时优先（last-wins）。
 * 没有运行时给出描述符时（例如未声明 runtimeFactory 的自定义物料），沿用显式主题语义，
 * 避免 theme="dark" 在浅色系统下被解析成 light。
 */
function resolveColorScheme(
  results: IMaterialsRuntimeApplyResult[],
  theme: string,
  systemColorScheme: ThemeColorScheme,
): ThemeColorScheme {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const colorScheme = results[index].theme?.colorScheme;
    if (colorScheme) {
      return colorScheme;
    }
  }
  return theme === 'auto' ? systemColorScheme : theme === 'dark' ? 'dark' : 'light';
}

// 在布局阶段应用后续的运行时配置变化，保证绘制前 root 已拿到最新配置；SSR 环境退化为 useEffect。
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

interface AppliedRuntimeState {
  colorScheme: ThemeColorScheme;
  runtimeRoots: RuntimeRoot[];
}

/**
 * 同步执行一次运行时：回收已移除的工厂、创建缺失的实例、逐个 apply 并收集 root。
 */
function applyRuntimeFactories(
  instances: Map<MaterialsRuntimeFactory, IMaterialsRuntime>,
  factories: MaterialsRuntimeFactory[],
  theme: string,
  locale: MaterialsLocaleId | undefined,
  systemColorScheme: ThemeColorScheme,
): AppliedRuntimeState {
  for (const [factory, runtime] of instances) {
    if (!factories.includes(factory)) {
      runtime.dispose?.();
      instances.delete(factory);
    }
  }

  const runtimeRoots: RuntimeRoot[] = [];
  const results: IMaterialsRuntimeApplyResult[] = [];
  for (const factory of factories) {
    let runtime = instances.get(factory);
    if (!runtime) {
      runtime = factory();
      instances.set(factory, runtime);
    }
    const result = runtime.apply({ theme, locale });
    results.push(result);
    if (result.root) {
      runtimeRoots.push(result.root as RuntimeRoot);
    }
  }

  return { colorScheme: resolveColorScheme(results, theme, systemColorScheme), runtimeRoots };
}

function isSameApply(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

export function useMaterialsRuntime(options: UseMaterialsRuntimeOptions): UseMaterialsRuntimeResult {
  const runtimeFactories = useMemo(() => resolveRuntimeFactories(options.materials), [options.materials]);
  const runtimeInstancesRef = useRef<Map<MaterialsRuntimeFactory, IMaterialsRuntime>>(new Map());
  const runtimeGenerationRef = useRef(0);

  const resolvedTheme = options.theme || 'light';
  // locale 不设默认值：未显式传入时原样传 undefined，由运行时决定回退
  //（作用域 Provider 用默认语言包；全局 API 则跳过，不改宿主语言）。
  const resolvedLocale = options.locale;
  const isAutoTheme = resolvedTheme === 'auto';
  const themeSystemColorScheme = isAutoTheme ? options.systemColorScheme : null;
  const applyDeps = [runtimeFactories, resolvedTheme, resolvedLocale, themeSystemColorScheme] as const;
  const lastAppliedDepsRef = useRef<readonly unknown[] | null>(null);
  const initialAppliedRef = useRef<AppliedRuntimeState | null>(null);

  // 首帧同步创建并应用运行时，让 children 第一次就挂载在 root 下。
  // 如果等到 layout effect 再包 root，同一位置的元素类型会变化，React 会把整棵子树卸载重建
  // （子组件挂载副作用跑两遍、state 丢失，SSR 首屏也没有 root）。
  // 这与 Vue（setup 内 immediate watch）、Angular（ngOnChanges）的首帧时序一致。
  // 注意：React 18 StrictMode 开发模式下首帧会被双调用，所以工厂与 apply() 必须幂等，
  // 不能依赖「只调用一次」的假设。
  if (initialAppliedRef.current === null) {
    initialAppliedRef.current = applyRuntimeFactories(
      runtimeInstancesRef.current,
      runtimeFactories,
      resolvedTheme,
      resolvedLocale,
      options.systemColorScheme,
    );
    lastAppliedDepsRef.current = applyDeps;
  }

  const [applied, setApplied] = useState<AppliedRuntimeState>(() => initialAppliedRef.current as AppliedRuntimeState);

  useIsomorphicLayoutEffect(() => {
    // 首帧已经在渲染期应用过；仅当依赖变化时（theme / locale / 工厂列表 / auto 下的系统深浅色）才重新应用。
    if (lastAppliedDepsRef.current && isSameApply(lastAppliedDepsRef.current, applyDeps)) {
      return;
    }
    lastAppliedDepsRef.current = applyDeps;

    const next = applyRuntimeFactories(
      runtimeInstancesRef.current,
      runtimeFactories,
      resolvedTheme,
      resolvedLocale,
      options.systemColorScheme,
    );
    // 每次应用后都更新 roots，让闭包式 root（如 Ant Design）重新渲染拿到最新配置。
    setApplied(next);
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

  return { colorScheme: applied.colorScheme, runtimeRoots: applied.runtimeRoots };
}

export function MaterialsRuntimeRoots({ roots, children }: { roots: RuntimeRoot[]; children?: ReactNode }) {
  let content: ReactNode = children;
  for (let index = roots.length - 1; index >= 0; index -= 1) {
    const RuntimeRootComponent = roots[index];
    content = <RuntimeRootComponent>{content}</RuntimeRootComponent>;
  }
  return <>{content}</>;
}
