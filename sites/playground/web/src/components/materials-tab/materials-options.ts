import { THEME_PREVIEW_COLOR_PRESETS } from '../theme-preview';
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
