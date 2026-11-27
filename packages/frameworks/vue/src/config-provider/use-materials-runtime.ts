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

  const isAutoTheme = computed(() => (toValue(options.theme) || 'light') === 'auto');

  watch(
    () =>
      [
        runtimeFactories.value,
        toValue(options.theme) || 'light',
        // locale 不设默认值：未显式传入时原样传 undefined，由运行时决定回退
        //（作用域 Provider 用默认语言包；全局 API 则跳过，不改宿主语言）。
        toValue(options.locale),
        isAutoTheme.value ? toValue(options.systemColorScheme) : null,
      ] as const,
    ([factories, theme, locale]) => {
      const runtimes = resolveRuntimeInstances(factories);
      const results: IMaterialsRuntimeApplyResult[] = [];
      const roots: Component[] = [];

      for (const runtime of runtimes) {
        const result = runtime.apply({ theme, locale });
        if (result.root) {
          roots.push(result.root as Component);
        }
        results.push(result);
      }

      runtimeRoots.value = roots;
      colorScheme.value = resolveColorScheme(results, theme, toValue(options.systemColorScheme));
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
