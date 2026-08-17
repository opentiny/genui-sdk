/*
 * Public API Surface of renderer
 */

export * from './renderer-main';
export * from './renderer-materials';
export * from './parser/material-getter';
export { RENDERER_SETTINGS } from './renderer-settings';
export type { IRendererSettings } from './renderer-settings';
export {
  provideContentChildren,
  provideContentChildrenEnv,
  CONTENT_CHILDREN_TRACK_DIRECTIVES,
  ContentChildrenService,
  ContentChildrenTrackDirective,
  CONTENT_CHILDREN_OUTLET,
  getComponentOutletLabel,
} from './content-children';
export type { OutletSnapshot, TreeNode } from './content-children';
