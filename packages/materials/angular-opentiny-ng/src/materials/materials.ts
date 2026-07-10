import { autoApplyDirectives, directives } from './directives';
import { components, modules } from './components';
import type { IMaterials } from './materials-types';

export const materials: IMaterials = {
  components,
  modules,
  directives,
  autoApplyDirectives,
};
