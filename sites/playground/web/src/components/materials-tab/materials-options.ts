import { THEME_PREVIEW_COLOR_PRESETS } from '../theme-preview';
import vueIcon from '../../assets/images/vue.svg';
import angularIcon from '../../assets/images/angular.svg';
import themeLight from '../../assets/images/theme-light.png';
import themeDark from '../../assets/images/theme-dark.png';
import themeLite from '../../assets/images/theme-lite.png';
import themeAuto from '../../assets/images/theme-auto.png';

export const FRAMEWORK_OPTIONS = [
  { name: 'Vue', icon: vueIcon, label: 'Vue框架' },
  { name: 'Angular', icon: angularIcon, label: 'Angular框架' },
]

export const COMPONENT_LIB_OPTIONS_BY_FRAMEWORK = {
  Vue: ['TinyVue', 'Element'],
  Angular: ['TinyNg'],
} as const;

export const MATERIAL_THEME_OPTIONS = [
  { textKey: 'materials.themeLight', value: 'light', preview: themeLight },
  { textKey: 'materials.themeDark', value: 'dark', preview: themeDark },
  { textKey: 'materials.themeLite', value: 'lite', preview: themeLite },
  { textKey: 'materials.themeAuto', value: 'auto', preview: themeAuto },
] as const;

export const DEFAULT_COMPONENT_LIB = {
  Vue: 'TinyVue',
  Angular: 'TinyNg',
} as const;

export const MATERIAL_THEME_COLOR_MAP = {
  light: THEME_PREVIEW_COLOR_PRESETS.light,
  dark: THEME_PREVIEW_COLOR_PRESETS.dark,
  lite: THEME_PREVIEW_COLOR_PRESETS.lite,
};
