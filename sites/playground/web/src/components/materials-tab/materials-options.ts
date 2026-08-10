import { THEME_PREVIEW_COLOR_PRESETS } from '../theme-preview';
import { ref, readonly, type Ref } from 'vue';
import vueIcon from '../../assets/images/vue.svg';
import angularIcon from '../../assets/images/angular.svg';
import themeLight from '../../assets/images/theme-light.png';
import themeDark from '../../assets/images/theme-dark.png';
import themeLite from '../../assets/images/theme-lite.png';
import themeAuto from '../../assets/images/theme-auto.png';

export const frameworkOptions = [
  { name: 'Vue', icon: vueIcon, labelKey: 'materials.frameworkVue' },
  { name: 'Angular', icon: angularIcon, labelKey: 'materials.frameworkAngular' },
];

export const componentLibOptionsByFramework = {
  Vue: ['TinyVue', 'Element'],
  Angular: ['TinyNg'],
};

export const materialThemeOptions = [
  { textKey: 'materials.themeLight', value: 'light', preview: themeLight },
  { textKey: 'materials.themeDark', value: 'dark', preview: themeDark },
  { textKey: 'materials.themeLite', value: 'lite', preview: themeLite },
  { textKey: 'materials.themeAuto', value: 'auto', preview: themeAuto },
];

export const defaultComponentLib = {
  Vue: 'TinyVue',
  Angular: 'TinyNg',
};

export const materialThemeColorMap = {
  light: THEME_PREVIEW_COLOR_PRESETS.light,
  dark: THEME_PREVIEW_COLOR_PRESETS.dark,
  lite: THEME_PREVIEW_COLOR_PRESETS.lite,
};
export interface MaterialsCache {
  framework?: unknown;
  componentLib?: unknown;
}

function validateMaterialsCache(cache: MaterialsCache): { framework: string; componentLib: string } {
  const framework = cache.framework === 'Angular' ? 'Angular' : 'Vue';

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
    if (name !== 'Vue' && name !== 'Angular') {
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
