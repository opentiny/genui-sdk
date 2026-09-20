import type {
  IMaterialsRuntime,
  IMaterialsRuntimeApplyResult,
  MaterialsLocaleId,
  MaterialsRuntimeFactory,
  MergedMaterials,
  ThemeColorScheme,
} from '@opentiny/genui-sdk-core';
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  ref,
  shallowReadonly,
  shallowRef,
  toValue,
  watch,
  type Component,
  type MaybeRefOrGetter,
  type PropType,
  type VNode,
} from 'vue';

export interface UseMaterialsRuntimeOptions {
  materials: MaybeRefOrGetter<MergedMaterials | undefined>;
  theme: MaybeRefOrGetter<string | undefined>;
  locale: MaybeRefOrGetter<MaterialsLocaleId | undefined>;
  systemColorScheme: MaybeRefOrGetter<ThemeColorScheme>;
}

export const MaterialsRuntimeRoots = defineComponent({
  name: 'MaterialsRuntimeRoots',
  props: {
    roots: { type: Array as PropType<Component[]>, required: true },
  },
  setup(props, { slots }) {
    return () => {
      const children = slots.default?.() ?? [];
      return props.roots.reduceRight<VNode | VNode[]>((acc, root) => h(root, {}, () => acc), children);
    };
  },
});

function resolveRuntimeFactories(materials: MergedMaterials | undefined): MaterialsRuntimeFactory[] {
  const runtimeFactory = materials?.runtimeFactory;
  if (!runtimeFactory) {
    return [];
  }

  const factories = Array.isArray(runtimeFactory) ? runtimeFactory : [runtimeFactory];
  return [...new Set(factories)];
}

function resolveColorScheme(
  results: IMaterialsRuntimeApplyResult[],
  theme: string,
  systemColorScheme: ThemeColorScheme,
): ThemeColorScheme {
  return (
    results.find((result) => result.theme?.colorScheme)?.theme?.colorScheme ??
    (theme === 'auto' ? systemColorScheme : theme === 'dark' ? 'dark' : 'light')
  );
}

export function useMaterialsRuntime(options: UseMaterialsRuntimeOptions) {
  const runtimeFactories = computed(() => resolveRuntimeFactories(toValue(options.materials)));
  const runtimeInstances = new Map<MaterialsRuntimeFactory, IMaterialsRuntime>();
  const runtimeRoots = shallowRef<Component[]>([]);
  const colorScheme = ref<ThemeColorScheme>('light');

  function resolveRuntimeInstances(factories: MaterialsRuntimeFactory[]): IMaterialsRuntime[] {
    for (const [factory, runtime] of runtimeInstances) {
      if (!factories.includes(factory)) {
        runtime.dispose?.();
        runtimeInstances.delete(factory);
      }
    }

    return factories.map((factory) => {
      let runtime = runtimeInstances.get(factory);
      if (!runtime) {
        runtime = factory();
        runtimeInstances.set(factory, runtime);
      }
      return runtime;
    });
  }

  watch(
    () =>
      [
        runtimeFactories.value,
        toValue(options.theme) || 'light',
        toValue(options.locale) || 'zh_CN',
        toValue(options.systemColorScheme),
      ] as const,
    ([factories, theme, locale, systemColorScheme]) => {
      const runtimes = resolveRuntimeInstances(factories);
      const results: IMaterialsRuntimeApplyResult[] = [];
      const roots: Component[] = [];

      for (const runtime of runtimes) {
        const result = runtime.apply({ theme, locale }, { systemColorScheme });
        if (runtime.root) {
          roots.push(runtime.root as Component);
        }
        results.push(result);
      }

      runtimeRoots.value = roots;
      colorScheme.value = resolveColorScheme(results, theme, systemColorScheme);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    runtimeInstances.forEach((runtime) => runtime.dispose?.());
    runtimeInstances.clear();
  });

  return {
    colorScheme: shallowReadonly(colorScheme),
    runtimeRoots: shallowReadonly(runtimeRoots),
  };
}
