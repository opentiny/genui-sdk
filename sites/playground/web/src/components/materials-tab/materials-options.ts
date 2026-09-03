import { THEME_PREVIEW_COLOR_PRESETS } from '../theme-preview';
import { ref, readonly, type Ref } from 'vue';
import { PlaygroundMode } from '../../constants';

export const FRAMEWORK_OPTIONS = [
  { name: 'Vue', textKey: 'materials.frameworkVue' },
  { name: 'Angular', textKey: 'materials.frameworkAngular' },
  { name: 'React', textKey: 'materials.frameworkReact' },
];

export function getFrameworkOptions(mode: PlaygroundMode) {
  if (mode === PlaygroundMode.Builder) {
    return FRAMEWORK_OPTIONS.filter((item) => item.name !== 'Angular');
  }
  return [...FRAMEWORK_OPTIONS];
}

export const componentLibOptionsByFramework = {
  Vue: ['TinyVue', 'ElementPlus'],
  Angular: ['TinyNg'],
  React: ['Antd'],
};

export const MATERIAL_THEME_OPTIONS = [
  { textKey: 'materials.themeLight', value: 'light' },
  { textKey: 'materials.themeDark', value: 'dark' },
  { textKey: 'materials.themeLite', value: 'lite' },
  { textKey: 'materials.themeAuto', value: 'auto' },
];

export const MATERIAL_THEME_COLOR_MAP = {
  light: THEME_PREVIEW_COLOR_PRESETS.light,
  dark: THEME_PREVIEW_COLOR_PRESETS.dark,
  lite: THEME_PREVIEW_COLOR_PRESETS.lite,
};

export const defaultComponentLib = {
  Vue: 'TinyVue',
  Angular: 'TinyNg',
  React: 'Antd',
};

export interface MaterialsCache {
  framework?: unknown;
  componentLib?: unknown;
}

const VALID_FRAMEWORKS = ['Vue', 'Angular', 'React'];

function validateMaterialsCache(cache: MaterialsCache): { framework: string; componentLib: string } {
  const framework =
    typeof cache.framework === 'string' && VALID_FRAMEWORKS.includes(cache.framework)
      ? cache.framework
      : 'Vue';

  const allowedLibs = componentLibOptionsByFramework[framework] ?? [];
  const componentLib =
    typeof cache.componentLib === 'string' && allowedLibs.includes(cache.componentLib)
      ? cache.componentLib
      : defaultComponentLib[framework];

  return { framework, componentLib };
}

export function useMaterialsConfig(initialCache: MaterialsCache = {}) {
  const validated = validateMaterialsCache(initialCache);

  const _framework = ref<string>(validated.framework);
  const _componentLib = ref<string>(validated.componentLib);

  function setFramework(name: string): void {
    if (!VALID_FRAMEWORKS.includes(name)) {
      return;
    }
    _framework.value = name;
    _componentLib.value = defaultComponentLib[name];
  }

  function setComponentLib(name: string): void {
    const allowed = componentLibOptionsByFramework[_framework.value] ?? [];
    if (allowed.includes(name)) {
      _componentLib.value = name;
    }
  }

  return {
    framework: readonly(_framework) as Readonly<Ref<string>>,
    componentLib: readonly(_componentLib) as Readonly<Ref<string>>,
    setFramework,
    setComponentLib,
  };
}
