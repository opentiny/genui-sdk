import { THEME_PREVIEW_COLOR_PRESETS } from '../theme-preview';
import vueIcon from '../../assets/images/vue.svg';
import angularIcon from '../../assets/images/angular.svg';

export const FRAMEWORK_OPTIONS = [
  { name: 'Vue', icon: vueIcon },
  { name: 'Angular', icon: angularIcon },
]

export const COMPONENT_LIB_OPTIONS = ['TinyVue', 'Element'] as const;

export const MATERIAL_THEME_OPTIONS = [
  { textKey: 'materials.themeLight', value: 'light' },
  { textKey: 'materials.themeDark', value: 'dark' },
  { textKey: 'materials.themeLite', value: 'lite' },
  { textKey: 'materials.themeAuto', value: 'auto' },
] as const;

export const MATERIAL_THEME_COLOR_MAP = {
  light: THEME_PREVIEW_COLOR_PRESETS.light,
  dark: THEME_PREVIEW_COLOR_PRESETS.dark,
  lite: THEME_PREVIEW_COLOR_PRESETS.lite,
};
