import { THEME_PREVIEW_COLOR_PRESETS } from '../theme-preview';
import { PlaygroundMode } from '../../constants';

export const FRAMEWORK_OPTIONS = [
  { name: 'Vue', icon: 'V' },
  { name: 'Angular', icon: 'A' },
  { name: 'React', icon: 'R', alpha: true },
] as const;

export function getFrameworkOptions(mode: PlaygroundMode) {
  if (mode === PlaygroundMode.Builder) {
    return FRAMEWORK_OPTIONS.filter((item) => item.name !== 'Angular');
  }
  return [...FRAMEWORK_OPTIONS];
}

export const COMPONENT_LIB_OPTIONS = ['TinyVue', 'ElementUI'] as const;

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
